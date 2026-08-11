# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Planned
- Anomaly detection — z-score baseline + IsolationForest
- Prophet forecasting — per-lane traffic predictions
- Anomaly API endpoints with explainability payloads
- Frontend anomaly timeline and forecast chart
- Configurable alert rules engine
- SendGrid email alerts + Slack webhook

## [0.2.0] - 2026-08-10

### Week 2 — Health Monitoring, Live Dashboard & WebSocket Push

#### Added — Day 1: Celery Infrastructure + Heartbeat Monitoring
- Celery application wired into Django with task auto-discovery (`config/celery.py`)
- `config/__init__.py` updated to import celery_app on Django startup
- Celery Beat schedule: `check_heartbeat_timeouts` runs every 30 seconds
- `DeviceStatusChange` model — records every status transition with duration tracking
- `HealthCheckRun` model — audit log for every task execution
- `check_heartbeat_timeouts` Celery task — scans all active devices every 30 seconds
- `_record_status_change()` helper — writes DeviceStatusChange and updates Device.status atomically
- `_process_single_device()` — three-case logic: no heartbeat, stale heartbeat, fresh heartbeat
- Recovery detection — devices automatically transition OFFLINE → ONLINE when heartbeat resumes
- Monitoring models registered in Django Admin with full read-only field display

#### Fixed — Day 1
- MQTT subscriber was setting device status directly — removed, Celery now owns all status transitions
- MQTT subscriber now only updates `last_heartbeat` timestamp
- Task file named `task.py` instead of `tasks.py` — Celery autodiscovery requires exact filename
- Windows Celery constraint — `-P solo` required for worker, Beat must run as separate process

#### Added — Day 2: Health Rules Engine + Monitoring API
- `apps/monitoring/health_rules.py` — per-device-type health evaluators
  - Barrier Gate: DEGRADED on active error codes or gate cycle time > 4000ms
  - LPR Camera: DEGRADED if plate read success < 85% or FPS < 20
  - Kiosk: DEGRADED if transaction success rate < 95%
  - Intercom: DEGRADED if call connect success rate < 90%
  - Ticket Dispenser / Sensor: ONLINE as long as heartbeating
- Health rules wired into `_process_single_device` — evaluates latest heartbeat metrics on every check
- ONLINE → DEGRADED → ONLINE full cycle verified end-to-end with simulator
- `apps/monitoring/uptime.py` — calculates uptime % from DeviceStatusChange history
  - Returns uptime_pct, online_seconds, offline_seconds, degraded_seconds over configurable window
- Five monitoring REST API endpoints (`apps/monitoring/views.py` + `urls.py`):
  - `GET /api/v1/monitoring/facilities/{id}/health/` — facility health score and device counts
  - `GET /api/v1/monitoring/facilities/{id}/devices/` — full Facility → Area → Lane → Device tree
  - `GET /api/v1/monitoring/facilities/{id}/status-changes/` — chronological status change feed
  - `GET /api/v1/monitoring/areas/{id}/health/` — area-level health rollup
  - `GET /api/v1/monitoring/devices/{id}/uptime/` — uptime % with online/offline/degraded breakdown
- All endpoints verified via PowerShell Invoke-RestMethod

#### Added — Day 3: React Dashboard Foundation
- React 18 + Vite + Tailwind v4 project initialized in `frontend/`
- Vite proxy configured to forward `/api` to Django — no CORS issues in development
- Axios API client with JWT interceptors (`src/api/client.js`)
  - Auto-attaches Bearer token on every request
  - Redirects to `/login` on 401 response
- All monitoring API functions in `src/api/monitoring.js`
- Protected routing with React Router — unauthenticated users redirected to login
- JWT login page with error handling
- Dark-themed layout with sidebar navigation (`src/components/Layout.jsx`)
- `useFacilities` hook — fetches facility list with parallel health data
- `FacilityCard` component — health score, progress bar, device count breakdown
- Overview page with live facility health cards pulling real API data
- Status Grid page:
  - `useFacilityDeviceTree` hook — refetches on facility selection change
  - `FacilitySelector` dropdown component
  - `AreaPanel` — collapsible area sections with live health score
  - `LaneRow` — lane name, type badge, device grid
  - `DeviceTile` — status left-border accent, monospace code, status dot
- Event Timeline page:
  - `useFacilityStatusChanges` hook
  - `StatusChangeRow` — timestamp, device, transition badges, reason, error codes, duration
- Area health score computed dynamically from live device statuses (not stale API data)

#### Added — Day 4: Django Channels WebSocket + Device Detail Panel
- `apps/monitoring/consumers.py` — `FacilityStatusConsumer` AsyncWebsocketConsumer
  - Joins facility-specific channel group on connect
  - Forwards `device_status_update` events to browser as JSON
- `apps/monitoring/routing.py` — WebSocket URL pattern `ws/facility/{facility_id}/`
- `config/asgi.py` — ProtocolTypeRouter with HTTP + AuthMiddlewareStack WebSocket routing
- Celery task broadcasts status changes via `channel_layer.group_send()` after every transition
- `async_to_sync` bridge for calling async channel layer from synchronous Celery task
- Broadcast wrapped in try/except — WebSocket failure never breaks monitoring task
- `useDeviceDetail` hook — fetches 7-day uptime data, auto-refreshes every 60 seconds
- `DeviceDetailPanel` — slides from right on device tile click
  - Current status with last heartbeat time ago
  - Device type and timeout info
  - Uptime percentage with progress bar
  - Online/offline/degraded duration breakdown
- WebSocket live updates wired into StatusGridPage
  - Device tile colors update instantly on status change without page refresh
  - Side panel status updates in real time from WebSocket messages
  - Area health score recalculates live when devices update
- Django must run via Daphne for WebSocket support (`daphne -p 8000 config.asgi:application`)

#### Added — Day 5: UI Redesign + Polish
- Platform rebranded to **Argus** (hundred-eyed giant who never sleeps)
- Design system implemented via CSS custom properties in `index.css`
  - Background: #000000, Surface: #0A0A0A, Surface-2: #111111
  - Border: #1A1A1A, Border-2: #262626
  - Text hierarchy: #EDEDED / #707070 / #3A3A3A
  - Muted status colors: Online #16A34A, Offline #B91C1C, Degraded #B45309
- Inter font for UI, JetBrains Mono for device codes and timestamps
- Lucide React icons installed and wired into sidebar navigation
- Sidebar redesigned — icons + text labels, active state = surface-2 + left border accent
- Device tiles redesigned — 3px left border status accent, no colored backgrounds
- Overview page — recent events feed added below facility cards
- Timeline page — table layout with column headers, monospace timestamps
- Device detail panel — section headers, cleaner uptime display
- All status colors referenced via CSS variables — no hardcoded hex values in components

#### Fixed — Week 2
- WebSocket reconnection loop — removed `tree` from useEffect dependency array
- Recovery detection not firing — MQTT subscriber was bypassing Celery by setting status directly
- `setTree` not accessible in WebSocket handler — exposed from `useFacilityDeviceTree` hook
- Area health score showing stale data — moved calculation to frontend from live device statuses
- Celery worker not picking up task changes — required manual restart (no auto-reload)
- Daphne not starting — `consumers.py` file not found due to incorrect import path

#### Known Issues
- 8 devices permanently UNKNOWN in AP-01 and MC-01 due to duplicate device codes across areas
  - MQTT subscriber finds first match only when looking up by device_code + facility_code
  - Scheduled for fix in Week 3 seed data refactor

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