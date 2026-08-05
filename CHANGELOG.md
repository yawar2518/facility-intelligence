# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Planned
- Health monitoring rules engine (per device type)
- Celery + Redis background task infrastructure
- Heartbeat timeout detection
- React 18 dashboard with live status grid
- Django Channels WebSocket push

## [0.1.0] - 2026-08-05

### Week 1 — Foundation + Ingestion Pipeline

#### Added — Day 1: Infrastructure
- Monorepo project scaffold (backend, ingestion, simulator, frontend, infra, docs)
- Docker Compose stack: PostgreSQL 16 + TimescaleDB, Redis 7, Mosquitto 2, pgAdmin 4
- Python 3.12 virtual environments for Django and FastAPI services
- Professional Git branching model (main → develop → feature branches)
- Conventional Commits formatting throughout

#### Added — Day 2: Django Backend + Domain Models
- Django 5 project with split settings architecture (base/local/production)
- PostgreSQL connection on port 5433 (resolved native Windows PG conflict)
- Four Django apps: hierarchy, monitoring, alerts, ml
- Domain models: Facility, Area, Lane, Device with UUID primary keys
- TimeStampedModel abstract base class (created_at, updated_at)
- DeviceType and DeviceStatus TextChoices enums
- MQTT topic prefix property on Device model
- Django Admin with inline drill-down navigation (Facility → Area → Lane → Device)
- Django Debug Toolbar configured for development

#### Added — Day 3: REST API + FastAPI Ingestion
- Seed script: 3 facilities, 7 areas, 15 lanes, 36 devices across Lahore
- DRF List/Detail serializer pattern for all hierarchy models
- ModelViewSets with filtering, search, and ordering
- JWT authentication endpoints (obtain + refresh)
- API routing under /api/v1/ with DRF DefaultRouter
- FastAPI ingestion service on port 8001 with auto-generated Swagger UI
- POST /ingest/heartbeat — receives heartbeats, updates device status in real time
- POST /ingest/event — receives vehicle events (entry, exit, payment, fault)
- GET /health — service and database health check
- Django ingestion app: Heartbeat + VehicleEvent models
- Ingestion admin panel showing received heartbeats and events

#### Added — Day 4: TimescaleDB + MQTT Subscriber
- Converted ingestion_heartbeats to TimescaleDB hypertable (1-day chunks)
- Converted ingestion_vehicle_events to TimescaleDB hypertable (1-day chunks)
- Composite primary key (record_id, timestamp) for TimescaleDB partitioning
- Compression enabled on both hypertables
- Continuous aggregate: hourly_lane_traffic (auto-refreshes hourly)
- Continuous aggregate: hourly_device_heartbeats (auto-refreshes hourly)
- MQTT subscriber service (paho-mqtt with asyncio event loop)
- Topic routing: facility/+/device/+/heartbeat and facility/+/device/+/event
- Full MQTT pipeline verified end-to-end

#### Added — Day 5: Device Simulator
- Async simulator running all 36 devices simultaneously
- Realistic time-of-day traffic curves (4x rush hour, 0.05x night)
- Device-specific heartbeat metrics per type (gate cycles, LPR read rates, kiosk transactions)
- 2% random fault injection per heartbeat cycle
- Pakistani license plate generation (LHR/ISB/KHI/FSD/MUL/PES/QTA prefixes)
- CLI modes: normal, chaos (random fault injection), fault (targeted device kill)
- Speed multiplier (--speed 6 compresses a day into 4 hours)
- Python test publisher for MQTT testing on Windows

#### Fixed
- pgAdmin email validation (fi.local rejected by recent pgAdmin update)
- PostgreSQL port conflict with native Windows installation (remapped to 5433)
- Windows .env encoding corruption (em-dash characters causing silent auth failures)
- SQLAlchemy jsonb casting (CAST syntax vs :: shorthand with asyncpg)
- Django apps/ directory missing __init__.py causing module import failures