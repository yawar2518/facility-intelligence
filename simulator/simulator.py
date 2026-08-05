"""
Facility Intelligence — Device Simulator

Simulates all devices in the database publishing realistic
MQTT traffic patterns. Used for development and testing.

Usage:
    python simulator/simulator.py                    # Normal mode
    python simulator/simulator.py --mode chaos       # Random faults
    python simulator/simulator.py --speed 6          # 6x time speed
    python simulator/simulator.py --fault BG-01      # Kill one device

The simulator reads device config from PostgreSQL and publishes
to Mosquitto using the same topic structure as real devices.
"""

import asyncio
import json
import logging
import os
import random
import argparse
from datetime import datetime, timezone
from typing import Optional

import paho.mqtt.client as mqtt
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================
MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://fi_user:fi_password@localhost:5433/facility_intelligence"
)

# Heartbeat interval in seconds (real devices: 30s)
HEARTBEAT_INTERVAL = 30

# Vehicle event base interval in seconds (adjusted by traffic curve)
BASE_EVENT_INTERVAL = 45


# ============================================================
# TRAFFIC CURVE
# Returns a multiplier (0.1 to 4.0) based on hour of day.
# This creates realistic rush hour peaks.
# ============================================================
TRAFFIC_CURVE = {
    0: 0.05,   # Midnight
    1: 0.05,
    2: 0.05,
    3: 0.05,
    4: 0.1,
    5: 0.2,
    6: 0.5,    # Early morning ramp
    7: 1.5,    # Morning rush starts
    8: 3.5,    # Peak morning rush
    9: 3.0,
    10: 1.5,
    11: 1.2,
    12: 2.0,   # Lunch spike
    13: 1.8,
    14: 1.2,
    15: 1.5,
    16: 2.5,   # Afternoon rush starts
    17: 4.0,   # Peak evening rush
    18: 3.5,
    19: 2.0,
    20: 1.2,
    21: 0.8,
    22: 0.4,
    23: 0.1,   # Late night
}

PLATE_PREFIXES = ["LHR", "ISB", "KHI", "PES", "QTA", "MUL", "FSD"]
EVENT_SEQUENCES = {
    "ENTRY": ["VEHICLE_ENTRY", "BARRIER_OPEN", "BARRIER_CLOSE"],
    "EXIT": ["VEHICLE_EXIT", "BARRIER_OPEN", "BARRIER_CLOSE"],
    "PAYMENT": ["PAYMENT_COMPLETED"],
    "FAULT": ["FAULT"],
    "RECOVERY": ["RECOVERY"],
}


def get_traffic_multiplier() -> float:
    """Get traffic multiplier for current hour."""
    hour = datetime.now().hour
    return TRAFFIC_CURVE.get(hour, 1.0)


def generate_plate() -> str:
    """Generate a realistic Pakistani license plate."""
    prefix = random.choice(PLATE_PREFIXES)
    number = random.randint(1000, 9999)
    return f"{prefix}-{number}"


def get_event_interval() -> float:
    """
    Calculate seconds until next vehicle event.
    Lower during rush hour, higher at night.
    """
    multiplier = get_traffic_multiplier()
    if multiplier < 0.01:
        return BASE_EVENT_INTERVAL * 100
    interval = BASE_EVENT_INTERVAL / multiplier
    # Add ±20% jitter so events don't all fire at once
    jitter = interval * 0.2
    return interval + random.uniform(-jitter, jitter)


# ============================================================
# MQTT CLIENT (shared across all device tasks)
# ============================================================
class SimulatorMQTTClient:
    def __init__(self):
        self.client = mqtt.Client(
            client_id="fi-simulator",
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2
        )
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.connected = False

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            self.connected = True
            logger.info(f"Simulator connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
        else:
            logger.error(f"Simulator connection failed: {reason_code}")

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        self.connected = False
        if reason_code != 0:
            logger.warning("Simulator disconnected unexpectedly")

    def connect(self):
        self.client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        self.client.loop_start()

    def publish(self, topic: str, payload: dict, qos: int = 1):
        if self.connected:
            self.client.publish(
                topic,
                json.dumps(payload),
                qos=qos
            )

    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()


# ============================================================
# DEVICE SIMULATOR TASKS
# ============================================================
async def simulate_heartbeat(
    device: dict,
    mqtt_client: SimulatorMQTTClient,
    speed: float,
    faulted_devices: set,
):
    """
    Publishes heartbeats for one device every HEARTBEAT_INTERVAL seconds.
    If device is in faulted_devices set, stops publishing (simulates offline).
    """
    device_code = device['code']
    facility_code = device['facility_code']
    topic = f"facility/{facility_code}/device/{device_code}/heartbeat"

    # Simulate different firmware versions per device type
    firmware_map = {
        'BARRIER_GATE': 'v3.2.1',
        'LPR_CAMERA': 'v2.1.0',
        'KIOSK': 'v4.0.2',
        'INTERCOM': 'v1.2.0',
        'TICKET_DISPENSER': 'v1.5.3',
        'SENSOR': 'v1.0.5',
    }

    cycle_count = random.randint(500, 5000)

    while True:
        interval = HEARTBEAT_INTERVAL / speed

        if device_code in faulted_devices:
            # Device is faulted — don't publish heartbeat
            # (monitoring will detect timeout and mark offline)
            logger.debug(f"[FAULT] {device_code} skipping heartbeat")
        else:
            # Build device-specific metrics
            metrics = {}
            error_codes = []

            if device['device_type'] == 'BARRIER_GATE':
                cycle_count += random.randint(0, 3)
                metrics = {
                    "cycle_count": cycle_count,
                    "last_cycle_ms": random.randint(1800, 3200),
                }
                # 2% chance of a minor fault
                if random.random() < 0.02:
                    error_codes = ["E_SLOW_CYCLE"]

            elif device['device_type'] == 'LPR_CAMERA':
                metrics = {
                    "read_rate_per_min": random.randint(8, 15),
                    "plate_read_success_pct": round(random.uniform(92, 99), 1),
                    "fps": random.randint(28, 30),
                }

            elif device['device_type'] == 'KIOSK':
                metrics = {
                    "transaction_success_pct": round(random.uniform(96, 99.5), 1),
                    "transactions_today": random.randint(50, 300),
                }

            elif device['device_type'] == 'INTERCOM':
                metrics = {
                    "call_connect_success_pct": round(random.uniform(95, 99), 1),
                    "calls_today": random.randint(5, 40),
                }

            payload = {
                "device_code": device_code,
                "facility_code": facility_code,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "firmware_version": firmware_map.get(device['device_type'], 'v1.0.0'),
                "error_codes": error_codes,
                "metrics": metrics,
            }

            mqtt_client.publish(topic, payload, qos=0)
            logger.debug(f"Heartbeat: {device_code} @ {facility_code}")

        await asyncio.sleep(interval)


async def simulate_vehicle_events(
    device: dict,
    mqtt_client: SimulatorMQTTClient,
    speed: float,
    faulted_devices: set,
):
    """
    Publishes vehicle events for entry/exit lane devices.
    Only barrier gates and LPR cameras generate vehicle events.
    Event frequency follows the traffic curve.
    """
    device_code = device['code']
    facility_code = device['facility_code']
    device_type = device['device_type']
    lane_type = device['lane_type']

    # Only traffic-generating devices produce vehicle events
    if device_type not in ('BARRIER_GATE', 'LPR_CAMERA', 'TICKET_DISPENSER'):
        return

    topic = f"facility/{facility_code}/device/{device_code}/event"

    while True:
        interval = get_event_interval() / speed
        await asyncio.sleep(interval)

        if device_code in faulted_devices:
            continue

        # Determine event type based on lane type
        if lane_type == 'ENTRY':
            event_type = 'VEHICLE_ENTRY'
        elif lane_type == 'EXIT':
            event_type = 'VEHICLE_EXIT'
        elif lane_type == 'PAY':
            event_type = random.choice(
                ['PAYMENT_COMPLETED'] * 19 + ['PAYMENT_FAILED']
            )
        else:
            event_type = random.choice(['VEHICLE_ENTRY', 'VEHICLE_EXIT'])

        payload = {
            "device_code": device_code,
            "facility_code": facility_code,
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "plate_number": generate_plate() if device_type == 'LPR_CAMERA' else None,
            "duration_ms": random.randint(1200, 4500),
            "metadata": {
                "simulated": True,
                "traffic_multiplier": get_traffic_multiplier(),
            }
        }

        mqtt_client.publish(topic, payload, qos=1)
        logger.debug(f"Event: {event_type} from {device_code}")


async def chaos_injector(faulted_devices: set, all_device_codes: list):
    """
    Randomly faults and recovers devices to test monitoring.
    Only active in chaos mode.
    """
    while True:
        await asyncio.sleep(random.randint(60, 180))

        if random.random() < 0.3 and len(faulted_devices) < 3:
            # Fault a random device
            device = random.choice(all_device_codes)
            faulted_devices.add(device)
            logger.warning(f"[CHAOS] Faulted device: {device}")

        elif faulted_devices and random.random() < 0.5:
            # Recover a faulted device
            device = random.choice(list(faulted_devices))
            faulted_devices.discard(device)
            logger.info(f"[CHAOS] Recovered device: {device}")


# ============================================================
# DATABASE — Load Devices
# ============================================================
def load_devices_from_db() -> list[dict]:
    """
    Load all active devices with their hierarchy context from PostgreSQL.
    Uses synchronous psycopg3 — this runs once at startup.
    """
    conn_str = DB_URL.replace("postgresql://", "")

    try:
        with psycopg.connect(DB_URL, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        d.id,
                        d.code,
                        d.name,
                        d.device_type,
                        d.heartbeat_timeout_seconds,
                        f.code AS facility_code,
                        f.name AS facility_name,
                        a.code AS area_code,
                        l.code AS lane_code,
                        l.lane_type
                    FROM hierarchy_device d
                    JOIN hierarchy_lane l ON d.lane_id = l.id
                    JOIN hierarchy_area a ON l.area_id = a.id
                    JOIN hierarchy_facility f ON a.facility_id = f.id
                    WHERE d.is_active = true
                    ORDER BY f.code, d.code
                """)
                devices = cur.fetchall()
                return [dict(d) for d in devices]
    except Exception as e:
        logger.error(f"Failed to load devices from database: {e}")
        raise


# ============================================================
# MAIN
# ============================================================
async def run_simulator(
    mode: str = "normal",
    speed: float = 1.0,
    fault_device: Optional[str] = None,
):
    """Main simulator entry point."""

    logger.info("=" * 60)
    logger.info("  Facility Intelligence — Device Simulator")
    logger.info("=" * 60)
    logger.info(f"  Mode  : {mode}")
    logger.info(f"  Speed : {speed}x")
    logger.info(f"  Broker: {MQTT_HOST}:{MQTT_PORT}")
    logger.info("=" * 60)

    # Load devices from database
    logger.info("Loading devices from database...")
    devices = load_devices_from_db()
    logger.info(f"Loaded {len(devices)} active devices")

    if not devices:
        logger.error("No devices found. Run seed script first.")
        return

    # Print device summary
    for d in devices:
        logger.info(
            f"  [{d['facility_code']}] {d['code']} — "
            f"{d['device_type']} ({d['lane_type']})"
        )

    # Set up faulted devices
    faulted_devices = set()
    if fault_device:
        faulted_devices.add(fault_device)
        logger.warning(f"Device '{fault_device}' pre-faulted")

    # Connect MQTT
    mqtt_client = SimulatorMQTTClient()
    mqtt_client.connect()

    # Wait for connection
    await asyncio.sleep(2)

    if not mqtt_client.connected:
        logger.error("Could not connect to MQTT broker. Is Mosquitto running?")
        return

    logger.info(f"Starting simulation for {len(devices)} devices...")
    logger.info(
        f"Traffic multiplier right now: "
        f"{get_traffic_multiplier()}x "
        f"(hour={datetime.now().hour})"
    )

    # Create async tasks for every device
    tasks = []
    all_codes = [d['code'] for d in devices]

    for device in devices:
        # Add small random delay so devices don't all publish simultaneously
        await asyncio.sleep(random.uniform(0.1, 2.0))

        tasks.append(asyncio.create_task(
            simulate_heartbeat(device, mqtt_client, speed, faulted_devices)
        ))
        tasks.append(asyncio.create_task(
            simulate_vehicle_events(device, mqtt_client, speed, faulted_devices)
        ))

    # Add chaos injector if in chaos mode
    if mode == "chaos":
        tasks.append(asyncio.create_task(
            chaos_injector(faulted_devices, all_codes)
        ))
        logger.warning("CHAOS MODE active — random faults will be injected")

    logger.info(f"Running {len(tasks)} async tasks. Press Ctrl+C to stop.")

    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        pass
    except asyncio.CancelledError:
        pass
    finally:
        logger.info("Shutting down simulator...")
        for task in tasks:
            task.cancel()
        mqtt_client.disconnect()
        logger.info("Simulator stopped.")


def main():
    parser = argparse.ArgumentParser(
        description="Facility Intelligence Device Simulator"
    )
    parser.add_argument(
        "--mode",
        choices=["normal", "chaos"],
        default="normal",
        help="Simulation mode"
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=1.0,
        help="Time speed multiplier (e.g. 6 = 6x faster)"
    )
    parser.add_argument(
        "--fault",
        type=str,
        default=None,
        help="Device code to pre-fault (e.g. BG-01)"
    )
    args = parser.parse_args()

    asyncio.run(run_simulator(
        mode=args.mode,
        speed=args.speed,
        fault_device=args.fault,
    ))


if __name__ == "__main__":
    main()