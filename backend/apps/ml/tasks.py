import logging
from datetime import datetime, timezone, timedelta

import numpy as np
import pandas as pd
from celery import shared_task
from django.db import connection
import joblib
import os
from sklearn.ensemble import IsolationForest

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
        if n < 2 or std < 0.5:
            continue

        sigma = (observed - mean) / std

        if abs(sigma) < 1.5:
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

            # Skip if already flagged for this lane in this window
            already_exists = Anomaly.objects.filter(
                lane_id=a['lane_id'],
                window_start=a['window_start'],
                window_end=a['window_end'],
            ).exists()

            if already_exists:
                continue

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


def _build_feature_matrix():
    """
    Build a feature matrix for IsolationForest training.
    Each row = one (lane, hour) pair with three features:
      - event_count       : vehicle events that hour
      - error_rate        : fraction of heartbeats with error codes
      - missing_heartbeats: expected heartbeats minus actual
    """

    # ── Query 1: Vehicle events per lane per hour ──────────────
    # We group by lane and hour to get one count per observation.
    # This is our "how busy was this lane" feature.
    sql = """
        SELECT
            ve.lane_id,
            DATE_TRUNC('hour', ve.timestamp)    AS hour_slot,
            COUNT(ve.record_id)                 AS event_count
        FROM ingestion_vehicle_events ve
        WHERE ve.timestamp >= NOW() - INTERVAL '56 days'
        GROUP BY ve.lane_id, hour_slot
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        event_rows = cursor.fetchall()

    if not event_rows:
        return None, None

    # Load into pandas — easier to merge and compute derived columns
    event_df = pd.DataFrame(
        event_rows,
        columns=['lane_id', 'hour_slot', 'event_count']
    )
    event_df['lane_id']   = event_df['lane_id'].astype(str)
    event_df['hour_slot'] = pd.to_datetime(event_df['hour_slot'], utc=True)

    # ── Query 2: Heartbeat quality per lane per hour ───────────
    # For each lane-hour we need:
    #   - total_beats   : how many heartbeats actually arrived
    #   - error_beats   : how many had non-empty error_codes
    #   - device_count  : how many devices in this lane
    # We join device → lane to group heartbeats by lane, not device.
    hb_sql = """
        SELECT
            l.id                                    AS lane_id,
            DATE_TRUNC('hour', h.timestamp)         AS hour_slot,
            COUNT(h.record_id)                      AS total_beats,
            SUM(CASE WHEN h.error_codes != '[]'::jsonb
                THEN 1 ELSE 0 END)                  AS error_beats,
            COUNT(DISTINCT d.id)                    AS device_count
        FROM ingestion_heartbeats h
        JOIN hierarchy_device d  ON h.device_id = d.id
        JOIN hierarchy_lane   l  ON d.lane_id   = l.id
        WHERE h.timestamp >= NOW() - INTERVAL '56 days'
        GROUP BY l.id, hour_slot
    """
    with connection.cursor() as cursor:
        cursor.execute(hb_sql)
        hb_rows = cursor.fetchall()

    hb_df = pd.DataFrame(
        hb_rows,
        columns=['lane_id', 'hour_slot', 'total_beats', 'error_beats', 'device_count']
    )
    hb_df['lane_id']   = hb_df['lane_id'].astype(str)
    hb_df['hour_slot'] = pd.to_datetime(hb_df['hour_slot'], utc=True)

    # error_rate: fraction of beats with errors (0.0 to 1.0)
    # We replace 0 with 1 in denominator to avoid division by zero
    hb_df['error_rate'] = (
        hb_df['error_beats'] / hb_df['total_beats'].replace(0, 1)
    )

    # missing_heartbeats: expected is 2 per device per hour
    # clip(lower=0) ensures we never get negative values
    hb_df['missing_heartbeats'] = (
        (hb_df['device_count'] * 2) - hb_df['total_beats']
    ).clip(lower=0)

    # ── Merge both dataframes on (lane_id, hour_slot) ─────────
    # left join keeps all event rows even if heartbeat data is missing
    # fillna(0) handles any gaps cleanly
    merged = event_df.merge(
        hb_df[['lane_id', 'hour_slot', 'error_rate', 'missing_heartbeats']],
        on=['lane_id', 'hour_slot'],
        how='left'
    ).fillna(0)

    # ── Final output ───────────────────────────────────────────
    # features: numpy array of shape (n_rows, 3) — what the model trains on
    # metadata: lane_id and hour_slot for each row — for saving anomalies later
    features = merged[['event_count', 'error_rate', 'missing_heartbeats']].values
    metadata = merged[['lane_id', 'hour_slot']].copy()

    logger.info(f"Feature matrix built: {features.shape[0]} rows, {features.shape[1]} features")
    return features, metadata

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'ml_models', 'isolation_forest.pkl'
)

@shared_task(name='ml.train_isolation_forest')
def train_isolation_forest():
    """
    Daily task: trains IsolationForest on historical feature matrix
    and saves the model to disk.

    contamination=0.05 means we expect ~5% of hours to be anomalous.
    n_estimators=100 means 100 random trees — more trees = more stable.
    random_state=42 ensures reproducible results.
    """
    logger.info("Training IsolationForest...")

    features, metadata = _build_feature_matrix()

    if features is None:
        logger.warning("No data available for training")
        return "No data"

    if len(features) < 50:
        logger.warning(f"Insufficient data: {len(features)} rows, need 50+")
        return "Insufficient data"

    model = IsolationForest(
        n_estimators=100,
        contamination=0.02,
        random_state=42,
        n_jobs=-1       # use all CPU cores
    )
    model.fit(features)

    # Save model to disk
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    logger.info(f"IsolationForest trained on {len(features)} rows, saved to {MODEL_PATH}")
    return f"Trained on {len(features)} rows"

@shared_task(name='ml.detect_isolation_forest_anomalies')
def detect_isolation_forest_anomalies():
    """
    Hourly task: loads trained IsolationForest model and scores
    the last completed hour across all lanes.
    Saves any detected anomalies to the Anomaly model.
    """
    from apps.ml.models import Anomaly
    from apps.hierarchy.models import Lane

    logger.info("Running IsolationForest anomaly detection...")

    # Load model — if not trained yet, skip
    if not os.path.exists(MODEL_PATH):
        logger.warning("No trained model found — run train_isolation_forest first")
        return "No model"

    model = joblib.load(MODEL_PATH)

    # Build feature vector for the last completed hour only
    now          = datetime.now(timezone.utc)
    window_end   = now.replace(minute=0, second=0, microsecond=0)
    window_start = window_end - timedelta(hours=1)

    # Get event counts per lane for this hour
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT lane_id, COUNT(*) as event_count
            FROM ingestion_vehicle_events
            WHERE timestamp >= %s AND timestamp < %s
            GROUP BY lane_id
        """, [window_start, window_end])
        event_rows = {str(r[0]): int(r[1]) for r in cursor.fetchall()}

    # Get heartbeat quality per lane for this hour
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                l.id                                        AS lane_id,
                COUNT(h.record_id)                          AS total_beats,
                SUM(CASE WHEN h.error_codes != '[]'::jsonb
                    THEN 1 ELSE 0 END)                      AS error_beats,
                COUNT(DISTINCT d.id)                        AS device_count
            FROM ingestion_heartbeats h
            JOIN hierarchy_device d ON h.device_id = d.id
            JOIN hierarchy_lane   l ON d.lane_id   = l.id
            WHERE h.timestamp >= %s AND h.timestamp < %s
            GROUP BY l.id
        """, [window_start, window_end])
        hb_rows = {
            str(r[0]): {
                'total_beats':  int(r[1]),
                'error_beats':  int(r[2]),
                'device_count': int(r[3]),
            }
            for r in cursor.fetchall()
        }

    if not event_rows:
        logger.info("No events in last hour — skipping IF detection")
        return "No events"

    # Build feature rows for all lanes active this hour
    saved = 0
    for lane_id, event_count in event_rows.items():
        hb = hb_rows.get(lane_id, {
            'total_beats': 0, 'error_beats': 0, 'device_count': 1
        })

        error_rate = hb['error_beats'] / max(hb['total_beats'], 1)
        missing_hb = max(0, (hb['device_count'] * 2) - hb['total_beats'])

        # Feature vector for this lane this hour — shape (1, 3)
        feature_vector = np.array([[event_count, error_rate, missing_hb]])

        # Score: -1 = anomaly, 1 = normal
        prediction = model.predict(feature_vector)[0]

        # Anomaly score: more negative = more anomalous
        score = model.score_samples(feature_vector)[0]

        if prediction != -1:
            continue  # Normal — skip

        # Determine severity from anomaly score
        # score_samples returns negative values — more negative = worse
        if score < -0.6:
            severity = 'CRITICAL'
        elif score < -0.5:
            severity = 'HIGH'
        elif score < -0.4:
            severity = 'MEDIUM'
        else:
            severity = 'LOW'

        explanation = (
            f"Unusual activity pattern detected in this lane. "
            f"{event_count} events processed with "
            f"{error_rate*100:.1f}% device error rate"
            f"{f' and {missing_hb} missing heartbeats' if missing_hb > 0 else ''}. "
            f"IsolationForest anomaly score: {score:.3f} "
            f"(threshold: -0.5)"
        )

        try:
            lane     = Lane.objects.get(id=lane_id)
            facility = lane.area.facility

            # Skip if already flagged for this lane in this window
            already_exists = Anomaly.objects.filter(
                lane_id=lane_id,
                window_start=window_start,
                window_end=window_end,
            ).exists()

            if already_exists:
                continue

            Anomaly.objects.create(
                facility        = facility,
                lane            = lane,
                anomaly_type    = 'ERROR_RATE',
                severity        = severity,
                observed_value  = float(score),
                baseline_value  = -0.5,  # contamination boundary
                std_dev         = 0.0,
                sigma_score     = abs(score),
                explanation     = explanation,
                window_start    = window_start,
                window_end      = window_end,
            )
            saved += 1
            logger.info(f"IF anomaly saved: lane={lane.name}, score={score:.3f}")

        except Lane.DoesNotExist:
            logger.warning(f"Lane {lane_id} not found")

    logger.info(f"IF detection complete — {saved} anomalies saved")
    return f"{saved} anomalies saved"


@shared_task(name='ml.train_and_forecast')
def train_and_forecast():
    """
    Daily task: trains a Prophet model per lane on historical
    vehicle event counts and stores 24-hour forecasts.
    """
    from apps.ml.models import Forecast
    from apps.hierarchy.models import Lane
    from prophet import Prophet

    logger.info("Starting Prophet forecasting...")

    # Query hourly event counts per lane for the last 56 days
    sql = """
        SELECT
            lane_id,
            DATE_TRUNC('hour', timestamp) AS hour_slot,
            COUNT(*)                      AS event_count
        FROM ingestion_vehicle_events
        WHERE timestamp >= NOW() - INTERVAL '56 days'
        GROUP BY lane_id, hour_slot
        ORDER BY lane_id, hour_slot
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()

    if not rows:
        logger.warning("No event data for forecasting")
        return "No data"

    df = pd.DataFrame(rows, columns=['lane_id', 'hour_slot', 'event_count'])
    df['lane_id']   = df['lane_id'].astype(str)
    df['hour_slot'] = pd.to_datetime(df['hour_slot'], utc=True)

    lanes_processed = 0
    forecasts_saved = 0
    now = datetime.now(timezone.utc)

    # Train one Prophet model per lane
    for lane_id, lane_df in df.groupby('lane_id'):
        try:
            lane = Lane.objects.get(id=lane_id)
        except Lane.DoesNotExist:
            continue

        # Prophet requires columns named 'ds' and 'y'
        # It also requires timezone-naive datetimes
        prophet_df = lane_df.rename(columns={
            'hour_slot':   'ds',
            'event_count': 'y'
        })[['ds', 'y']]
        prophet_df['ds'] = prophet_df['ds'].dt.tz_localize(None)

        # Need at least 48 data points for a meaningful forecast
        if len(prophet_df) < 48:
            logger.warning(f"Insufficient data for lane {lane.name}: {len(prophet_df)} rows")
            continue

        try:
            # Train Prophet
            # daily_seasonality and weekly_seasonality capture
            # rush hour patterns and weekday vs weekend differences
            model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=False,  # not enough data for yearly
                interval_width=0.80,       # 80% confidence interval
            )
            model.fit(prophet_df)

            # Generate future dataframe for next 24 hours
            future = model.make_future_dataframe(
                periods=24,
                freq='h',
                include_history=False  # only future, not historical
            )
            forecast = model.predict(future)

            # Save forecasts — use update_or_create to replace old ones
            for _, row in forecast.iterrows():
                forecast_time = row['ds'].replace(tzinfo=timezone.utc)

                # Only save future forecasts
                if forecast_time <= now:
                    continue

                Forecast.objects.update_or_create(
                    lane=lane,
                    forecast_for=forecast_time,
                    defaults={
                        'facility':      lane.area.facility,
                        'predicted':     max(0, row['yhat']),
                        'predicted_low': max(0, row['yhat_lower']),
                        'predicted_high': max(0, row['yhat_upper']),
                    }
                )
                forecasts_saved += 1

            lanes_processed += 1
            logger.info(f"Forecast done: {lane.name} ({lane.area.facility.code})")

        except Exception as e:
            logger.error(f"Prophet failed for lane {lane.name}: {e}")
            continue

    logger.info(
        f"Forecasting complete — {lanes_processed} lanes, "
        f"{forecasts_saved} forecasts saved"
    )
    return f"{lanes_processed} lanes forecasted"