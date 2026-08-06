"""
Ingestion models — raw time-series data from devices.

No single-column primary key — TimescaleDB requires the
partition column (timestamp) to be part of any unique constraint.
We use (record_id, timestamp) as a composite unique constraint.
Django's auto-created 'id' is disabled via Meta.
"""

import uuid
from django.db import models
from apps.hierarchy.models import Facility, Area, Lane, Device


class Heartbeat(models.Model):
    """
    Raw heartbeat received from a device.
    High-volume table — converted to TimescaleDB hypertable.
    """
    record_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name='heartbeats'
    )
    facility_code = models.CharField(max_length=50, db_index=True)
    timestamp = models.DateTimeField(db_index=True)
    firmware_version = models.CharField(max_length=50, blank=True)
    error_codes = models.JSONField(default=list)
    metrics = models.JSONField(default=dict)

    class Meta:
        db_table = 'ingestion_heartbeats'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', 'timestamp']),
            models.Index(fields=['facility_code', 'timestamp']),
        ]

    def __str__(self):
        return f"Heartbeat {self.device.code} @ {self.timestamp}"


class VehicleEvent(models.Model):
    """
    Raw vehicle event — entry, exit, payment, fault, etc.
    Core traffic data — converted to TimescaleDB hypertable.
    """

    class EventType(models.TextChoices):
        VEHICLE_ENTRY = 'VEHICLE_ENTRY', 'Vehicle Entry'
        VEHICLE_EXIT = 'VEHICLE_EXIT', 'Vehicle Exit'
        PAYMENT_COMPLETED = 'PAYMENT_COMPLETED', 'Payment Completed'
        PAYMENT_FAILED = 'PAYMENT_FAILED', 'Payment Failed'
        BARRIER_OPEN = 'BARRIER_OPEN', 'Barrier Open'
        BARRIER_CLOSE = 'BARRIER_CLOSE', 'Barrier Close'
        FAULT = 'FAULT', 'Device Fault'
        RECOVERY = 'RECOVERY', 'Device Recovery'

    record_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name='vehicle_events'
    )
    lane = models.ForeignKey(
        Lane, on_delete=models.CASCADE, related_name='vehicle_events'
    )
    area = models.ForeignKey(
        Area, on_delete=models.CASCADE, related_name='vehicle_events'
    )
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name='vehicle_events'
    )
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    timestamp = models.DateTimeField(db_index=True)
    plate_number = models.CharField(max_length=20, blank=True, null=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = 'ingestion_vehicle_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', 'timestamp']),
            models.Index(fields=['lane', 'timestamp']),
            models.Index(fields=['facility', 'timestamp']),
            models.Index(fields=['event_type', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.event_type} @ {self.lane} — {self.timestamp}"