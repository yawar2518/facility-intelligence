# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-08-20

### Week 4 — Alerts, ML Enhancements, Operations & Frontend Redesign

#### Added — Alerts Pipeline
- `AlertRule` model — configurable per facility, min severity, anomaly type filter, cooldown
- `AlertRecipient` model — email or Slack channel, digest subscription flag
- `AlertLog` model — delivery record per send attempt with SENT/FAILED status
- `evaluate_alert_rules` Celery task — runs at `:15` every hour, 70-minute lookback window
- `send_alert_email` task — Gmail SMTP delivery with full anomaly context
- Slack Block Kit webhook integration — header, severity, facility, sigma score fields
- `send_daily_digest` task — runs 8:00 AM UTC, 24h anomaly breakdown per recipient
- Alert cooldown enforcement — FAILED logs excluded from cooldown calculation
- Alert log API at `GET /api/v1/alert-logs/` with CSV export support
- `AlertLogsPage.jsx` with status filter and 60s auto-refresh

#### Added — Predictive Maintenance Scoring
- `MaintenanceScore` model — risk score (0–1), risk level, explanation, computed_at
- `compute_maintenance_scores` Celery task — daily at 3:00 AM UTC
- Scoring features: cycle rate, error rate, total cycles (7-day heartbeat history)
- Weighted scoring: 40% cycle rate + 40% error rate + 20% total cycles
- Thresholds: cycle_rate>5, error_rate>0.1, total_cycles>10000 → HIGH
- `MaintenancePage.jsx` with risk filter and progress bar visualization

#### Added — CSV Export
- `CSVRenderer` in `apps/core/renderers.py` — reusable DRF BaseRenderer
- Handles paginated responses, flattens nested dicts, handles None values
- Added to AnomalyViewSet, ForecastViewSet, AlertLogViewSet, MaintenanceScoreViewSet
- `CsvExportButton.jsx` reusable component with auth header and browser download trigger
- Export buttons on Anomalies, Alert Logs, and Maintenance pages

#### Added — Facility SLA Dashboard
- `FacilitySLAView` at `/api/v1/monitoring/facilities/sla/`
- Aggregates uptime %, incident count (OFFLINE transitions), anomaly count per facility
- Covers last 7 days, sorted by uptime descending then anomaly count ascending
- `SLADashboardPage.jsx` with 4 summary metric cards and facility leaderboard table

#### Added — Role-Based Multi-Tenant Access
- `UserProfile` model — role (ADMIN/REGIONAL_MANAGER/FACILITY_OWNER), ManyToMany facilities
- `check_facility_access()` helper for URL-param views
- `get_accessible_facilities()` for queryset filtering
- Inline role-based filtering on all ViewSets via `get_queryset()` override
- `/api/v1/auth/me/` endpoint returning username, email, role, accessible facilities
- `UserProvider` + `useCurrentUser` React context
- Sidebar shows username, role label, and facility codes for non-admin users
- Test users: `dg_owner` (FACILITY_OWNER), `regional_manager` (REGIONAL_MANAGER), `argus_admin` (ADMIN)

#### Added — Historical Playback
- `FacilityPlaybackView` at `/api/v1/monitoring/facilities/{id}/playback/`
- Returns unified traffic buckets (TimescaleDB `time_bucket()`), device status changes, and anomalies
- Configurable `bucket_minutes` param (default 5, max 60)
- Default window: last 24 hours
- Role-based access enforced via `check_facility_access()`
- `PlaybackPage.jsx` with facility selector, datetime range inputs, Recharts AreaChart
- Anomaly reference lines overlaid on traffic chart by severity color
- Interleaved event feed (status changes + anomalies sorted by time)

#### Added — Public Status Page
- `PublicStatusView` at `/status/` — no authentication required
- Customer-facing language: Available / Limited / Unavailable per area
- Availability thresholds: >70% online = Available, 40–70% = Limited, <40% = Unavailable
- Customer notices from TRAFFIC_SPIKE and TRAFFIC_DROP anomalies only
- One notice per area — worst severity wins (disruption beats congestion)
- Device internals never exposed publicly
- 60-second Redis cache via `cache_page` decorator
- Auto-refresh `<meta>` tag every 60 seconds
- `CACHES` Redis config added to `base.py`

#### Added — Automated Test Suite
- 26 tests across 5 classes in `backend/apps/tests.py`
- `UptimeCalculationTest` — 5 tests for accuracy, duration capping, return shape
- `FacilityAccessTest` — 5 tests for all three roles + superuser + no-profile user
- `AlertCooldownTest` — 4 tests for no-log, within cooldown, expired cooldown, FAILED exclusion
- `PublicStatusPageTest` — 6 tests for availability thresholds and unauthenticated access
- `PlaybackAPITest` — 6 tests for 401/403/404 enforcement and response shape
- All 26 tests passing

#### Added — Frontend Redesign
- Complete visual redesign based on Claude Design mockups
- New design system: warm sand theme replacing dark monochrome
  - Background #F0EBE3, Surface #F7F4EF, Text #1A1A1A, Muted #8A8070
  - Online #2D7A5F, Degraded #C4842A, Offline #C13B3B
- Grouped sidebar navigation: MONITOR / DETECT / PREDICT / REPLAY
- Smooth page fade-in transitions on route change
- Skeleton loaders replacing empty/zero states during data fetch
- Animated status dots: online pulse, degraded slow pulse, offline static
- Staggered card entrance animations on facility cards and list rows
- Live toast notifications for WebSocket device status change events
- Number counter animations on key overview metrics
- All 9 pages redesigned and data-wired

#### Fixed
- Prophet forecast chart blank — `forecast_for__gte=now()` filter excluded all stale records
  - Confirmed Celery Beat regenerates forecasts nightly at 2:30 AM UTC
- `check_facility_access()` returns True for users with no UserProfile (documented known issue)
- IsolationForest contamination reduced from 0.05 to 0.02 to prevent over-flagging
- DOW convention mismatch: PostgreSQL DOW Sunday=0 vs Python weekday Monday=0
  - Fixed via `(py_dow + 1) % 7` conversion

---

## [0.3.0] - 2026-08-14

### Week 3 — Anomaly Detection, Forecasting & ML Pipeline

#### Added — Z-Score Anomaly Detection
- `Anomaly` model — anomaly_type, severity, observed/baseline/std_dev values, sigma_score, explanation
- `detect_traffic_anomalies` Celery task — runs at `:05` every hour
- 56-day baseline per lane × DOW × hour using `hourly_lane_traffic` continuous aggregate
- Severity thresholds: |σ| ≥ 2.0 LOW, ≥ 3.0 MEDIUM, ≥ 4.0 HIGH, ≥ 5.0 CRITICAL
- TRAFFIC_SPIKE and TRAFFIC_DROP anomaly types
- Human-readable explanation: "Monday 08:00–09:00 volume was 3.2σ below baseline"
- DOW convention fix: `(py_dow + 1) % 7` for PostgreSQL/Python alignment

#### Added — IsolationForest Multivariate Detection
- `detect_isolation_forest_anomalies` Celery task — runs at `:10` every hour
- Features: vehicle event count, heartbeat count, error rate, timestamp cyclical encoding
- joblib model persistence at `backend/ml_models/isolation_forest.pkl`
- contamination=0.02 after tuning (reduced from 0.05 to prevent over-flagging)
- Separate anomaly type: ISOLATION_FOREST

#### Added — Prophet Forecasting
- `Forecast` model — predicted, predicted_low, predicted_high per lane per hour
- `train_and_forecast` Celery task — daily at 2:30 AM UTC
- Per-lane Prophet model training on 56-day vehicle event history
- 24-hour ahead forecasting with confidence band (yhat_lower/yhat_upper)
- `ForecastViewSet` at `/api/v1/ml/forecasts/` with lane filter
- `ForecastChart.jsx` — Recharts AreaChart with confidence band shading

#### Added — Anomaly API + Frontend
- `AnomalyViewSet` at `/api/v1/ml/anomalies/` with severity and type filters
- Acknowledge endpoint — PATCH `is_acknowledged=True` with timestamp
- `AnomaliesPage.jsx` with severity filter, type filter, acknowledge button
- `useAnomalies` hook with 60s auto-refresh

#### Fixed
- Baseline data poisoning — test spike events sharing timestamp window corrupted baselines
- IsolationForest over-flagging — backfilled zero error codes made live fault rate anomalous
- Prophet stale forecasts — `forecast_for__gte` filter made old records invisible after daily run

---

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
- Five monitoring REST API endpoints
- Uptime calculation engine (`apps/monitoring/uptime.py`)

#### Added — Day 3: React Dashboard Foundation
- React 18 + Vite + Tailwind v4 project initialized in `frontend/`
- Axios API client with JWT interceptors
- Protected routing with React Router
- Overview, Status Grid, and Timeline pages

#### Added — Day 4: Django Channels WebSocket + Device Detail Panel
- `FacilityStatusConsumer` AsyncWebsocketConsumer
- WebSocket URL `ws/facility/{facility_id}/`
- `DeviceDetailPanel` with 7-day uptime data
- Live device tile color updates without page refresh

#### Added — Day 5: UI Redesign + Platform Branding
- Platform rebranded to **Argus**
- Dark monochrome design system via CSS custom properties
- Inter font for UI, JetBrains Mono for codes and timestamps

#### Fixed — Week 2
- WebSocket reconnection loop — removed `tree` from useEffect dependency array
- Recovery detection not firing — MQTT subscriber bypassing Celery
- Area health score showing stale data — moved calculation to frontend

---

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
- Django Admin with inline drill-down navigation

#### Added — Day 3: REST API + FastAPI Ingestion
- Seed script: 3 facilities, 7 areas, 15 lanes, 36 devices across Lahore
- DRF List/Detail serializer pattern for all hierarchy models
- JWT authentication endpoints (obtain + refresh)
- FastAPI ingestion service on port 8001
- `POST /ingest/heartbeat` and `POST /ingest/event` endpoints

#### Added — Day 4: TimescaleDB + MQTT Subscriber
- Converted ingestion tables to TimescaleDB hypertables (1-day chunks)
- Composite primary key (record_id, timestamp) for TimescaleDB partitioning
- Continuous aggregates: `hourly_lane_traffic`, `hourly_device_heartbeats`
- MQTT subscriber with asyncio event loop and topic routing

#### Added — Day 5: Device Simulator
- Async simulator running all 32 devices simultaneously
- Realistic time-of-day traffic curves (4x rush hour, 0.05x night)
- 2% random fault injection per heartbeat cycle
- Pakistani license plate generation (LHR/ISB/KHI/FSD prefixes)
- CLI modes: normal, chaos, fault with speed multiplier

#### Fixed
- pgAdmin email validation (fi.local rejected by recent pgAdmin update)
- PostgreSQL port conflict with native Windows installation (remapped to 5433)
- Windows .env encoding corruption causing silent auth failures
- SQLAlchemy jsonb casting (CAST syntax vs :: shorthand with asyncpg)