"""
MQTT Test Publisher — bypasses PowerShell quoting issues.
Run this instead of mosquitto_pub for testing on Windows.
"""

import json
import paho.mqtt.client as mqtt

BROKER_HOST = "localhost"
BROKER_PORT = 1883

client = mqtt.Client(
    client_id="fi-test-publisher",
    callback_api_version=mqtt.CallbackAPIVersion.VERSION2
)
client.connect(BROKER_HOST, BROKER_PORT)

# Test heartbeat
heartbeat = {
    "device_code": "BG-01",
    "facility_code": "DG-01",
    "timestamp": "2026-08-05T12:00:00Z",
    "firmware_version": "v3.2.1",
    "error_codes": [],
    "metrics": {"cycle_count": 1500}
}

result = client.publish(
    topic="facility/DG-01/device/BG-01/heartbeat",
    payload=json.dumps(heartbeat),
    qos=1
)
print(f"Heartbeat published — result: {result.rc}")

# Test vehicle event
event = {
    "device_code": "LPR-01",
    "facility_code": "DG-01",
    "event_type": "VEHICLE_ENTRY",
    "timestamp": "2026-08-05T12:05:00Z",
    "plate_number": "LHR-5678",
    "duration_ms": 2100,
    "metadata": {"confidence": 0.97}
}

result = client.publish(
    topic="facility/DG-01/device/LPR-01/event",
    payload=json.dumps(event),
    qos=1
)
print(f"Vehicle event published — result: {result.rc}")

client.disconnect()
print("Done.")