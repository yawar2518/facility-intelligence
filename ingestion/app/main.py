"""
Facility Intelligence — Ingestion Service (FastAPI)

Receives device heartbeats and vehicle events via:
  1. HTTP endpoints (this file)
  2. MQTT subscriber (mqtt_subscriber.py)

Writes raw events to PostgreSQL which Django reads
for aggregation, anomaly detection, and dashboards.
"""

import uuid
import json
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from .database import get_db
from .schemas import HeartbeatPayload, VehicleEventPayload, IngestionResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup and shutdown."""
    logger.info("Ingestion service starting up...")
    yield
    logger.info("Ingestion service shutting down...")


app = FastAPI(
    title="Facility Intelligence — Ingestion Service",
    description="Receives device heartbeats and vehicle events",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check endpoint — verifies service and DB are alive.
    Used by Docker healthchecks and monitoring.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "ingestion",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": "connected",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


# ============================================================
# HEARTBEAT ENDPOINT
# ============================================================
@app.post(
    "/ingest/heartbeat",
    response_model=IngestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def receive_heartbeat(
    payload: HeartbeatPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive a device heartbeat.

    Called every 30-60 seconds by each device.
    Updates the device's last_seen timestamp in device_snapshots.

    Flow:
    1. Validate payload (Pydantic does this automatically)
    2. Look up device by code + facility_code
    3. Update device snapshot (last_heartbeat, status)
    4. Write raw heartbeat to heartbeats table (future hypertable)
    """
    try:
        # Step 1: Look up device in hierarchy
        device_result = await db.execute(
            text("""
                SELECT d.id, d.name, d.device_type, d.heartbeat_timeout_seconds
                FROM hierarchy_device d
                JOIN hierarchy_lane l ON d.lane_id = l.id
                JOIN hierarchy_area a ON l.area_id = a.id
                JOIN hierarchy_facility f ON a.facility_id = f.id
                WHERE d.code = :device_code
                  AND f.code = :facility_code
                  AND d.is_active = true
            """),
            {
                "device_code": payload.device_code,
                "facility_code": payload.facility_code,
            }
        )
        device = device_result.fetchone()

        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device '{payload.device_code}' not found "
                       f"in facility '{payload.facility_code}'"
            )

        # Step 2: Update device last_heartbeat + status
        new_status = 'DEGRADED' if payload.error_codes else 'ONLINE'
        await db.execute(
            text("""
                UPDATE hierarchy_device
                SET last_heartbeat = :ts,
                    status = :status,
                    updated_at = NOW()
                WHERE id = :device_id
            """),
            {
                "ts": payload.timestamp,
                "status": new_status,
                "device_id": str(device.id),
            }
        )

        # Step 3: Write raw heartbeat record
        heartbeat_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO ingestion_heartbeats
                    (record_id, device_id, facility_code, timestamp,
                     firmware_version, error_codes, metrics)
                VALUES
                    (:record_id, :device_id, :facility_code, :timestamp,
                     :firmware_version, CAST(:error_codes AS jsonb), CAST(:metrics AS jsonb))
            """),
            {
                "record_id": heartbeat_id,
                "device_id": str(device.id),
                "facility_code": payload.facility_code,
                "timestamp": payload.timestamp,
                "firmware_version": payload.firmware_version or "",
                "error_codes": json.dumps(payload.error_codes),
                "metrics": json.dumps(payload.metrics),
            }
        )

        logger.info(
            f"Heartbeat received: {payload.device_code} "
            f"@ {payload.facility_code} → {new_status}"
        )

        return IngestionResponse(
            success=True,
            message=f"Heartbeat recorded for {payload.device_code}",
            event_id=heartbeat_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Heartbeat ingestion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal ingestion error"
        )


# ============================================================
# VEHICLE EVENT ENDPOINT
# ============================================================
@app.post(
    "/ingest/event",
    response_model=IngestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def receive_vehicle_event(
    payload: VehicleEventPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive a vehicle event (entry, exit, payment, fault, etc.)

    These are the core traffic events that feed:
    - Occupancy counting
    - Traffic analytics
    - Anomaly detection baselines
    - Revenue reporting
    """
    try:
        # Look up device
        device_result = await db.execute(
            text("""
                SELECT d.id, d.name, l.id as lane_id, a.id as area_id, f.id as facility_id
                FROM hierarchy_device d
                JOIN hierarchy_lane l ON d.lane_id = l.id
                JOIN hierarchy_area a ON l.area_id = a.id
                JOIN hierarchy_facility f ON a.facility_id = f.id
                WHERE d.code = :device_code
                  AND f.code = :facility_code
                  AND d.is_active = true
            """),
            {
                "device_code": payload.device_code,
                "facility_code": payload.facility_code,
            }
        )
        device = device_result.fetchone()

        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device '{payload.device_code}' not found"
            )

        # Write vehicle event
        event_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO ingestion_vehicle_events
                    (record_id, device_id, lane_id, area_id, facility_id,
                     event_type, timestamp, plate_number,
                     transaction_id, duration_ms, metadata)
                VALUES
                    (:record_id, :device_id, :lane_id, :area_id, :facility_id,
                     :event_type, :timestamp, :plate_number,
                     :transaction_id, :duration_ms, CAST(:metadata AS jsonb))
            """),
            {
                "record_id": event_id,
                "device_id": str(device.id),
                "lane_id": str(device.lane_id),
                "area_id": str(device.area_id),
                "facility_id": str(device.facility_id),
                "event_type": payload.event_type.value,
                "timestamp": payload.timestamp,
                "plate_number": payload.plate_number,
                "transaction_id": payload.transaction_id,
                "duration_ms": payload.duration_ms,
                "metadata": json.dumps(payload.metadata),
            }
        )

        logger.info(
            f"Event received: {payload.event_type.value} "
            f"from {payload.device_code} @ {payload.facility_code}"
        )

        return IngestionResponse(
            success=True,
            message=f"Event {payload.event_type.value} recorded",
            event_id=event_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Event ingestion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal ingestion error"
        )