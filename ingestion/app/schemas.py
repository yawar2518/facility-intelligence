"""
Pydantic schemas for ingestion payloads.

These define exactly what data a device must send.
FastAPI validates every incoming request against these schemas
automatically — invalid payloads are rejected with 422 errors.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class EventType(str, Enum):
    VEHICLE_ENTRY = "VEHICLE_ENTRY"
    VEHICLE_EXIT = "VEHICLE_EXIT"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    BARRIER_OPEN = "BARRIER_OPEN"
    BARRIER_CLOSE = "BARRIER_CLOSE"
    FAULT = "FAULT"
    RECOVERY = "RECOVERY"


class HeartbeatPayload(BaseModel):
    """
    Sent by every device every 30-60 seconds.
    Tells us the device is alive and its current state.
    """
    device_code: str = Field(
        ...,
        description="Unique device code matching Device.code in DB"
    )
    facility_code: str = Field(
        ...,
        description="Parent facility code for routing"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the heartbeat was generated on the device"
    )
    firmware_version: Optional[str] = Field(
        None,
        description="Current firmware version running on device"
    )
    error_codes: list[str] = Field(
        default_factory=list,
        description="Active fault codes, empty list if healthy"
    )
    metrics: dict = Field(
        default_factory=dict,
        description="Device-specific metrics e.g. gate cycle count, read rate"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "device_code": "BG-01",
                "facility_code": "DG-01",
                "timestamp": "2026-08-04T10:00:00Z",
                "firmware_version": "v3.2.1",
                "error_codes": [],
                "metrics": {"cycle_count": 1423, "last_cycle_ms": 2100}
            }
        }
    }


class VehicleEventPayload(BaseModel):
    """
    Sent when a vehicle enters, exits, or interacts with a device.
    This is the core traffic data that feeds our analytics.
    """
    device_code: str = Field(
        ...,
        description="Device that detected this event"
    )
    facility_code: str = Field(
        ...,
        description="Parent facility code"
    )
    event_type: EventType = Field(
        ...,
        description="What happened"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the event occurred on the device"
    )
    plate_number: Optional[str] = Field(
        None,
        description="License plate if captured by LPR camera"
    )
    transaction_id: Optional[str] = Field(
        None,
        description="Payment transaction ID if applicable"
    )
    duration_ms: Optional[int] = Field(
        None,
        description="How long the transaction took in milliseconds"
    )
    metadata: dict = Field(
        default_factory=dict,
        description="Any additional event-specific data"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "device_code": "LPR-01",
                "facility_code": "DG-01",
                "event_type": "VEHICLE_ENTRY",
                "timestamp": "2026-08-04T10:05:00Z",
                "plate_number": "LEA-1234",
                "duration_ms": 1800,
                "metadata": {"confidence": 0.97}
            }
        }
    }


class IngestionResponse(BaseModel):
    """Standard response for all ingestion endpoints."""
    success: bool
    message: str
    event_id: Optional[str] = None