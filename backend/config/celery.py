import os
from celery import Celery
from celery.schedules import crontab

# Tell Celery which Django settings to use
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

# Create the Celery app — 'facility_intelligence' is just a name
app = Celery('facility_intelligence')

# Load CELERY_* settings from Django's settings.py
# namespace='CELERY' means it looks for CELERY_BROKER_URL,
# CELERY_RESULT_BACKEND, etc. — which you already have in base.py
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks.py in every installed app
# This is why task files MUST be named tasks.py
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'check-heartbeat-timeouts': {
        'task': 'apps.monitoring.tasks.check_heartbeat_timeouts',
        'schedule': 30.0,  # Every 30 seconds
        'options': {
            'expires': 25,  # Discard if still queued after 25s
        },
    },

    'detect-traffic-anomalies': {
    'task': 'ml.detect_traffic_anomalies',
    'schedule': crontab(minute=5, hour='*'),
    # Runs at 5 minutes past every hour
    # e.g. 14:05, 15:05 — gives the hour time to fully complete
    },

    'train-isolation-forest': {
    'task': 'ml.train_isolation_forest',
    'schedule': crontab(minute=0, hour=2),
    # Runs daily at 2:00 AM UTC
    # Retrains on fresh historical data every night
},

'detect-isolation-forest-anomalies': {
    'task': 'ml.detect_isolation_forest_anomalies',
    'schedule': crontab(minute=10, hour='*'),
    # Runs at 10 minutes past every hour
    # After z-score runs at :05, IF runs at :10
    # Slight offset avoids both tasks hitting DB simultaneously
},

'train-and-forecast': {
    'task': 'ml.train_and_forecast',
    'schedule': crontab(minute=30, hour=2),
    # Runs daily at 2:30 AM UTC
    # After IsolationForest training at 2:00 AM
    # so they don't compete for CPU simultaneously
},

'evaluate-alert-rules': {
    'task': 'evaluate_alert_rules',
    'schedule': crontab(minute=15, hour='*'),
},

'send-daily-digest': {
    'task': 'send_daily_digest',
    'schedule': crontab(hour=8, minute=0),
},

'compute-maintenance-scores': {
    'task': 'compute_maintenance_scores',
    'schedule': crontab(hour=3, minute=0),
},

}

