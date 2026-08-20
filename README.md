# Argus — Facility Intelligence Platform

> Real-time parking operations monitoring, anomaly detection & forecasting platform.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.1-green.svg)](https://djangoproject.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![TimescaleDB](https://img.shields.io/badge/TimescaleDB-Hypertables-orange.svg)](https://timescale.com)
[![Tests](https://img.shields.io/badge/Tests-26%20passing-brightgreen.svg)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

Argus is a B2B SaaS parking operations intelligence platform built as a 4-week internship case study at **AgileTech Studio, Lahore**. The name comes from the hundred-eyed giant of Greek mythology — an entity that never sleeps and sees everything.

It ingests real-time IoT data from a **Facility → Area → Lane → Device** hierarchy, detects anomalies in traffic patterns, forecasts occupancy using ML, sends alerts before customers complain, and provides a fully role-based multi-tenant dashboard.

**Developer:** Yawar Abbas — BS Software Engineering, UMT Lahore (2023–2027)  
**PM / Mentor:** Muhammad Arslan — AgileTech Studio

---

## System Architecture

```
Physical Devices / Simulator
  → Mosquitto MQTT Broker (port 1883)
  → MQTT Subscriber (paho-mqtt async)
  → FastAPI Ingestion Service (port 8001)
  → PostgreSQL 16 + TimescaleDB Hypertables
  → Continuous Aggregates (hourly rollups)
  → Celery Workers (anomaly detection, alerts, ML, maintenance)
  → Django Channels WebSocket (live device push)
  → Django REST API (port 8000, JWT auth)
  → React 18 Dashboard (port 5173)
  → Public Status Page (/status/ — no auth)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Django 5 + Django REST Framework |
| Ingestion Service | FastAPI (async, high-throughput) |
| Database | PostgreSQL 16 + TimescaleDB (hypertables + continuous aggregates) |
| Cache | Redis 7 (Celery broker, Django Channels layer, page cache) |
| Background Jobs | Celery + Celery Beat |
| ML / Anomaly | scikit-learn (Z-score, IsolationForest), Prophet (forecasting) |
| Real-time Push | Django Channels + Daphne (WebSockets) |
| IoT Protocol | MQTT via Mosquitto 2 + paho-mqtt |
| Frontend | React 18 + Vite + Tailwind CSS + Recharts + Lucide React |
| Alerting | Gmail SMTP + Slack Block Kit webhooks |
| Auth | JWT via djangorestframework-simplejwt |

---

## Features

### Monitoring
- Live device status grid (Facility → Area → Lane → Device hierarchy)
- Per-device health rules by device type (barrier gates, LPR cameras, ticket dispensers, payment kiosks)
- Heartbeat timeout detection with uptime % calculation
- Real-time WebSocket push for instant status change notifications
- Historical status timeline with chronological event feed

### Anomaly Detection
- **Z-score detection** — 56-day baselines grouped by lane, day-of-week, and hour
- **IsolationForest** — multivariate detection combining traffic, error rate, and device flapping (contamination=0.02)
- Severity levels: LOW, MEDIUM, HIGH, CRITICAL
- Acknowledge workflow with audit trail

### Forecasting
- **Prophet** per-lane 24-hour traffic forecasting
- Confidence band (yhat_lower / yhat_upper) visualization
- Daily retraining via Celery Beat at 2:30 AM UTC

### Alerts
- Configurable alert rules per facility with severity filter and anomaly type filter
- Cooldown periods to prevent alert fatigue
- Email delivery via Gmail SMTP
- Slack Block Kit webhook integration
- Daily digest emails for subscribed recipients
- Full alert delivery log with SENT/FAILED status

### Predictive Maintenance
- Risk scoring for barrier gates using 7-day heartbeat history
- Features: cycle rate, error rate, total cycles
- Weighted scoring: 40% cycle rate + 40% error rate + 20% total cycles
- Risk levels: LOW, MEDIUM, HIGH

### Access Control
- Role-based multi-tenant access: ADMIN, REGIONAL_MANAGER, FACILITY_OWNER
- Facility-scoped data filtering on all endpoints
- JWT authentication with `/api/v1/auth/me/` profile endpoint

### Operations
- **Facility SLA Dashboard** — uptime leaderboard ranked by 7-day uptime %, incident count, anomaly count
- **Historical Playback** — scrub through traffic, device status changes, and anomalies for any time window using TimescaleDB `time_bucket()`
- **Public Status Page** — customer-facing `/status/` page with 60-second Redis cache, no authentication required
- **CSV Export** — anomalies, alert logs, and maintenance scores exportable via `?format=csv`

---

## Project Structure

```
facility-intelligence/
├── backend/                          # Django project
│   ├── config/                       # Split settings (base/local/production)
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   └── local.py
│   │   ├── urls.py
│   │   └── asgi.py                   # Django Channels entry point
│   ├── apps/
│   │   ├── hierarchy/                # Facility, Area, Lane, Device, UserProfile models
│   │   ├── ingestion/                # Heartbeat + VehicleEvent TimescaleDB hypertables
│   │   ├── monitoring/               # Health rules, uptime, status changes, maintenance scores
│   │   ├── alerts/                   # Alert rules, recipients, delivery log
│   │   ├── ml/                       # Anomaly detection, forecasting models
│   │   └── core/                     # CSVRenderer, permissions helpers
│   ├── templates/
│   │   └── status/
│   │       └── public_status.html    # Public status page template
│   └── apps/tests.py                 # 26 automated tests
├── ingestion/                        # FastAPI ingestion service
│   └── app/
│       ├── main.py                   # HTTP endpoints (/ingest/heartbeat, /ingest/event)
│       ├── schemas.py                # Pydantic validation schemas
│       ├── database.py               # Async PostgreSQL (SQLAlchemy)
│       └── mqtt_subscriber.py        # MQTT listener → PostgreSQL
├── simulator/                        # Device simulator
│   ├── simulator.py                  # 32-device async simulator with traffic curves
│   └── test_publish.py               # MQTT test publisher
├── frontend/                         # React 18 dashboard
│   └── src/
│       ├── pages/                    # 9 pages: Overview, StatusGrid, Timeline,
│       │                             #   Anomalies, AlertLogs, Maintenance,
│       │                             #   SLADashboard, Playback, Login
│       ├── components/               # Layout, ForecastChart, StatusGrid components
│       ├── hooks/                    # Data fetching hooks with 60s auto-refresh
│       └── api/                      # Axios client + API functions
├── infra/
│   ├── mosquitto/                    # Mosquitto MQTT broker config
│   └── postgres/                     # TimescaleDB init script
├── app/                              # Claude Design HTML exports (UI reference)
└── docker-compose.yml                # PostgreSQL 16+TimescaleDB, Redis, Mosquitto, pgAdmin
```

---

## Quick Start

### Prerequisites

- Python 3.12
- Node.js 18+
- Docker Desktop

### 1. Clone and start infrastructure

```bash
git clone https://github.com/yawar2518/facility-intelligence.git
cd facility-intelligence
docker compose up -d
```

This starts PostgreSQL 16 + TimescaleDB (port 5433), Redis 7, Mosquitto 2, and pgAdmin 4.

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements/local.txt

# Create .env from .env.example
cp .env.example .env

python manage.py migrate
python manage.py seed_data     # Creates facilities, devices, test users
```

### 3. Ingestion service setup

```bash
cd ingestion
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Frontend setup

```bash
cd frontend
npm install
```

---

## Daily Startup (8 Terminals)

| Terminal | Command |
|---|---|
| 1 | `docker compose up -d` |
| 2 | `cd backend && daphne -p 8000 config.asgi:application` |
| 3 | `cd ingestion && uvicorn app.main:app --reload --port 8001` |
| 4 | `cd ingestion && python -m app.mqtt_subscriber` |
| 5 | `cd backend && celery -A config worker -l info -P solo` |
| 6 | `cd backend && celery -A config beat -l info` |
| 7 | `cd backend && python ..\simulator\simulator.py` |
| 8 | `cd frontend && npm run dev` |

---

## Test Users

| Username | Password | Role | Access |
|---|---|---|---|
| `argus_admin` | `testpass123` | ADMIN | All facilities |
| `regional_manager` | `testpass123` | REGIONAL_MANAGER | AP-01, MC-01 |
| `dg_owner` | `testpass123` | FACILITY_OWNER | DG-01 only |

---

## Test Facilities

| Code | Name | Devices | Areas |
|---|---|---|---|
| DG-01 | Downtown Garage | 13 | 3 |
| AP-01 | Airport Parking | 10 | 2 |
| MC-01 | Mall Complex | 9 | 2 |

---

## Celery Beat Schedule

| Task | Schedule | Description |
|---|---|---|
| `check-device-health` | Every 5 min | Heartbeat timeout detection |
| `detect-traffic-anomalies` | `:05` every hour | Z-score anomaly detection |
| `detect-isolation-forest` | `:10` every hour | IsolationForest detection |
| `evaluate-alert-rules` | `:15` every hour | Alert rule evaluation + dispatch |
| `train-and-forecast` | 2:30 AM UTC | Prophet 24h forecast retraining |
| `compute-maintenance-scores` | 3:00 AM UTC | Barrier gate risk scoring |
| `send-daily-digest` | 8:00 AM UTC | Daily anomaly digest emails |

---

## API Endpoints

```
Auth
  POST   /api/v1/auth/token/                         # JWT obtain
  POST   /api/v1/auth/token/refresh/                 # JWT refresh
  GET    /api/v1/auth/me/                            # Current user + role

Hierarchy
  GET    /api/v1/hierarchy/facilities/               # Facility list
  GET    /api/v1/hierarchy/facilities/{id}/tree/     # Full device tree

Monitoring
  GET    /api/v1/monitoring/facilities/{id}/health/  # Health summary
  GET    /api/v1/monitoring/facilities/{id}/status-changes/
  GET    /api/v1/monitoring/facilities/{id}/playback/
  GET    /api/v1/monitoring/facilities/sla/
  GET    /api/v1/monitoring/areas/{id}/health/
  GET    /api/v1/monitoring/devices/{id}/uptime/
  GET    /api/v1/monitoring/maintenance-scores/

ML
  GET    /api/v1/ml/anomalies/                       # ?format=csv supported
  GET    /api/v1/ml/forecasts/

Alerts
  GET    /api/v1/alert-logs/                         # ?format=csv supported

Public
  GET    /status/                                    # No auth required
```

---

## Testing

```bash
cd backend
python manage.py test apps.tests --verbosity=2
```

**26 tests across 5 classes:**
- `UptimeCalculationTest` — uptime calculation accuracy and edge cases
- `FacilityAccessTest` — role-based access for all user types
- `AlertCooldownTest` — cooldown logic, FAILED logs excluded from cooldown
- `PublicStatusPageTest` — availability thresholds and unauthenticated access
- `PlaybackAPITest` — 401/403/404 enforcement and response shape

---

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Overview | `/` | Fleet health, facility cards, anomaly feed, live events |
| Status Grid | `/status-grid` | Facility → Area → Lane → Device drill-down with device detail panel |
| Timeline | `/timeline` | Chronological device status change feed |
| Anomalies | `/anomalies` | ML-detected anomalies with severity filter and acknowledge |
| Alert Logs | `/alert-logs` | Alert delivery history with SENT/FAILED status |
| Maintenance | `/maintenance` | Predictive risk scores for barrier gates |
| SLA Dashboard | `/sla` | Facility uptime leaderboard |
| Playback | `/playback` | Historical traffic + event scrubbing |
| Public Status | `/status/` | Customer-facing, no login required |

---

## Git Workflow

```
main        — stable, production-ready
develop     — integration branch
feature/*   — individual feature branches → develop
```

Two remotes:
- `origin` — personal: `yawar2518/facility-intelligence`
- `upstream` — company: `agiletechstudio/parking-ops-intelligence`

All commits follow [Conventional Commits](https://www.conventionalcommits.org/) format.

---

*Built by Yawar Abbas · AgileTech Studio Internship · August 2026*
EOF
Output

# Argus — Facility Intelligence Platform

> Real-time parking operations monitoring, anomaly detection & forecasting platform.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.1-green.svg)](https://djangoproject.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![TimescaleDB](https://img.shields.io/badge/TimescaleDB-Hypertables-orange.svg)](https://timescale.com)
[![Tests](https://img.shields.io/badge/Tests-26%20passing-brightgreen.svg)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

Argus is a B2B SaaS parking operations intelligence platform built as a 4-week internship case study at **AgileTech Studio, Lahore**. The name comes from the hundred-eyed giant of Greek mythology — an entity that never sleeps and sees everything.

It ingests real-time IoT data from a **Facility → Area → Lane → Device** hierarchy, detects anomalies in traffic patterns, forecasts occupancy using ML, sends alerts before customers complain, and provides a fully role-based multi-tenant dashboard.

**Developer:** Yawar Abbas — BS Software Engineering, UMT Lahore (2023–2027)  
**PM / Mentor:** Muhammad Arslan — AgileTech Studio

---

## System Architecture

```
Physical Devices / Simulator
  → Mosquitto MQTT Broker (port 1883)
  → MQTT Subscriber (paho-mqtt async)
  → FastAPI Ingestion Service (port 8001)
  → PostgreSQL 16 + TimescaleDB Hypertables
  → Continuous Aggregates (hourly rollups)
  → Celery Workers (anomaly detection, alerts, ML, maintenance)
  → Django Channels WebSocket (live device push)
  → Django REST API (port 8000, JWT auth)
  → React 18 Dashboard (port 5173)
  → Public Status Page (/status/ — no auth)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Django 5 + Django REST Framework |
| Ingestion Service | FastAPI (async, high-throughput) |
| Database | PostgreSQL 16 + TimescaleDB (hypertables + continuous aggregates) |
| Cache | Redis 7 (Celery broker, Django Channels layer, page cache) |
| Background Jobs | Celery + Celery Beat |
| ML / Anomaly | scikit-learn (Z-score, IsolationForest), Prophet (forecasting) |
| Real-time Push | Django Channels + Daphne (WebSockets) |
| IoT Protocol | MQTT via Mosquitto 2 + paho-mqtt |
| Frontend | React 18 + Vite + Tailwind CSS + Recharts + Lucide React |
| Alerting | Gmail SMTP + Slack Block Kit webhooks |
| Auth | JWT via djangorestframework-simplejwt |

---

## Features

### Monitoring
- Live device status grid (Facility → Area → Lane → Device hierarchy)
- Per-device health rules by device type (barrier gates, LPR cameras, ticket dispensers, payment kiosks)
- Heartbeat timeout detection with uptime % calculation
- Real-time WebSocket push for instant status change notifications
- Historical status timeline with chronological event feed

### Anomaly Detection
- **Z-score detection** — 56-day baselines grouped by lane, day-of-week, and hour
- **IsolationForest** — multivariate detection combining traffic, error rate, and device flapping (contamination=0.02)
- Severity levels: LOW, MEDIUM, HIGH, CRITICAL
- Acknowledge workflow with audit trail

### Forecasting
- **Prophet** per-lane 24-hour traffic forecasting
- Confidence band (yhat_lower / yhat_upper) visualization
- Daily retraining via Celery Beat at 2:30 AM UTC

### Alerts
- Configurable alert rules per facility with severity filter and anomaly type filter
- Cooldown periods to prevent alert fatigue
- Email delivery via Gmail SMTP
- Slack Block Kit webhook integration
- Daily digest emails for subscribed recipients
- Full alert delivery log with SENT/FAILED status

### Predictive Maintenance
- Risk scoring for barrier gates using 7-day heartbeat history
- Features: cycle rate, error rate, total cycles
- Weighted scoring: 40% cycle rate + 40% error rate + 20% total cycles
- Risk levels: LOW, MEDIUM, HIGH

### Access Control
- Role-based multi-tenant access: ADMIN, REGIONAL_MANAGER, FACILITY_OWNER
- Facility-scoped data filtering on all endpoints
- JWT authentication with `/api/v1/auth/me/` profile endpoint

### Operations
- **Facility SLA Dashboard** — uptime leaderboard ranked by 7-day uptime %, incident count, anomaly count
- **Historical Playback** — scrub through traffic, device status changes, and anomalies for any time window using TimescaleDB `time_bucket()`
- **Public Status Page** — customer-facing `/status/` page with 60-second Redis cache, no authentication required
- **CSV Export** — anomalies, alert logs, and maintenance scores exportable via `?format=csv`

---

## Project Structure

```
facility-intelligence/
├── backend/                          # Django project
│   ├── config/                       # Split settings (base/local/production)
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   └── local.py
│   │   ├── urls.py
│   │   └── asgi.py                   # Django Channels entry point
│   ├── apps/
│   │   ├── hierarchy/                # Facility, Area, Lane, Device, UserProfile models
│   │   ├── ingestion/                # Heartbeat + VehicleEvent TimescaleDB hypertables
│   │   ├── monitoring/               # Health rules, uptime, status changes, maintenance scores
│   │   ├── alerts/                   # Alert rules, recipients, delivery log
│   │   ├── ml/                       # Anomaly detection, forecasting models
│   │   └── core/                     # CSVRenderer, permissions helpers
│   ├── templates/
│   │   └── status/
│   │       └── public_status.html    # Public status page template
│   └── apps/tests.py                 # 26 automated tests
├── ingestion/                        # FastAPI ingestion service
│   └── app/
│       ├── main.py                   # HTTP endpoints (/ingest/heartbeat, /ingest/event)
│       ├── schemas.py                # Pydantic validation schemas
│       ├── database.py               # Async PostgreSQL (SQLAlchemy)
│       └── mqtt_subscriber.py        # MQTT listener → PostgreSQL
├── simulator/                        # Device simulator
│   ├── simulator.py                  # 32-device async simulator with traffic curves
│   └── test_publish.py               # MQTT test publisher
├── frontend/                         # React 18 dashboard
│   └── src/
│       ├── pages/                    # 9 pages: Overview, StatusGrid, Timeline,
│       │                             #   Anomalies, AlertLogs, Maintenance,
│       │                             #   SLADashboard, Playback, Login
│       ├── components/               # Layout, ForecastChart, StatusGrid components
│       ├── hooks/                    # Data fetching hooks with 60s auto-refresh
│       └── api/                      # Axios client + API functions
├── infra/
│   ├── mosquitto/                    # Mosquitto MQTT broker config
│   └── postgres/                     # TimescaleDB init script
├── app/                              # Claude Design HTML exports (UI reference)
└── docker-compose.yml                # PostgreSQL 16+TimescaleDB, Redis, Mosquitto, pgAdmin
```

---

## Quick Start

### Prerequisites

- Python 3.12
- Node.js 18+
- Docker Desktop

### 1. Clone and start infrastructure

```bash
git clone https://github.com/yawar2518/facility-intelligence.git
cd facility-intelligence
docker compose up -d
```

This starts PostgreSQL 16 + TimescaleDB (port 5433), Redis 7, Mosquitto 2, and pgAdmin 4.

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements/local.txt

# Create .env from .env.example
cp .env.example .env

python manage.py migrate
python manage.py seed_data     # Creates facilities, devices, test users
```

### 3. Ingestion service setup

```bash
cd ingestion
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Frontend setup

```bash
cd frontend
npm install
```

---

## Daily Startup (8 Terminals)

| Terminal | Command |
|---|---|
| 1 | `docker compose up -d` |
| 2 | `cd backend && daphne -p 8000 config.asgi:application` |
| 3 | `cd ingestion && uvicorn app.main:app --reload --port 8001` |
| 4 | `cd ingestion && python -m app.mqtt_subscriber` |
| 5 | `cd backend && celery -A config worker -l info -P solo` |
| 6 | `cd backend && celery -A config beat -l info` |
| 7 | `cd backend && python ..\simulator\simulator.py` |
| 8 | `cd frontend && npm run dev` |

---

## Test Users

| Username | Password | Role | Access |
|---|---|---|---|
| `argus_admin` | `testpass123` | ADMIN | All facilities |
| `regional_manager` | `testpass123` | REGIONAL_MANAGER | AP-01, MC-01 |
| `dg_owner` | `testpass123` | FACILITY_OWNER | DG-01 only |

---

## Test Facilities

| Code | Name | Devices | Areas |
|---|---|---|---|
| DG-01 | Downtown Garage | 13 | 3 |
| AP-01 | Airport Parking | 10 | 2 |
| MC-01 | Mall Complex | 9 | 2 |

---

## Celery Beat Schedule

| Task | Schedule | Description |
|---|---|---|
| `check-device-health` | Every 5 min | Heartbeat timeout detection |
| `detect-traffic-anomalies` | `:05` every hour | Z-score anomaly detection |
| `detect-isolation-forest` | `:10` every hour | IsolationForest detection |
| `evaluate-alert-rules` | `:15` every hour | Alert rule evaluation + dispatch |
| `train-and-forecast` | 2:30 AM UTC | Prophet 24h forecast retraining |
| `compute-maintenance-scores` | 3:00 AM UTC | Barrier gate risk scoring |
| `send-daily-digest` | 8:00 AM UTC | Daily anomaly digest emails |

---

## API Endpoints

```
Auth
  POST   /api/v1/auth/token/                         # JWT obtain
  POST   /api/v1/auth/token/refresh/                 # JWT refresh
  GET    /api/v1/auth/me/                            # Current user + role

Hierarchy
  GET    /api/v1/hierarchy/facilities/               # Facility list
  GET    /api/v1/hierarchy/facilities/{id}/tree/     # Full device tree

Monitoring
  GET    /api/v1/monitoring/facilities/{id}/health/  # Health summary
  GET    /api/v1/monitoring/facilities/{id}/status-changes/
  GET    /api/v1/monitoring/facilities/{id}/playback/
  GET    /api/v1/monitoring/facilities/sla/
  GET    /api/v1/monitoring/areas/{id}/health/
  GET    /api/v1/monitoring/devices/{id}/uptime/
  GET    /api/v1/monitoring/maintenance-scores/

ML
  GET    /api/v1/ml/anomalies/                       # ?format=csv supported
  GET    /api/v1/ml/forecasts/

Alerts
  GET    /api/v1/alert-logs/                         # ?format=csv supported

Public
  GET    /status/                                    # No auth required
```

---

## Testing

```bash
cd backend
python manage.py test apps.tests --verbosity=2
```

**26 tests across 5 classes:**
- `UptimeCalculationTest` — uptime calculation accuracy and edge cases
- `FacilityAccessTest` — role-based access for all user types
- `AlertCooldownTest` — cooldown logic, FAILED logs excluded from cooldown
- `PublicStatusPageTest` — availability thresholds and unauthenticated access
- `PlaybackAPITest` — 401/403/404 enforcement and response shape

---

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Overview | `/` | Fleet health, facility cards, anomaly feed, live events |
| Status Grid | `/status-grid` | Facility → Area → Lane → Device drill-down with device detail panel |
| Timeline | `/timeline` | Chronological device status change feed |
| Anomalies | `/anomalies` | ML-detected anomalies with severity filter and acknowledge |
| Alert Logs | `/alert-logs` | Alert delivery history with SENT/FAILED status |
| Maintenance | `/maintenance` | Predictive risk scores for barrier gates |
| SLA Dashboard | `/sla` | Facility uptime leaderboard |
| Playback | `/playback` | Historical traffic + event scrubbing |
| Public Status | `/status/` | Customer-facing, no login required |

---

## Git Workflow

```
main        — stable, production-ready
develop     — integration branch
feature/*   — individual feature branches → develop
```

Two remotes:
- `origin` — personal: `yawar2518/facility-intelligence`
- `upstream` — company: `agiletechstudio/parking-ops-intelligence`

All commits follow [Conventional Commits](https://www.conventionalcommits.org/) format.

---

*Built by Yawar Abbas · AgileTech Studio Internship · August 2026*