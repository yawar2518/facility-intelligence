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

    changes = list(changes)

    for i, change in enumerate(changes):
        # duration_seconds = time spent in previous_status, measured from
        # the actual previous change — which for the *first* change in this
        # window may have started well before window_start (e.g. the device
        # was ONLINE for 20 days, then went OFFLINE 2 days into our 7-day
        # window). Only the portion inside the window counts.
        duration = change.duration_seconds or 0.0

        if i == 0:
            portion_in_window = (change.changed_at - window_start).total_seconds()
            duration = min(duration, portion_in_window)
        else:
            # Every later change's previous_status started at the prior
            # change's timestamp, which is already inside the window,
            # so its full duration necessarily fits inside the window.
            duration = min(duration, window_seconds)

        duration = max(duration, 0.0)

        if change.previous_status == 'ONLINE':
            online_seconds += duration
        elif change.previous_status == 'OFFLINE':
            offline_seconds += duration
        elif change.previous_status == 'DEGRADED':
            degraded_seconds += duration

    # Account for the current status duration — from the last change to now,
    # or if the device had no status changes in the window at all, it has
    # been in its current status for the entire window.
    last_change = changes[-1] if changes else None
    if last_change:
        current_duration = (now - last_change.changed_at).total_seconds()
        current_status = last_change.new_status
    else:
        current_duration = window_seconds
        current_status = device.status

    current_duration = min(max(current_duration, 0.0), window_seconds)
    if current_status == 'ONLINE':
        online_seconds += current_duration
    elif current_status == 'OFFLINE':
        offline_seconds += current_duration
    elif current_status == 'DEGRADED':
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