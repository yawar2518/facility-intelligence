import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.hierarchy.models import Device
from apps.monitoring.models import DeviceStatusChange, HealthCheckRun
from apps.ingestion.models import Heartbeat
from apps.monitoring.health_rules import evaluate_device_health

logger = logging.getLogger(__name__)


def _record_status_change(device, new_status, reason, metadata=None):
    """
    Records one status transition and updates the device.
    Called whenever a device changes state.
    """
    now = timezone.now()
    previous_status = device.status

    # Guard: don't write a record if nothing actually changed
    if previous_status == new_status:
        return None

    # Calculate how long the device was in its previous status.
    # We look up the most recent existing change for this device
    # and measure the gap between then and now.
    duration_seconds = None
    last_change = (
        DeviceStatusChange.objects
        .filter(device=device)
        .order_by('-changed_at')
        .first()
    )
    if last_change:
        duration_seconds = (now - last_change.changed_at).total_seconds()

    # Write the transition record
    DeviceStatusChange.objects.create(
        device=device,
        lane=device.lane,
        area=device.lane.area,
        facility=device.lane.area.facility,
        previous_status=previous_status,
        new_status=new_status,
        reason=reason,
        changed_at=now,
        duration_seconds=duration_seconds,
        metadata=metadata or {},
    )

    # Update the device itself
    Device.objects.filter(pk=device.pk).update(
        status=new_status,
        updated_at=now,
    )

    logger.info(f"Status change: {device.code} {previous_status} → {new_status} ({reason})")


@shared_task(
    name='apps.monitoring.tasks.check_heartbeat_timeouts',
    bind=True,
    soft_time_limit=20,  # Kill if takes longer than 20s — next tick is 30s away
)
def check_heartbeat_timeouts(self):
    """
    Runs every 30 seconds via Celery Beat.
    Finds timed-out devices and recoveries, records transitions.
    """
    run = HealthCheckRun.objects.create()
    now = timezone.now()

    try:
        # Load all active devices with hierarchy pre-joined.
        # select_related prevents N+1 queries — without it,
        # accessing device.lane.area.facility inside the loop
        # would fire 3 extra SQL queries per device.
        devices = (
            Device.objects
            .filter(is_active=True)
            .select_related('lane__area__facility')
        )

        run.devices_checked = devices.count()

        for device in devices:
            _process_single_device(device, now)

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        run.errors = str(e)
    finally:
        # Always save the run record, even if something went wrong
        run.completed_at = timezone.now()
        run.save()


def _process_single_device(device, now):
    """Evaluate one device. Called inside the main task loop."""

    timeout_threshold = now - timedelta(seconds=device.heartbeat_timeout_seconds)

    # Case 1: never sent a heartbeat
    if device.last_heartbeat is None:
        return  # Nothing to do

    # Case 2: heartbeat is stale — device has gone silent
    if device.last_heartbeat < timeout_threshold:
        if device.status in (
            Device.DeviceStatus.ONLINE,
            Device.DeviceStatus.DEGRADED,
            Device.DeviceStatus.UNKNOWN,
        ):
            seconds_since = (now - device.last_heartbeat).total_seconds()
            _record_status_change(
                device,
                new_status=Device.DeviceStatus.OFFLINE,
                reason=DeviceStatusChange.ChangeReason.HEARTBEAT_TIMEOUT,
                metadata={
                    'seconds_since_last_heartbeat': round(seconds_since, 1),
                    'timeout_threshold_seconds': device.heartbeat_timeout_seconds,
                },
            )
        return

    # Case 3: heartbeat is fresh — run health rules evaluator
    # Fetch the latest heartbeat record to get metrics and error_codes
    latest_heartbeat = (
        Heartbeat.objects
        .filter(device=device)
        .order_by('-timestamp')
        .first()
    )

    # Build the payload the evaluator expects
    heartbeat_data = {}
    if latest_heartbeat:
        heartbeat_data = {
            'metrics': latest_heartbeat.metrics,
            'error_codes': latest_heartbeat.error_codes,
        }

    # Ask the health rules engine what the status should be
    verdict = evaluate_device_health(device, heartbeat_data)

    # If device was OFFLINE or UNKNOWN, this is a recovery
    # Use the evaluator verdict as the recovery status — a device
    # can come back DEGRADED if it's already reporting errors
    if device.status in (
        Device.DeviceStatus.OFFLINE,
        Device.DeviceStatus.UNKNOWN,
    ):
        recovery_status = (
            Device.DeviceStatus.DEGRADED
            if verdict == 'DEGRADED'
            else Device.DeviceStatus.ONLINE
        )
        _record_status_change(
            device,
            new_status=recovery_status,
            reason=DeviceStatusChange.ChangeReason.HEARTBEAT_RECEIVED,
            metadata={'note': 'Heartbeat resumed after offline period'},
        )
        return

    # Device is already ONLINE or DEGRADED — check if verdict differs
    target_status = (
        Device.DeviceStatus.DEGRADED
        if verdict == 'DEGRADED'
        else Device.DeviceStatus.ONLINE
    )

    if device.status != target_status:
        reason = (
            DeviceStatusChange.ChangeReason.ERROR_CODES_DETECTED
            if target_status == Device.DeviceStatus.DEGRADED
            else DeviceStatusChange.ChangeReason.ERROR_CODES_CLEARED
        )
        _record_status_change(
            device,
            new_status=target_status,
            reason=reason,
            metadata=heartbeat_data,
        )
