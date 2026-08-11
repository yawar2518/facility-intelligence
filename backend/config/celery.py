import os
from celery import Celery

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
}