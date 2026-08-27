# Argus — Parking Intelligence Platform

> Real-time parking operations monitoring, anomaly detection & forecasting platform.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.1-green.svg)](https://djangoproject.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![TimescaleDB](https://img.shields.io/badge/TimescaleDB-Hypertables-orange.svg)](https://timescale.com)
[![Tests](https://img.shields.io/badge/Tests-26%20passing-brightgreen.svg)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Live Demo

**[https://argu.live](https://argu.live)**

| Username | Password | Role |
|---|---|---|
| `argus_admin` | `testpass123` | Admin — all facilities |
| `regional_manager` | `testpass123` | Regional Manager |
| `dg_owner` | `testpass123` | Facility Owner — Downtown Garage only |

---

## Overview

Argus is a B2B SaaS parking operations intelligence platform built as a 4-week internship case study at **AgileTech Studio, Lahore**. The name comes from the hundred-eyed giant of Greek mythology — an entity that never sleeps and sees everything.

It ingests real-time IoT data from a **Facility → Area → Lane → Device** hierarchy, detects anomalies in traffic patterns, forecasts occupancy using ML, sends alerts before customers complain, and provides a fully role-based multi-tenant dashboard.

**Developer:** Yawar Abbas — BS Software Engineering, UMT Lahore (2023–2027)  
**PM / Mentor:** Muhammad Arslan — AgileTech Studio

---

## Quick Setup

The entire platform runs with one command via Docker. See **[HANDOVER.md](HANDOVER.md)** for the complete setup guide including data loading and first-run task triggers.

```powershell
git clone https://github.com/yawar2518/facility-intelligence.git
cd facility-intelligence
docker compose up -d
cd frontend && npm run dev
```

---

## System Architecture

```
Physical Devices / Simulator
  → Mosquitto MQTT Broker (port 1883)
  → MQTT Subscriber (paho-mqtt async)
  → FastAPI Ingestion Service (port 8001)
  → PostgreSQL 16 + TimescaleDB Hypertables
  → Celery Workers (anomaly detection, alerts, ML, maintenance)
  → Django Channels WebSocket (live device push)
  → Django REST API (port 8000, JWT auth)
  → React 18 Dashboard (port 5173, or https://argu.live)
  → Public Status Page (/public-status/ — no auth)
```

All 9 services run via a single `docker compose up -d`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Django 5 + Django REST Framework |
| Ingestion Service | FastAPI (async, high-throughput) |
| Database | PostgreSQL 16 + TimescaleDB (hypertables + continuous aggregates) |
| Cache / Broker | Redis 7 (Celery broker, Django Channels layer, page cache) |
| Background Jobs | Celery + Celery Beat |
| ML / Anomaly | scikit-learn (Z-score, IsolationForest), Prophet (forecasting) |
| Real-time Push | Django Channels + Daphne (WebSockets) |
| IoT Protocol | MQTT via Mosquitto 2 + paho-mqtt |
| Frontend | React 18 + Vite + Recharts + Lucide React |
| Alerting | Gmail SMTP + Slack Block Kit webhooks |
| Auth | JWT via djangorestframework-simplejwt |
| Deployment | Docker Compose on Oracle Cloud Always Free ARM VM |
| Web Server | Nginx (reverse proxy + static files) |
| SSL | Let's Encrypt via Certbot |

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
- **IsolationForest** — multivariate detection combining traffic, error rate, and device flapping
- Severity levels: LOW, MEDIUM, HIGH, CRITICAL with dynamic type assignment
- Acknowledge workflow with audit trail

### Forecasting
- **Prophet** per-lane 24-hour traffic forecasting with confidence bands
- Daily retraining via Celery Beat

### Alerts
- Configurable alert rules per facility with severity and anomaly type filters
- Cooldown periods to prevent alert fatigue
- Email delivery via Gmail SMTP
- Slack Block Kit webhook integration
- Daily digest emails
- Full alert delivery log with SENT/FAILED status

### Predictive Maintenance
- Risk scoring for barrier gates using 7-day heartbeat history
- Features: cycle rate, error rate, total cycles
- Risk levels: LOW, MEDIUM, HIGH

### Access Control
- Role-based multi-tenant access: ADMIN, REGIONAL_MANAGER, FACILITY_OWNER
- Facility-scoped data filtering on all endpoints
- JWT authentication

### Operations
- **Facility SLA Dashboard** — uptime leaderboard ranked by 7-day uptime %
- **Historical Playback** — scrub through traffic and events using TimescaleDB `time_bucket()`
- **Public Status Page** — customer-facing page with 60-second Redis cache, no auth required
- **CSV Export** — anomalies, alert logs, and maintenance scores exportable via `?format=csv`

---

## Platform URLs

| Page | Route | Description |
|---|---|---|
| Overview | `/` | Fleet health, anomaly feed, live events |
| Status Grid | `/status` | All devices across all facilities |
| Timeline | `/timeline` | Device status history |
| Anomalies | `/anomalies` | Detected anomalies with acknowledgement |
| Alert Logs | `/alert-logs` | Fired alert history |
| Maintenance | `/maintenance` | Barrier gate health scores |
| SLA Dashboard | `/sla` | Uptime and incident ranking |
| Playback | `/playback` | Historical data replay |
| Public Status | `/public-status/` | Public-facing status page, no login |
| Admin Panel | `/admin/` | Django admin |
| API Docs | `http://localhost:8001/docs` | FastAPI Swagger UI |
| pgAdmin | `http://localhost:5050` | Database GUI |

---

## Test Facilities

| Code | Name | Devices | Areas |
|---|---|---|---|
| DG-01 | Downtown Garage | 13 | 3 |
| AP-01 | Airport Parking | 10 | 2 |
| MC-01 | Mall Complex | 9 | 2 |

---

## Celery Beat Schedule

| Task | Schedule | Purpose |
|---|---|---|
| `check-heartbeat-timeouts` | Every 5 min | Marks devices online/offline |
| `detect-traffic-anomalies` | Hourly | Z-score anomaly detection |
| `detect-isolation-forest` | Hourly | IsolationForest detection |
| `evaluate-alert-rules` | Every 5 min | Alert rule evaluation + dispatch |
| `train-and-forecast` | 2:30 AM UTC | Prophet 24h forecast retraining |
| `compute-maintenance-scores` | 3:00 AM UTC | Barrier gate risk scoring |
| `send-daily-digest` | 8:00 AM UTC | Daily anomaly digest emails |

---

## API Endpoints

```
Auth
  POST   /api/v1/auth/token/
  POST   /api/v1/auth/token/refresh/
  GET    /api/v1/auth/me/

Hierarchy
  GET    /api/v1/hierarchy/facilities/
  GET    /api/v1/hierarchy/facilities/{id}/tree/

Monitoring
  GET    /api/v1/monitoring/facilities/{id}/health/
  GET    /api/v1/monitoring/facilities/{id}/status-changes/
  GET    /api/v1/monitoring/facilities/{id}/playback/
  GET    /api/v1/monitoring/facilities/sla/
  GET    /api/v1/monitoring/devices/{id}/uptime/
  GET    /api/v1/monitoring/maintenance-scores/

ML
  GET    /api/v1/ml/anomalies/         # ?format=csv supported
  GET    /api/v1/ml/forecasts/

Alerts
  GET    /api/v1/alert-logs/           # ?format=csv supported

Public
  GET    /public-status/               # No auth required
```

---

## Testing

```bash
cd backend
python manage.py test apps.tests --verbosity=2
```

26 tests across 5 classes covering uptime calculation, role-based access, alert cooldown logic, public status page, and playback API.

---

## Project Structure

```
facility-intelligence/
├── backend/                    # Django project
│   ├── config/                 # Split settings (base/local/production)
│   ├── apps/
│   │   ├── hierarchy/          # Facility, Area, Lane, Device, UserProfile
│   │   ├── ingestion/          # Heartbeat + VehicleEvent hypertables
│   │   ├── monitoring/         # Health rules, uptime, status changes
│   │   ├── alerts/             # Alert rules, recipients, delivery log
│   │   ├── ml/                 # Anomaly detection, forecasting
│   │   └── core/               # CSVRenderer, permissions helpers
│   └── templates/
│       └── status/             # Public status page template
├── ingestion/                  # FastAPI ingestion service
│   └── app/
│       ├── main.py             # HTTP endpoints
│       ├── schemas.py          # Pydantic validation
│       ├── database.py         # Async PostgreSQL (SQLAlchemy)
│       └── mqtt_subscriber.py  # MQTT listener → PostgreSQL
├── simulator/                  # 32-device async simulator
├── frontend/                   # React 18 dashboard
│   └── src/
│       ├── pages/              # 9 pages
│       ├── components/         # Layout, charts, grids
│       ├── hooks/              # Data fetching + WebSocket
│       └── api/                # Axios client
├── infra/
│   ├── mosquitto/              # MQTT broker config
│   └── postgres/               # TimescaleDB init + seed backup
├── HANDOVER.md                 # Complete setup guide → start here
├── docker-compose.yml          # All 9 services
└── .env.example                # Environment variable template
```

---

## Git Workflow

```
main        — stable, production-ready (deployed at argu.live)
develop     — active development
```

Two remotes:
- `origin` — personal: `yawar2518/facility-intelligence`
- `upstream` — company: `agiletechstudio/parking-ops-intelligence`

All commits follow [Conventional Commits](https://www.conventionalcommits.org/) format.

---

*Built by Yawar Abbas · AgileTech Studio Internship · August 2026*
