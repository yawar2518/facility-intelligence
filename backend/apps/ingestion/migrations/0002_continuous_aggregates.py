"""
TimescaleDB Continuous Aggregates.

These are materialized views that auto-refresh on a schedule,
maintaining pre-computed hourly rollups of raw time-series data.

Benefits:
- Dashboard queries hit aggregates (tiny) not raw tables (huge)
- No Celery jobs needed for basic rollups
- TimescaleDB handles refresh automatically
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ingestion', '0001_initial'),
    ]

    operations = [

        # ── Hourly Vehicle Event Counts per Lane ───────────────
        migrations.RunSQL(
            sql="""
                CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_lane_traffic
                WITH (timescaledb.continuous) AS
                SELECT
                    time_bucket('1 hour', timestamp)  AS bucket,
                    lane_id,
                    area_id,
                    facility_id,
                    event_type,
                    COUNT(*)                           AS event_count,
                    COUNT(DISTINCT plate_number)       AS unique_vehicles,
                    AVG(duration_ms)                   AS avg_duration_ms
                FROM ingestion_vehicle_events
                GROUP BY
                    bucket,
                    lane_id,
                    area_id,
                    facility_id,
                    event_type
                WITH NO DATA;
            """,
            reverse_sql="DROP MATERIALIZED VIEW IF EXISTS hourly_lane_traffic;",
        ),

        # ── Hourly Heartbeat Summary per Device ────────────────
        migrations.RunSQL(
            sql="""
                CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_device_heartbeats
                WITH (timescaledb.continuous) AS
                SELECT
                    time_bucket('1 hour', timestamp)  AS bucket,
                    device_id,
                    facility_code,
                    COUNT(*)                           AS heartbeat_count,
                    MAX(timestamp)                     AS last_seen,
                    COUNT(CASE
                        WHEN error_codes != '[]'::jsonb
                        THEN 1
                    END)                               AS error_count
                FROM ingestion_heartbeats
                GROUP BY
                    bucket,
                    device_id,
                    facility_code
                WITH NO DATA;
            """,
            reverse_sql="DROP MATERIALIZED VIEW IF EXISTS hourly_device_heartbeats;",
        ),

        # ── Auto-refresh policies ──────────────────────────────
        # Refresh every hour, covering last 2 hours of data
        migrations.RunSQL(
            sql="""
                SELECT add_continuous_aggregate_policy(
                    'hourly_lane_traffic',
                    start_offset => INTERVAL '3 hours',
                    end_offset   => INTERVAL '1 hour',
                    schedule_interval => INTERVAL '1 hour',
                    if_not_exists => TRUE
                );
            """,
            reverse_sql="""
                SELECT remove_continuous_aggregate_policy(
                    'hourly_lane_traffic',
                    if_not_exists => TRUE
                );
            """,
        ),

        migrations.RunSQL(
            sql="""
                SELECT add_continuous_aggregate_policy(
                    'hourly_device_heartbeats',
                    start_offset => INTERVAL '3 hours',
                    end_offset   => INTERVAL '1 hour',
                    schedule_interval => INTERVAL '1 hour',
                    if_not_exists => TRUE
                );
            """,
            reverse_sql="""
                SELECT remove_continuous_aggregate_policy(
                    'hourly_device_heartbeats',
                    if_not_exists => TRUE
                );
            """,
        ),
    ]