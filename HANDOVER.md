# Argus — Parking Intelligence Platform
## Handover & Setup Guide

**Project:** Facility Intelligence (Argus)  
**Prepared by:** Yawar Abbas  
**Stack:** Django 5 · FastAPI · Celery · TimescaleDB · Redis · MQTT · React 18

---

## Prerequisites

Install these once on your machine before anything else:

- **Docker Desktop for Windows** — https://www.docker.com/products/docker-desktop  
  Enable WSL 2 backend when prompted during installation.
- **Node.js 20+** — https://nodejs.org (for the React frontend)
- **Git** — https://git-scm.com

---

## One-Time Setup

### Step 1 — Clone the repository

```powershell
git clone https://github.com/yawar2518/facility-intelligence.git
cd facility-intelligence
```

### Step 2 — Create the Docker environment file

Create a file named `.env.docker` in the repo root (same folder as `docker-compose.yml`).  
Copy the contents below exactly:

```env
# Django
DJANGO_SECRET_KEY=docker-dev-secret-key-change-in-production
DJANGO_DEBUG=True
DJANGO_SETTINGS_MODULE=config.settings.local
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database
POSTGRES_DB=facility_intelligence
POSTGRES_USER=fi_user
POSTGRES_PASSWORD=fi_password
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://fi_user:fi_password@db:5432/facility_intelligence

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# MQTT
MQTT_BROKER_HOST=mosquitto
MQTT_BROKER_PORT=1883

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=generaltony136@gmail.com
EMAIL_HOST_PASSWORD=ksbp smtc pknv fgeu
DEFAULT_FROM_EMAIL=generaltony136@gmail.com
ALERT_RECIPIENT_EMAIL=1yawarabbas1@gmail.com

# Slack
SLACK_WEBHOOK_URL=

# FastAPI
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8001
```

> **Important:** Save as `.env.docker` with no `.txt` extension. Use VS Code Save As to be safe.

### Step 3 — Start all backend services

```powershell
docker compose up -d
```

This starts 9 services: TimescaleDB, Redis, Mosquitto, pgAdmin, Django, FastAPI, Celery Worker, Celery Beat, and the Device Simulator. First run downloads images and takes 5–10 minutes.

Verify all services are running:

```powershell
docker compose ps
```

All 9 containers should show status `Up`.

### Step 4 — Set up the database

Run migrations to create all tables:

```powershell
docker compose exec django python manage.py migrate
```

### Step 5 — Load historical data

Copy the seed backup into the database container and restore it:

```powershell
docker compose cp infra/postgres/seed_backup.sql db:/tmp/seed_backup.sql
docker compose exec db psql -U fi_user -d facility_intelligence -f /tmp/seed_backup.sql
```

This loads 3 facilities, 32 devices, historical vehicle events, anomalies, alert logs, and all scheduled task configurations.

### Step 6 — Install frontend dependencies

```powershell
cd frontend
npm install
cd ..
```

---

## Starting the Platform (Every Time)

After the one-time setup, these are the only two commands needed on subsequent runs:

**Terminal 1 — Backend (all services):**
```powershell
docker compose up -d
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Login Credentials

| Role | Username | Password | Access |
|---|---|---|---|
| Administrator | `argus_admin` | `testpass123` | All facilities |
| Regional Manager | `regional_manager` | `testpass123` | All facilities |
| Facility Owner | `dg_owner` | `testpass123` | Downtown Garage only |

---

## Trigger Tasks Manually (Skip Waiting for Schedule)

After loading data, run these commands once to populate all dashboards immediately without waiting for Celery Beat's scheduled intervals.

**Bring devices online:**
```powershell
docker compose exec django python manage.py shell -c "from apps.monitoring.tasks import check_heartbeat_timeouts; check_heartbeat_timeouts.delay()"
```

**Generate traffic forecasts (Prophet — takes 2–3 minutes):**
```powershell
docker compose exec django python manage.py shell -c "from apps.ml.tasks import train_and_forecast; train_and_forecast.apply()"
```

**Train anomaly detection model (IsolationForest):**
```powershell
docker compose exec django python manage.py shell -c "from apps.ml.tasks import train_isolation_forest; train_isolation_forest.delay()"
```

**Run anomaly detection:**
```powershell
docker compose exec django python manage.py shell -c "from apps.ml.tasks import detect_traffic_anomalies, detect_isolation_forest_anomalies; detect_traffic_anomalies.delay(); detect_isolation_forest_anomalies.delay()"
```

**Compute maintenance scores:**
```powershell
docker compose exec django python manage.py shell -c "from apps.ml.tasks import compute_maintenance_scores; compute_maintenance_scores.delay()"
```

**Evaluate alert rules:**
```powershell
docker compose exec django python manage.py shell -c "from apps.alerts.tasks import evaluate_alert_rules; evaluate_alert_rules.delay()"
```

> After running these, wait 30–60 seconds and refresh the browser. All dashboards will be populated.

---

## Automatic Schedule (Celery Beat)

Once running, the following tasks execute automatically — no manual intervention needed:

| Task | Frequency | Purpose |
|---|---|---|
| `check-heartbeat-timeouts` | Every 5 minutes | Marks devices online/offline |
| `detect-traffic-anomalies` | Scheduled | Z-score traffic anomaly detection |
| `detect-isolation-forest-anomalies` | Scheduled | Multivariate anomaly detection |
| `train-isolation-forest` | Scheduled | Retrains the IsolationForest model |
| `train-and-forecast` | Scheduled | Prophet 24-hour lane forecasting |
| `compute-maintenance-scores` | Scheduled | Barrier gate predictive maintenance |
| `evaluate-alert-rules` | Every 5 minutes | Fires email/Slack alerts |
| `send-daily-digest` | Daily 8AM UTC | Summary alert digest email |

---

## Test Facilities

| Facility | Code | Devices | Areas |
|---|---|---|---|
| Downtown Garage | DG-01 | 13 | 3 |
| Airport Parking | AP-01 | 10 | 2 |
| Mall Complex | MC-01 | 9 | 2 |

---

## Platform Features

| Section | URL | Description |
|---|---|---|
| Overview | `/` | Fleet health, anomaly feed, live events |
| Status Grid | `/status-grid` | All devices across all facilities |
| Timeline | `/timeline` | Device status history |
| Anomalies | `/anomalies` | Detected anomalies with acknowledgement |
| Alert Logs | `/alerts` | Fired alert history |
| Maintenance | `/maintenance` | Barrier gate health scores |
| SLA Dashboard | `/sla` | Uptime and incident ranking |
| Playback | `/playback` | Historical data replay |
| Public Status | `http://localhost:8000/status/` | Public-facing status page |
| Admin Panel | `http://localhost:8000/admin/` | Django admin |
| API Docs | `http://localhost:8001/docs` | FastAPI Swagger UI |
| pgAdmin | `http://localhost:5050` | Database GUI |

---

## Useful Commands

```powershell
# View logs for a specific service
docker compose logs -f django
docker compose logs -f celery_worker
docker compose logs -f simulator

# Restart a single service (e.g. after a code change)
docker compose restart django

# Stop everything
docker compose down

# Stop everything and wipe all data (fresh start)
docker compose down -v

# Open a Django shell
docker compose exec django python manage.py shell

# Open a database shell
docker compose exec db psql -U fi_user -d facility_intelligence
```

---

## Architecture Overview

```
Browser (React)  →  http://localhost:5173
                        ↓ API calls / WebSocket
Django + Daphne  →  http://localhost:8000
FastAPI          →  http://localhost:8001

Internal services (Docker network):
  TimescaleDB  :5432   Time-series database
  Redis        :6379   Message broker + cache
  Mosquitto    :1883   MQTT broker (device messages)
  Celery Worker        Background task processor
  Celery Beat          Task scheduler
  Simulator            Generates fake device data
```

---

*For questions contact Yawar Abbas.*
