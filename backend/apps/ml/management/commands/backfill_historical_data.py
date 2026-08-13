"""
Management command to backfill 14 days of historical vehicle events
and heartbeats with realistic timestamps.

Run with:
    python manage.py backfill_historical_data

Safe to run multiple times — clears existing backfilled data first
using a metadata flag to distinguish backfilled vs live records.
"""

import random
import uuid
from datetime import datetime, timezone, timedelta

from django.core.management.base import BaseCommand
from django.db import connection

from apps.hierarchy.models import Device, Lane


# Same traffic curve as simulator — multiplier per hour of day
TRAFFIC_CURVE = {
    0: 0.05,  1: 0.05,  2: 0.05,  3: 0.05,
    4: 0.10,  5: 0.20,  6: 0.50,  7: 1.50,
    8: 3.50,  9: 3.00, 10: 1.50, 11: 1.20,
   12: 2.00, 13: 1.80, 14: 1.20, 15: 1.50,
   16: 2.50, 17: 4.00, 18: 3.50, 19: 2.00,
   20: 1.20, 21: 0.80, 22: 0.40, 23: 0.10,
}

# Base events per hour at 1.0x multiplier for a busy lane
BASE_EVENTS_PER_HOUR = 20

PLATE_PREFIXES = ["LHR", "ISB", "KHI", "PES", "MUL", "FSD"]

EVENT_TYPE_BY_LANE = {
    'ENTRY':      'VEHICLE_ENTRY',
    'EXIT':       'VEHICLE_EXIT',
    'PAY':        'PAYMENT_COMPLETED',
    'ENTRY_EXIT': 'VEHICLE_ENTRY',
}


class Command(BaseCommand):
    help = 'Backfill 14 days of historical vehicle events and heartbeats'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=14,
            help='Number of days to backfill (default: 14)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing backfilled data before inserting'
        )

    def handle(self, *args, **options):
        days = options['days']

        if options['clear']:
            self.stdout.write('Clearing existing backfilled data...')
            with connection.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM ingestion_vehicle_events
                    WHERE metadata->>'backfilled' = 'true'
                """)
                cursor.execute("""
                    DELETE FROM ingestion_heartbeats
                    WHERE metrics->>'backfilled' = 'true'
                """)
            self.stdout.write(self.style.WARNING('Cleared existing backfill.'))

        # Load all active devices with their lane context
        devices = Device.objects.select_related(
            'lane__area__facility'
        ).filter(is_active=True)

        self.stdout.write(f'Backfilling {days} days for {devices.count()} devices...')

        now         = datetime.now(timezone.utc)
        total_events     = 0
        total_heartbeats = 0

        # Go back `days` days, one hour at a time
        for day_offset in range(days, 0, -1):
            for hour in range(24):
                # Build the timestamp for this hour slot
                slot_time = (now - timedelta(days=day_offset)).replace(
                    hour=hour, minute=0, second=0, microsecond=0
                )

                multiplier   = TRAFFIC_CURVE.get(hour, 1.0)
                events_batch = []
                hb_batch     = []

                for device in devices:
                    lane        = device.lane
                    facility    = lane.area.facility
                    lane_type   = lane.lane_type
                    event_type  = EVENT_TYPE_BY_LANE.get(lane_type, 'VEHICLE_ENTRY')

                    # --- Heartbeats: one per 30 min = 2 per hour ---
                    for beat in range(2):
                        beat_time = slot_time + timedelta(minutes=beat * 30)
                        hb_batch.append((
                            str(uuid.uuid4()),       # record_id
                            str(device.id),          # device_id
                            facility.code,           # facility_code
                            beat_time.isoformat(),   # timestamp
                            device.firmware_version, # firmware_version
                            '[]',                    # error_codes
                            '{"backfilled": "true"}' # metrics
                        ))

                    # --- Vehicle events: only traffic-generating devices ---
                    if device.device_type not in (
                        'BARRIER_GATE', 'LPR_CAMERA', 'TICKET_DISPENSER'
                    ):
                        continue

                    # How many events this hour for this lane
                    count = int(BASE_EVENTS_PER_HOUR * multiplier)
                    # Add ±40% jitter so baseline has realistic variance
                    count = max(0, count + random.randint(
                        -int(count * 0.4), int(count * 0.4)
                    ))

                    for _ in range(count):
                        # Spread events randomly within the hour
                        event_time = slot_time + timedelta(
                            seconds=random.randint(0, 3599)
                        )
                        plate = (
                            f"{random.choice(PLATE_PREFIXES)}-"
                            f"{random.randint(1000, 9999)}"
                            if device.device_type == 'LPR_CAMERA'
                            else None
                        )
                        events_batch.append((
                            str(uuid.uuid4()),      # record_id
                            str(device.id),         # device_id
                            str(lane.id),           # lane_id
                            str(lane.area.id),      # area_id
                            str(facility.id),       # facility_id
                            event_type,             # event_type
                            event_time.isoformat(), # timestamp
                            plate,                  # plate_number
                            None,                   # transaction_id
                            random.randint(1200, 4500), # duration_ms
                            '{"backfilled": "true"}'    # metadata
                        ))

                # Bulk insert events for this hour slot
                if events_batch:
                    with connection.cursor() as cursor:
                        cursor.executemany("""
                            INSERT INTO ingestion_vehicle_events
                                (record_id, device_id, lane_id, area_id,
                                 facility_id, event_type, timestamp,
                                 plate_number, transaction_id, duration_ms,
                                 metadata)
                            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                        """, events_batch)
                    total_events += len(events_batch)

                # Bulk insert heartbeats for this hour slot
                if hb_batch:
                    with connection.cursor() as cursor:
                        cursor.executemany("""
                            INSERT INTO ingestion_heartbeats
                                (record_id, device_id, facility_code,
                                 timestamp, firmware_version,
                                 error_codes, metrics)
                            VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb)
                        """, hb_batch)
                    total_heartbeats += len(hb_batch)

            self.stdout.write(f'  Day -{day_offset} complete')

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Backfill complete: '
            f'{total_events} events, {total_heartbeats} heartbeats'
        ))