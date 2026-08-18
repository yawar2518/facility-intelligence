from datetime import timedelta

from django.utils import timezone
from django.views import View
from django.shortcuts import render
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

from apps.hierarchy.models import Facility
from apps.ml.models import Anomaly


@method_decorator(cache_page(60), name='dispatch')
class PublicStatusView(View):
    """
    Public-facing status page — no authentication required.
    Shows facility availability and customer-relevant notices.
    Cached for 60 seconds via Django's cache framework.
    """

    def get(self, request):
        now = timezone.now()

        # ── Fetch active customer-relevant anomalies from last 2 hours ──
        # Only TRAFFIC_SPIKE and TRAFFIC_DROP are customer-facing.
        # Device-level faults (ERROR_RATE, DEVICE_FLAPPING) are
        # internal ops concerns and are never shown publicly.
        recent_anomalies = (
            Anomaly.objects
            .filter(
                detected_at__gte=now - timedelta(hours=2),
                is_acknowledged=False,
                anomaly_type__in=['TRAFFIC_SPIKE', 'TRAFFIC_DROP'],
            )
            .select_related('lane__area__facility')
        )

        # Group anomalies by facility id for quick lookup
        anomalies_by_facility = {}
        for anomaly in recent_anomalies:
            fid = str(anomaly.lane.area.facility.id)
            anomalies_by_facility.setdefault(fid, []).append(anomaly)

        # ── Build facility data ─────────────────────────────────
        facilities_data = []
        any_limited     = False
        any_disrupted   = False

        facilities = (
            Facility.objects
            .filter(is_active=True)
            .prefetch_related('areas__lanes__devices')
            .order_by('name')
        )

        for facility in facilities:
            areas_data    = []
            fid           = str(facility.id)
            has_limited   = False
            has_disrupted = False

            for area in facility.areas.filter(is_active=True):
                # Collect all active devices across all lanes in this area
                devices = [
                    d for lane in area.lanes.filter(is_active=True)
                    for d in lane.devices.filter(is_active=True)
                ]
                total  = len(devices)
                online = sum(1 for d in devices if d.status == 'ONLINE')

                # Availability thresholds:
                # >70% online  → Available   (green)
                # 40–70%       → Limited     (amber)
                # <40%         → Unavailable (red)
                if total == 0:
                    availability = 'available'
                else:
                    ratio = online / total
                    if ratio > 0.70:
                        availability = 'available'
                    elif ratio >= 0.40:
                        availability = 'limited'
                    else:
                        availability = 'unavailable'

                if availability == 'limited':
                    has_limited = True
                elif availability == 'unavailable':
                    has_disrupted = True

                areas_data.append({
                    'name':         area.name,
                    'capacity':     area.capacity,
                    'availability': availability,
                })

            # ── Build customer notices — one per area, worst wins ──
            notices_by_area = {}

            for anomaly in anomalies_by_facility.get(fid, []):
                area_name = anomaly.lane.area.name

                if anomaly.anomaly_type == 'TRAFFIC_SPIKE':
                    notice = {
                        'level':   'info',
                        'message': f"High congestion in {area_name} — expect delays.",
                    }
                    # Only add if no worse notice exists for this area yet
                    if area_name not in notices_by_area:
                        notices_by_area[area_name] = notice

                elif anomaly.anomaly_type == 'TRAFFIC_DROP':
                    notice = {
                        'level':   'disruption',
                        'message': f"Reduced availability in {area_name} — some lanes may be unavailable.",
                    }
                    # Always overwrite — disruption beats congestion
                    notices_by_area[area_name] = notice

            notices = list(notices_by_area.values())

            # ── Facility-level status ───────────────────────────
            if has_disrupted:
                facility_status = 'disrupted'
                any_disrupted   = True
            elif has_limited or notices:
                facility_status = 'limited'
                any_limited     = True
            else:
                facility_status = 'operational'

            facilities_data.append({
                'name':           facility.name,
                'address':        facility.address,
                'total_capacity': facility.total_capacity,
                'status':         facility_status,
                'notices':        notices,
                'areas':          areas_data,
            })

        # ── Global banner ───────────────────────────────────────
        if any_disrupted:
            global_status = 'disrupted'
        elif any_limited:
            global_status = 'limited'
        else:
            global_status = 'operational'

        context = {
            'facilities':    facilities_data,
            'global_status': global_status,
            'updated_at':    now.strftime('%H:%M:%S UTC'),
        }

        return render(request, 'status/public_status.html', context)