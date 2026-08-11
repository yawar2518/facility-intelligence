# Facility Intelligence Platform

> Parking operations monitoring, anomaly detection & forecasting platform.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.1-green.svg)](https://djangoproject.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com)
[![TimescaleDB](https://img.shields.io/badge/TimescaleDB-Hypertables-orange.svg)](https://timescale.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

A monitoring and intelligence platform that ingests real-time data from a
Facility → Area → Lane → Device hierarchy, detects anomalies, forecasts
occupancy, and alerts the right stakeholders — before customers complain.

## System Architecture

Physical Devices / Simulator
→ Mosquitto MQTT Broker (port 1883)
→ MQTT Subscriber (paho-mqtt async)
→ FastAPI Ingestion Service (HTTP, port 8001)
→ PostgreSQL + TimescaleDB Hypertables
→ Continuous Aggregates (auto hourly rollups)
→ Django REST API (port 8000, JWT auth)
→ React Dashboard (Week 2)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Django 5 + Django REST Framework |
| Ingestion Service | FastAPI (async, high-throughput) |
| Database | PostgreSQL 16 + TimescaleDB (hypertables + continuous aggregates) |
| Background Jobs | Celery + Redis |
| ML / Anomaly | scikit-learn (IsolationForest) |
| Forecasting | Prophet |
| Real-time Push | Django Channels (WebSockets) |
| Frontend | React 18 + Vite + Tailwind + Recharts |
| IoT Protocol | MQTT (Mosquitto broker, paho-mqtt client) |
| Alerting | SendGrid + Slack + Twilio |

## Project Structure

facility-intelligence/
├── backend/ # Django project (API, admin, models, auth)
│ ├── config/ # Split settings (base/local/production)
│ └── apps/ # Django apps
│ ├── hierarchy/ # Facility/Area/Lane/Device models
│ ├── ingestion/ # Heartbeat + VehicleEvent time-series models
│ ├── monitoring/ # Health rules, heartbeat tracking
│ ├── alerts/ # Alert rules, dispatch, delivery log
│ └── ml/ # Anomaly detection, forecasting
├── ingestion/ # FastAPI ingestion service (MQTT + HTTP)
│ └── app/
│ ├── main.py # HTTP endpoints (/ingest/heartbeat, /ingest/event)
│ ├── schemas.py # Pydantic validation schemas
│ ├── database.py # Async PostgreSQL connection (SQLAlchemy)
│ └── mqtt_subscriber.py # MQTT listener → PostgreSQL
├── simulator/ # Device simulator for development & testing
│ ├── simulator.py # 36-device async simulator with traffic curves
│ └── test_publish.py # MQTT test publisher
├── frontend/ # React 18 dashboard (Week 2)
├── infra/ # Docker, MQTT broker, DB init configs
│ ├── mosquitto/ # Mosquitto config (anonymous auth for dev)
│ └── postgres/ # TimescaleDB extension init script
├── docs/ # Architecture diagrams, API documentation
└── scripts/ # Seed data, dev helper scripts

## Quick Start

### Prerequisites

- Python 3.12
- Docker Desktop
- Git

### 1. Clone and configure

```bash
git clone https://github.com/yawar2518/facility-intelligence.git
cd facility-intelligence
```

### 2. Start infrastructure

```bash
docker compose up -d
docker compose ps        # Verify all 4 services healthy
```

Services started:
| Service | Port | Purpose |
|---|---|---|
| PostgreSQL + TimescaleDB | 5433 | Database (remapped from 5432 to avoid native PG conflict) |
| Redis | 6379 | Celery broker + Django Channels layer |
| Mosquitto | 1883 | MQTT broker for device communication |
| pgAdmin | 5050 | Database visual management UI |

### 3. Set up Django backend

```bash
cd backend
py -3.12 -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements/local.txt
cp .env.example .env           # Edit with your values
python manage.py migrate
python manage.py createsuperuser
python manage.py runscript seed_data
python manage.py runserver     # http://localhost:8000
```

### 4. Start FastAPI ingestion service

```bash
cd ingestion
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001   # http://localhost:8001/docs
```

### 5. Start MQTT subscriber

```bash
cd ingestion
venv\Scripts\activate
python -m app.mqtt_subscriber
```

### 6. Run the device simulator

```bash
cd ingestion
venv\Scripts\activate
python ..\simulator\simulator.py                  # Normal mode
python ..\simulator\simulator.py --speed 6        # 6x speed
python ..\simulator\simulator.py --mode chaos     # Random faults
python ..\simulator\simulator.py --fault BG-01    # Kill one device
```

## Data Hierarchy

Facility (Downtown Garage, Airport Parking, Mall Complex)
└── Area (Level 1, Terminal 1, Basement 1)
└── Lane (Entry Lane 1, Exit Lane 2, Pay Station 1)
└── Device (Barrier Gate #1, LPR Camera #3, Kiosk #2)

## API Endpoints

### Django REST API (port 8000)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/token/` | Obtain JWT token |
| POST | `/api/v1/auth/token/refresh/` | Refresh JWT token |
| GET | `/api/v1/facilities/` | List all facilities |
| GET | `/api/v1/facilities/{id}/` | Facility detail with nested areas |
| GET | `/api/v1/areas/` | List areas (filterable by facility) |
| GET | `/api/v1/lanes/` | List lanes (filterable by area, type) |
| GET | `/api/v1/devices/` | List devices (filterable by type, status) |

### FastAPI Ingestion (port 8001)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service + database health check |
| POST | `/ingest/heartbeat` | Receive device heartbeat |
| POST | `/ingest/event` | Receive vehicle event |
| GET | `/docs` | Swagger UI (auto-generated) |

### MQTT Topics

| Topic | Direction | Description |
|---|---|---|
| `facility/{fcode}/device/{dcode}/heartbeat` | Device → Broker | Device alive signal |
| `facility/{fcode}/device/{dcode}/event` | Device → Broker | Vehicle traffic event |

## TimescaleDB Features

- **Hypertables:** `ingestion_heartbeats` and `ingestion_vehicle_events` partitioned by day
- **Compression:** Enabled on both hypertables for automatic storage optimization
- **Continuous Aggregates:** `hourly_lane_traffic` and `hourly_device_heartbeats` auto-refresh hourly

## Seed Data

3 facilities across Lahore with realistic configurations:

| Facility | Areas | Lanes | Devices | Location |
|---|---|---|---|---|
| Downtown Garage | 3 | 6 | 13 | Main Street |
| Airport Parking | 2 | 4 | 11 | Allama Iqbal International |
| Mall Complex | 2 | 5 | 12 | Emporium Mall, Johar Town |

## Development Progress

| Week | Focus | Status |
|---|---|---|
| Week 1 | Data hierarchy, ingestion, TimescaleDB, MQTT, simulator | ✅ Complete |
| Week 2 | Health monitoring, Celery tasks, React dashboard | 🔄 In Progress |
| Week 3 | Anomaly detection, forecasting, alerting engine | ⏳ Planned |
| Week 4 | RBAC, deployment, polish, demo video | ⏳ Planned |

## Author

**Yawar Abbas** — [@yawar2518](https://github.com/yawar2518)