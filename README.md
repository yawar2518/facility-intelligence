# Facility Intelligence Platform

> Parking operations monitoring, anomaly detection & forecasting platform.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.x-green.svg)](https://djangoproject.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

A monitoring and intelligence platform that ingests real-time data from a
Facility → Area → Lane → Device hierarchy, detects anomalies, forecasts
occupancy, and alerts the right stakeholders — before customers complain.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Django 5 + Django REST Framework |
| Ingestion Service | FastAPI (async, high-throughput) |
| Database | PostgreSQL 16 + TimescaleDB |
| Background Jobs | Celery + Redis |
| ML / Anomaly | scikit-learn (IsolationForest) |
| Forecasting | Prophet |
| Real-time Push | Django Channels (WebSockets) |
| Frontend | React 18 + Vite + Tailwind + Recharts |
| IoT Protocol | MQTT (Mosquitto) |
| Alerting | SendGrid + Slack + Twilio |

## Project Structure

facility-intelligence/
├── backend/ # Django project (API, admin, models, auth)
├── ingestion/ # FastAPI ingestion service (MQTT + webhook)
├── simulator/ # Device simulator for development & testing
├── frontend/ # React 18 dashboard
├── infra/ # Docker, MQTT broker, DB init configs
├── docs/ # Architecture diagrams, API documentation
└── scripts/ # Dev helper scripts

## Quick Start

### Prerequisites
- Docker Desktop
- Python 3.12

### Run the development environment

```bash
# 1. Clone the repository
git clone https://github.com/yawar2518/facility-intelligence.git
cd facility-intelligence

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your values

# 3. Start all infrastructure services
docker compose up -d

# 4. Set up Django backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements/local.txt
python manage.py migrate
python manage.py runserver

# 5. Start FastAPI ingestion service (new terminal)
cd ingestion
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Development Progress

| Week | Focus | Status |
|---|---|---|
| Week 1 | Data hierarchy, ingestion, rollups | 🔄 In Progress |
| Week 2 | Health monitoring, live dashboard | ⏳ Planned |
| Week 3 | Anomaly detection, forecasting | ⏳ Planned |
| Week 4 | Alerting, deployment | ⏳ Planned |

## Author

**Yawar Abbas** — [@yawar2518](https://github.com/yawar2518)