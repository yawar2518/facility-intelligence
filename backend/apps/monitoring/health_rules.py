import logging

logger = logging.getLogger(__name__)


def evaluate_barrier_gate(device, heartbeat):
    """
    Barrier gate is DEGRADED if:
    - Any error codes are present (e.g. E_SLOW_CYCLE, E_STUCK)
    - Gate cycle time exceeds 4000ms (taking too long to open/close)
    """
    metrics = heartbeat.get('metrics', {})
    error_codes = heartbeat.get('error_codes', [])

    # Any active fault code = degraded
    if error_codes:
        return 'DEGRADED'

    # Slow cycle = mechanical issue developing
    last_cycle_ms = metrics.get('last_cycle_ms', 0)
    if last_cycle_ms > 4000:
        return 'DEGRADED'

    return 'ONLINE'

def evaluate_lpr_camera(device, heartbeat):
    """
    LPR camera is DEGRADED if:
    - Plate read success drops below 85% (dirty lens, misalignment)
    - FPS drops below 20 (processing overload or hardware issue)
    """
    metrics = heartbeat.get('metrics', {})

    plate_success = metrics.get('plate_read_success_pct', 100)
    if plate_success < 85:
        return 'DEGRADED'

    fps = metrics.get('fps', 30)
    if fps < 20:
        return 'DEGRADED'

    return 'ONLINE'

def evaluate_kiosk(device, heartbeat):
    """
    Kiosk is DEGRADED if transaction success rate drops below 95%.
    Even one failed payment in 20 is a revenue-impacting issue.
    """
    metrics = heartbeat.get('metrics', {})

    tx_success = metrics.get('transaction_success_pct', 100)
    if tx_success < 95:
        return 'DEGRADED'

    return 'ONLINE'


def evaluate_intercom(device, heartbeat):
    """
    Intercom is DEGRADED if call connect success drops below 90%.
    """
    metrics = heartbeat.get('metrics', {})

    call_success = metrics.get('call_connect_success_pct', 100)
    if call_success < 90:
        return 'DEGRADED'

    return 'ONLINE'


def evaluate_default(device, heartbeat):
    """
    Ticket dispensers and sensors — online as long as heartbeating.
    No specific metrics to evaluate beyond heartbeat presence.
    """
    return 'ONLINE'

# Maps device type to its evaluator function.
# If a type isn't listed, evaluate_default is used.
EVALUATORS = {
    'BARRIER_GATE':     evaluate_barrier_gate,
    'LPR_CAMERA':       evaluate_lpr_camera,
    'KIOSK':            evaluate_kiosk,
    'INTERCOM':         evaluate_intercom,
    'TICKET_DISPENSER': evaluate_default,
    'SENSOR':           evaluate_default,
}


def evaluate_device_health(device, heartbeat_metrics):
    """
    Main entry point — takes a device and its latest heartbeat data,
    returns the health verdict: 'ONLINE' or 'DEGRADED'.

    heartbeat_metrics is the dict from Heartbeat.metrics + error_codes
    combined, passed in from the task.
    """
    evaluator = EVALUATORS.get(device.device_type, evaluate_default)
    verdict = evaluator(device, heartbeat_metrics)

    logger.debug(
        f"Health eval: {device.code} ({device.device_type}) → {verdict}"
    )

    return verdict