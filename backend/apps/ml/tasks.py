import logging
from datetime import datetime, timezone, timedelta

import numpy as np
import pandas as pd
from celery import shared_task
from django.db import connection

logger = logging.getLogger(__name__)


def _compute_baseline():
    """
    Query all historical vehicle events and build a baseline:
    { (lane_id, day_of_week, hour): (mean, std) }

    day_of_week: 0 = Monday, 6 = Sunday (Python convention)
    hour: 0-23
    """
    sql = """
        SELECT
            lane_id,
            EXTRACT(DOW FROM timestamp)::int   AS dow,
            EXTRACT(HOUR FROM timestamp)::int  AS hour,
            COUNT(*)                           AS event_count
        FROM ingestion_vehicle_events
        WHERE timestamp >= NOW() - INTERVAL '56 days'
        GROUP BY lane_id, dow, hour, DATE_TRUNC('hour', timestamp)
    """

    with connection.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()

    if not rows:
        return {}

    # Load into pandas for easy groupby stats
    df = pd.DataFrame(rows, columns=['lane_id', 'dow', 'hour', 'event_count'])

    baseline = {}
    for (lane_id, dow, hour), group in df.groupby(['lane_id', 'dow', 'hour']):
        counts = group['event_count'].values
        baseline[(str(lane_id), int(dow), int(hour))] = {
            'mean': float(np.mean(counts)),
            'std':  float(np.std(counts)),
            'n':    len(counts),  # how many data points we have
        }

    logger.info(f"Baseline computed: {len(baseline)} lane/day/hour slots")
    return baseline

def _detect_zscore_anomalies(baseline):
    """
    Compare the last completed hour's traffic against the baseline.
    Returns a list of anomaly dicts ready to be saved.
    """
    from apps.hierarchy.models import Facility, Lane

    now          = datetime.now(timezone.utc)
    window_end   = now.replace(minute=0, second=0, microsecond=0)
    window_start = window_end - timedelta(hours=1)

    # Python weekday(): 0=Monday, 6=Sunday
    # PostgreSQL DOW:   0=Sunday, 6=Saturday
    # Convert Python → PostgreSQL convention
    py_dow = window_start.weekday()          # 0=Mon
    pg_dow = (py_dow + 1) % 7               # 0=Sun, so Mon becomes 1

    hour = window_start.hour

    # Count actual events per lane in the last completed hour
    sql = """
        SELECT lane_id, COUNT(*) AS event_count
        FROM ingestion_vehicle_events
        WHERE timestamp >= %s AND timestamp < %s
        GROUP BY lane_id
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [window_start, window_end])
        actuals = {str(row[0]): int(row[1]) for row in cursor.fetchall()}

    anomalies = []

    # Check every lane that has a baseline entry for this dow+hour
    relevant_keys = [
        (lane_id, dow, h)
        for (lane_id, dow, h) in baseline
        if dow == pg_dow and h == hour
    ]

    for (lane_id, dow, h) in relevant_keys:
        stats    = baseline[(lane_id, dow, h)]
        mean     = stats['mean']
        std      = stats['std']
        n        = stats['n']
        observed = actuals.get(lane_id, 0)

        # Skip if not enough history or std too small
        if n < 3 or std < 0.5:
            continue

        sigma = (observed - mean) / std

        if abs(sigma) < 2.0:
            continue  # within normal range

        # Determine type and severity
        if sigma > 0:
            anomaly_type = 'TRAFFIC_SPIKE'
        else:
            anomaly_type = 'TRAFFIC_DROP'

        abs_sigma = abs(sigma)
        if abs_sigma >= 4.0:
            severity = 'CRITICAL'
        elif abs_sigma >= 3.0:
            severity = 'HIGH'
        elif abs_sigma >= 2.5:
            severity = 'MEDIUM'
        else:
            severity = 'LOW'

        # Day name for explanation
        day_names = ['Monday','Tuesday','Wednesday',
                     'Thursday','Friday','Saturday','Sunday']
        day_name  = day_names[py_dow]

        explanation = (
            f"{day_name} {hour:02d}:00–{hour+1:02d}:00 volume was "
            f"{abs_sigma:.1f}σ {'above' if sigma > 0 else 'below'} "
            f"the baseline for this lane "
            f"(observed={observed}, expected={mean:.1f}, std={std:.1f})"
        )

        anomalies.append({
            'lane_id':        lane_id,
            'observed_value': observed,
            'baseline_value': mean,
            'std_dev':        std,
            'sigma_score':    sigma,
            'anomaly_type':   anomaly_type,
            'severity':       severity,
            'explanation':    explanation,
            'window_start':   window_start,
            'window_end':     window_end,
        })

    return anomalies


@shared_task(name='ml.detect_traffic_anomalies')
def detect_traffic_anomalies():
    """
    Hourly task: compute z-score baseline and detect traffic anomalies.
    Saves any detected anomalies to the Anomaly model.
    """
    from apps.ml.models import Anomaly
    from apps.hierarchy.models import Lane, Facility

    logger.info("Starting z-score anomaly detection...")

    baseline = _compute_baseline()
    if not baseline:
        logger.warning("No baseline data available — skipping detection")
        return "No baseline data"

    anomalies = _detect_zscore_anomalies(baseline)

    if not anomalies:
        logger.info("No anomalies detected this hour")
        return "No anomalies detected"

    saved = 0
    for a in anomalies:
        try:
            lane     = Lane.objects.get(id=a['lane_id'])
            facility = lane.area.facility

            Anomaly.objects.create(
                facility        = facility,
                lane            = lane,
                anomaly_type    = a['anomaly_type'],
                severity        = a['severity'],
                observed_value  = a['observed_value'],
                baseline_value  = a['baseline_value'],
                std_dev         = a['std_dev'],
                sigma_score     = a['sigma_score'],
                explanation     = a['explanation'],
                window_start    = a['window_start'],
                window_end      = a['window_end'],
            )
            saved += 1
            logger.info(
                f"Anomaly saved: {a['anomaly_type']} on lane "
                f"{lane.name} — {a['sigma_score']:.1f}σ"
            )
        except Lane.DoesNotExist:
            logger.warning(f"Lane {a['lane_id']} not found — skipping")
        except Exception as e:
            logger.error(f"Failed to save anomaly: {e}")

    logger.info(f"Detection complete — {saved} anomalies saved")
    return f"{saved} anomalies saved"