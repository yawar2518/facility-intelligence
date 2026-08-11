from datetime import timedelta
from django.utils import timezone
from apps.hierarchy.models import Device
from apps.monitoring.models import DeviceStatusChange


def calculate_uptime(device, days=7):
    """
    Calculate uptime percentage for a device over the last N days.
    
    Returns a dict with:
      - uptime_pct: float (0-100)
      - online_seconds: float
      - offline_seconds: float
      - degraded_seconds: float
      - window_seconds: float
      - period_days: int
    """
    now = timezone.now()
    window_start = now - timedelta(days=days)
    window_seconds = days * 86400  # total seconds in window

    # Get all status changes in the window, oldest first
    changes = (
        DeviceStatusChange.objects
        .filter(device=device, changed_at__gte=window_start)
        .order_by('changed_at')
    )

    online_seconds = 0.0
    offline_seconds = 0.0
    degraded_seconds = 0.0

    for change in changes:
        # duration_seconds = time spent in previous_status
        duration = change.duration_seconds or 0.0

        # Cap duration to the window — a device could have been
        # ONLINE for 2 days before the window started, we only
        # count the portion inside the window
        duration = min(duration, window_seconds)

        if change.previous_status == 'ONLINE':
            online_seconds += duration
        elif change.previous_status == 'OFFLINE':
            offline_seconds += duration
        elif change.previous_status == 'DEGRADED':
            degraded_seconds += duration

    # Account for current status duration (from last change to now)
    last_change = changes.last()
    if last_change:
        current_duration = (now - last_change.changed_at).total_seconds()
        current_duration = min(current_duration, window_seconds)
        if last_change.new_status == 'ONLINE':
            online_seconds += current_duration
        elif last_change.new_status == 'OFFLINE':
            offline_seconds += current_duration
        elif last_change.new_status == 'DEGRADED':
            degraded_seconds += current_duration

    # Calculate percentage
    uptime_pct = round((online_seconds / window_seconds) * 100, 2)

    return {
        'uptime_pct': uptime_pct,
        'online_seconds': round(online_seconds, 1),
        'offline_seconds': round(offline_seconds, 1),
        'degraded_seconds': round(degraded_seconds, 1),
        'window_seconds': window_seconds,
        'period_days': days,
    }