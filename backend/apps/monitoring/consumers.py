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
            'device_id': '...',
            'device_code': '...',
            'new_status': 'OFFLINE',
            'previous_status': 'ONLINE',
            'reason': 'HEARTBEAT_TIMEOUT',
            'changed_at': '...',
        }
        """
        # Send the update to the browser as JSON
        await self.send(text_data=json.dumps({
            'device_id': event['device_id'],
            'device_code': event['device_code'],
            'new_status': event['new_status'],
            'previous_status': event['previous_status'],
            'reason': event['reason'],
            'changed_at': event['changed_at'],
        }))