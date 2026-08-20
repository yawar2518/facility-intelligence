import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class FacilityStatusConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for a single facility's status updates.

    Each browser tab that opens the Status Grid connects here.
    When a device status changes, all connected browsers for
    that facility receive the update instantly.

    URL: ws://localhost:8000/ws/facility/{facility_id}/
    """

    async def connect(self):
        """Called when browser opens a WebSocket connection."""

        # Get facility_id from the URL
        self.facility_id = self.scope['url_route']['kwargs']['facility_id']

        # Each facility has its own channel group
        # All browsers watching the same facility are in the same group
        self.group_name = f"facility_{self.facility_id}"

        # Join the channel group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )

        # Accept the WebSocket connection
        await self.accept()

        logger.info(f"WebSocket connected: facility {self.facility_id}")

    async def disconnect(self, close_code):
        """Called when browser closes the connection."""

        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name,
        )

        logger.info(f"WebSocket disconnected: facility {self.facility_id}")

    async def receive(self, text_data):
        """
        Called when browser sends a message.
        We don't expect messages from the browser for now
        but this method is required.
        """
        pass

    async def device_status_update(self, event):
        """
        Called when Celery broadcasts a status change to this group.
        Forwards the update to the browser.

        event shape:
        {
            'type': 'device_status_update',
            'change_id': '...',
            'device_id': '...',
            'device_code': '...',
            'new_status': 'OFFLINE',
            'previous_status': 'ONLINE',
            'reason': 'HEARTBEAT_TIMEOUT',
            'changed_at': '...',
            'duration_seconds': 123.4,
            'metadata': {...},
            'facility_name': '...',
            'area_name': '...',
            'lane_name': '...',
        }
        """
        # Send the update to the browser as JSON
        await self.send(text_data=json.dumps({
            'kind': 'device_status',
            'change_id': event.get('change_id'),
            'device_id': event['device_id'],
            'device_code': event['device_code'],
            'new_status': event['new_status'],
            'previous_status': event['previous_status'],
            'reason': event['reason'],
            'changed_at': event['changed_at'],
            'duration_seconds': event.get('duration_seconds'),
            'metadata': event.get('metadata') or {},
            'facility_name': event.get('facility_name'),
            'area_name': event.get('area_name'),
            'lane_name': event.get('lane_name'),
        }))

    async def anomaly_created(self, event):
        """
        Called when a detection task broadcasts a newly-created anomaly to
        this group. Forwards it so the Anomalies page and nav badge can
        pick it up live, with no reload or poll delay.

        event shape:
        {
            'type': 'anomaly_created',
            'anomaly_id': '...',
            'anomaly_type': 'TRAFFIC_DROP',
            'severity': 'CRITICAL',
            'sigma_score': 4.2,
            'explanation': '...',
            'detected_at': '...',
            'facility_name': '...',
            'facility_code': '...',
            'area_name': '...',
            'lane_name': '...',
        }
        """
        await self.send(text_data=json.dumps({
            'kind': 'anomaly_created',
            'anomaly_id': event['anomaly_id'],
            'anomaly_type': event['anomaly_type'],
            'severity': event['severity'],
            'sigma_score': event.get('sigma_score'),
            'explanation': event.get('explanation'),
            'detected_at': event.get('detected_at'),
            'facility_id': event.get('facility_id'),
            'facility_name': event.get('facility_name'),
            'facility_code': event.get('facility_code'),
            'area_name': event.get('area_name'),
            'lane_name': event.get('lane_name'),
        }))

    async def anomaly_acknowledged(self, event):
        """
        Called when an operator acknowledges an anomaly (from any browser
        tab). Forwards it so every connected client's unacknowledged count
        drops live, not just the tab that clicked Acknowledge.

        event shape:
        {
            'type': 'anomaly_acknowledged',
            'anomaly_id': '...',
        }
        """
        await self.send(text_data=json.dumps({
            'kind': 'anomaly_acknowledged',
            'anomaly_id': event['anomaly_id'],
        }))

    async def alert_log_created(self, event):
        """
        Called when the rules engine writes a new AlertLog (an alert send
        that succeeded or failed). Forwards it so the Alert Logs page can
        prepend the row and update its 24h sent/failed tally live.

        event shape:
        {
            'type': 'alert_log_created',
            'id': '...',
            'status': 'SENT' | 'FAILED',
            'error_message': '...',
            'sent_at': '...',
            'rule': {'id': ..., 'name': ..., 'min_severity': ..., 'anomaly_type': ...},
            'recipient': {'id': ..., 'name': ..., 'email': ..., 'channel': ...},
            'anomaly': '...' | None,
        }
        """
        await self.send(text_data=json.dumps({
            'kind': 'alert_log_created',
            'id': event['id'],
            'status': event['status'],
            'error_message': event.get('error_message', ''),
            'sent_at': event.get('sent_at'),
            'rule': event.get('rule'),
            'recipient': event.get('recipient'),
            'anomaly': event.get('anomaly'),
        }))