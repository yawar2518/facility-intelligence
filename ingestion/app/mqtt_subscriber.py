"""
MQTT Subscriber — Facility Intelligence Ingestion Service

Connects to Mosquitto broker and subscribes to all device topics.
Routes incoming messages to the same database logic as HTTP endpoints.

Topic structure:
    facility/{facility_code}/device/{device_code}/heartbeat
    facility/{facility_code}/device/{device_code}/event

Run with:
    python -m app.mqtt_subscriber
"""

import json
import asyncio
import logging
import os
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from app.database import AsyncSessionLocal
from app.schemas import HeartbeatPayload, VehicleEventPayload, EventType
from sqlalchemy import text
import uuid

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_CLIENT_ID = "fi-ingestion-subscriber"


# ============================================================
# TOPIC PARSER
# ============================================================
def parse_topic(topic: str) -> dict | None:
    """
    Parse MQTT topic into components.

    Expected formats:
        facility/{fcode}/device/{dcode}/heartbeat
        facility/{fcode}/device/{dcode}/event

    Returns dict with facility_code, device_code, message_type
    or None if topic doesn't match expected pattern.
    """
    parts = topic.split("/")

    # Must have exactly 5 parts
    if len(parts) != 5:
        return None

    facility_prefix, facility_code, device_prefix, device_code, msg_type = parts

    if facility_prefix != "facility" or device_prefix != "device":
        return None

    if msg_type not in ("heartbeat", "event"):
        return None

    return {
        "facility_code": facility_code,
        "device_code": device_code,
        "message_type": msg_type,
    }


# ============================================================
# DATABASE OPERATIONS (sync wrappers for paho-mqtt callbacks)
# ============================================================
async def process_heartbeat(facility_code: str, device_code: str, payload: dict):
    """Process a heartbeat message and write to database."""
    async with AsyncSessionLocal() as db:
        try:
            # Look up device
            result = await db.execute(
                text("""
                    SELECT d.id, d.name
                    FROM hierarchy_device d
                    JOIN hierarchy_lane l ON d.lane_id = l.id
                    JOIN hierarchy_area a ON l.area_id = a.id
                    JOIN hierarchy_facility f ON a.facility_id = f.id
                    WHERE d.code = :device_code
                      AND f.code = :facility_code
                      AND d.is_active = true
                """),
                {"device_code": device_code, "facility_code": facility_code}
            )
            device = result.fetchone()

            if not device:
                logger.warning(
                    f"Unknown device: {device_code} @ {facility_code}"
                )
                return

            # Parse timestamp
            ts_str = payload.get("timestamp")
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00")) if ts_str \
                    else datetime.now(timezone.utc)
            except (ValueError, AttributeError):
                ts = datetime.now(timezone.utc)

            error_codes = payload.get("error_codes", [])
            new_status = "DEGRADED" if error_codes else "ONLINE"

            # Update device status
            await db.execute(
                text("""
                    UPDATE hierarchy_device
                    SET last_heartbeat = :ts,
                        status = :status,
                        updated_at = NOW()
                    WHERE id = :device_id
                """),
                {
                    "ts": ts,
                    "status": new_status,
                    "device_id": str(device.id),
                }
            )

            # Write heartbeat record
            await db.execute(
                text("""
                    INSERT INTO ingestion_heartbeats
                        (record_id, device_id, facility_code, timestamp,
                         firmware_version, error_codes, metrics)
                    VALUES
                        (:record_id, :device_id, :facility_code, :timestamp,
                         :firmware_version,
                         CAST(:error_codes AS jsonb),
                         CAST(:metrics AS jsonb))
                """),
                {
                    "record_id": str(uuid.uuid4()),
                    "device_id": str(device.id),
                    "facility_code": facility_code,
                    "timestamp": ts,
                    "firmware_version": payload.get("firmware_version", ""),
                    "error_codes": json.dumps(error_codes),
                    "metrics": json.dumps(payload.get("metrics", {})),
                }
            )

            await db.commit()
            logger.info(
                f"MQTT heartbeat: {device_code} @ {facility_code} → {new_status}"
            )

        except Exception as e:
            await db.rollback()
            logger.error(f"Heartbeat processing error: {e}")


async def process_event(facility_code: str, device_code: str, payload: dict):
    """Process a vehicle event message and write to database."""
    async with AsyncSessionLocal() as db:
        try:
            # Look up device with full hierarchy
            result = await db.execute(
                text("""
                    SELECT d.id, l.id as lane_id,
                           a.id as area_id, f.id as facility_id
                    FROM hierarchy_device d
                    JOIN hierarchy_lane l ON d.lane_id = l.id
                    JOIN hierarchy_area a ON l.area_id = a.id
                    JOIN hierarchy_facility f ON a.facility_id = f.id
                    WHERE d.code = :device_code
                      AND f.code = :facility_code
                      AND d.is_active = true
                """),
                {"device_code": device_code, "facility_code": facility_code}
            )
            device = result.fetchone()

            if not device:
                logger.warning(
                    f"Unknown device for event: {device_code} @ {facility_code}"
                )
                return

            # Validate event type
            event_type = payload.get("event_type", "").upper()
            valid_types = [e.value for e in EventType]
            if event_type not in valid_types:
                logger.warning(f"Invalid event type: {event_type}")
                return

            # Parse timestamp
            ts_str = payload.get("timestamp")
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00")) if ts_str \
                    else datetime.now(timezone.utc)
            except (ValueError, AttributeError):
                ts = datetime.now(timezone.utc)

            # Write event
            await db.execute(
                text("""
                    INSERT INTO ingestion_vehicle_events
                        (record_id, device_id, lane_id, area_id, facility_id,
                         event_type, timestamp, plate_number,
                         transaction_id, duration_ms, metadata)
                    VALUES
                        (:record_id, :device_id, :lane_id, :area_id, :facility_id,
                         :event_type, :timestamp, :plate_number,
                         :transaction_id, :duration_ms,
                         CAST(:metadata AS jsonb))
                """),
                {
                    "record_id": str(uuid.uuid4()),
                    "device_id": str(device.id),
                    "lane_id": str(device.lane_id),
                    "area_id": str(device.area_id),
                    "facility_id": str(device.facility_id),
                    "event_type": event_type,
                    "timestamp": ts,
                    "plate_number": payload.get("plate_number"),
                    "transaction_id": payload.get("transaction_id"),
                    "duration_ms": payload.get("duration_ms"),
                    "metadata": json.dumps(payload.get("metadata", {})),
                }
            )

            await db.commit()
            logger.info(
                f"MQTT event: {event_type} from {device_code} @ {facility_code}"
            )

        except Exception as e:
            await db.rollback()
            logger.error(f"Event processing error: {e}")


# ============================================================
# PAHO-MQTT CALLBACKS
# ============================================================
def on_connect(client, userdata, flags, reason_code, properties):
    """Called when connected to broker."""
    if reason_code == 0:
        logger.info(f"Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")

        # Subscribe to all device topics
        # facility/+/device/+/heartbeat
        # facility/+/device/+/event
        client.subscribe("facility/+/device/+/heartbeat", qos=1)
        client.subscribe("facility/+/device/+/event", qos=1)
        logger.info("Subscribed to: facility/+/device/+/heartbeat")
        logger.info("Subscribed to: facility/+/device/+/event")
    else:
        logger.error(f"Connection failed with code: {reason_code}")


def on_message(client, userdata, msg):
    """Called when a message is received."""
    topic = msg.topic

    # Parse topic
    parsed = parse_topic(topic)
    if not parsed:
        logger.warning(f"Unrecognized topic: {topic}")
        return

    # Parse JSON payload
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON on topic {topic}: {e}")
        return

    facility_code = parsed["facility_code"]
    device_code = parsed["device_code"]
    message_type = parsed["message_type"]

    logger.debug(f"Received {message_type} from {device_code} @ {facility_code}")

    # Route to appropriate handler
    loop = userdata["loop"]
    if message_type == "heartbeat":
        asyncio.run_coroutine_threadsafe(
            process_heartbeat(facility_code, device_code, payload),
            loop
        )
    elif message_type == "event":
        asyncio.run_coroutine_threadsafe(
            process_event(facility_code, device_code, payload),
            loop
        )


def on_disconnect(client, userdata, flags, reason_code, properties):
    """Called when disconnected from broker."""
    if reason_code != 0:
        logger.warning(f"Unexpected disconnect (code: {reason_code}). Will retry...")


# ============================================================
# MAIN ENTRY POINT
# ============================================================
async def main():
    """Start the MQTT subscriber with async event loop."""
    loop = asyncio.get_event_loop()

    # Create MQTT client
    client = mqtt.Client(
        client_id=MQTT_CLIENT_ID,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        userdata={"loop": loop}
    )

    # Wire callbacks
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    # Connect to broker
    logger.info(f"Connecting to MQTT broker at {MQTT_HOST}:{MQTT_PORT}...")
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)

    # Start paho network loop in background thread
    client.loop_start()

    logger.info("MQTT subscriber running. Press Ctrl+C to stop.")

    try:
        # Keep alive forever
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down MQTT subscriber...")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())