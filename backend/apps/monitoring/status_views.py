from datetime import timedelta

from django.utils import timezone
from django.views import View
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.db.models import Min

from apps.hierarchy.models import Facility, Device
from apps.ml.models import Anomaly
from apps.monitoring.models import DeviceStatusChange

# Cap on how many days of history the strip can grow to, and the
# minimum it clamps up to even when the fleet is younger than that —
# just enough days for the strip to read as a strip instead of a
# handful of blocks on a fresh install.
MAX_HISTORY_DAYS = 90
MIN_HISTORY_DAYS = 7


def _tier_for_ratio(ratio):
    """Buckets a day's time-weighted uptime ratio into a strip color."""
    if ratio is None:
        return 'none'  # no operational data for this day yet
    if ratio >= 0.99:
        return 'available'
    if ratio >= 0.90:
        return 'limited'
    return 'unavailable'


def _facility_daily_history(devices, days, now, earliest_start):
    """
    Replays each device's DeviceStatusChange history and splits every
    status interval across the UTC day(s) it spans, building a
    day-by-day time-weighted uptime series for the whole facility.

    A device counts as "up" for the portion of a day it spent ONLINE or
    DEGRADED (degraded still serves traffic) — the same convention the
    SLA dashboard uses. Time before a device existed (or before the
    fleet's earliest recorded signal) isn't counted either way, so a
    freshly-added device or a brand new install doesn't drag early days
    down to a fake outage.

    Returns (daily, total_online_seconds, total_window_seconds) where
    `daily` is oldest→newest:
      [{'date': date, 'tier': str, 'uptime_pct': float | None}, ...]
    `uptime_pct` (None for a 'none'-tier day) is what the hover tooltip
    on each strip block shows, so it's a real number and not just a
    color.
    """
    window_start = (now - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    day_starts   = [window_start + timedelta(days=i) for i in range(days)]
    day_online   = [0.0] * days
    day_window   = [0.0] * days

    device_ids = [d.id for d in devices]
    changes = (
        DeviceStatusChange.objects
        .filter(device_id__in=device_ids, changed_at__gte=window_start)
        .order_by('device_id', 'changed_at')
    )
    changes_by_device = {}
    for c in changes:
        changes_by_device.setdefault(c.device_id, []).append(c)

    def add_interval(status, start, end):
        if end <= start:
            return
        i = 0
        cursor = start
        while cursor < end and i < days:
            day_start = day_starts[i]
            day_end   = day_start + timedelta(days=1)
            if cursor >= day_end:
                i += 1
                continue
            seg_start = max(cursor, day_start)
            seg_end   = min(end, day_end)
            seconds   = (seg_end - seg_start).total_seconds()
            if seconds > 0:
                day_window[i] += seconds
                if status in ('ONLINE', 'DEGRADED'):
                    day_online[i] += seconds
            cursor = seg_end
            if cursor >= day_end:
                i += 1

    for device in devices:
        # A device didn't exist before it was created — don't count that
        # span as either up or down time.
        device_start = max(window_start, device.created_at, earliest_start)
        dchanges = changes_by_device.get(device.id, [])

        if dchanges:
            first = dchanges[0]
            add_interval(first.previous_status, device_start, first.changed_at)
            for j in range(len(dchanges) - 1):
                cur, nxt = dchanges[j], dchanges[j + 1]
                add_interval(cur.new_status, cur.changed_at, nxt.changed_at)
            add_interval(dchanges[-1].new_status, dchanges[-1].changed_at, now)
        else:
            # No changes recorded in the window — it's been in its
            # current status the whole time it's existed within it.
            add_interval(device.status, device_start, now)

    daily = []
    for i in range(days):
        ratio = (day_online[i] / day_window[i]) if day_window[i] > 0 else None
        daily.append({
            'date':       day_starts[i].date(),
            'tier':       _tier_for_ratio(ratio),
            'uptime_pct': round(ratio * 100, 1) if ratio is not None else None,
        })

    return daily, sum(day_online), sum(day_window)


def _build_status_context():
    now = timezone.now()

    # How far back the history strip reaches — grows with the fleet's
    # actual recorded history, capped at MAX_HISTORY_DAYS, so a brand
    # new install doesn't render 90 mostly-empty blocks.
    earliest_start = Device.objects.aggregate(m=Min('created_at'))['m'] or now
    days_available = max((now.date() - earliest_start.date()).days, 0) + 1
    history_days   = max(MIN_HISTORY_DAYS, min(MAX_HISTORY_DAYS, days_available))

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

    anomalies_by_facility = {}
    for anomaly in recent_anomalies:
        fid = str(anomaly.lane.area.facility.id)
        anomalies_by_facility.setdefault(fid, []).append(anomaly)

    facilities_data = []
    any_limited      = False
    any_disrupted    = False

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
        all_devices   = []

        for area in facility.areas.filter(is_active=True):
            devices = [
                d for lane in area.lanes.filter(is_active=True)
                for d in lane.devices.filter(is_active=True)
            ]
            all_devices.extend(devices)
            total  = len(devices)
            online = sum(1 for d in devices if d.status == 'ONLINE')

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
                    'level':      'info',
                    'message':    f"High congestion in {area_name} — expect delays.",
                    'since':      anomaly.detected_at.isoformat(),
                }
                if area_name not in notices_by_area:
                    notices_by_area[area_name] = notice
            elif anomaly.anomaly_type == 'TRAFFIC_DROP':
                notice = {
                    'level':      'disruption',
                    'message':    f"Reduced availability in {area_name} — some lanes may be unavailable.",
                    'since':      anomaly.detected_at.isoformat(),
                }
                notices_by_area[area_name] = notice

        notices = list(notices_by_area.values())

        if has_disrupted:
            facility_status = 'disrupted'
            any_disrupted   = True
        elif has_limited or notices:
            facility_status = 'limited'
            any_limited     = True
        else:
            facility_status = 'operational'

        history, online_seconds, window_seconds = _facility_daily_history(
            all_devices, history_days, now, earliest_start,
        )
        period_uptime_pct = round((online_seconds / window_seconds) * 100, 1) if window_seconds > 0 else None

        facilities_data.append({
            'name':               facility.name,
            'address':            facility.address,
            'total_capacity':     facility.total_capacity,
            'status':             facility_status,
            'notices':            notices,
            'areas':              areas_data,
            'history':            history,
            'period_uptime_pct':  period_uptime_pct,
        })

    if any_disrupted:
        global_status = 'disrupted'
    elif any_limited:
        global_status = 'limited'
    else:
        global_status = 'operational'

    return {
        'facilities':    facilities_data,
        'global_status': global_status,
        'updated_at':    now.isoformat(),
        'history_days':  history_days,
    }


@method_decorator(cache_page(60), name='dispatch')
class PublicStatusView(View):
    """
    Public-facing status page — no authentication required.
    Shows facility availability and customer-relevant notices.
    Cached for 60 seconds via Django's cache framework (per full URL,
    so the HTML and `?format=json` variants cache independently).

    GET /public-status/              → the page itself
    GET /public-status/?format=json  → the same data as JSON, polled by
                                        the page's own JS every 30s to
                                        stay live without a full reload.
    """

    def get(self, request):
        context = _build_status_context()

        # JsonResponse defaults to DjangoJSONEncoder, which already knows
        # how to serialize the date/datetime objects in `context`.
        if request.GET.get('format') == 'json':
            return JsonResponse(context)

        return render(request, 'status/public_status.html', {
            'initial_data': context,
        })
