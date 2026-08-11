import uuid
from django.db import models
from django.utils import timezone
from apps.hierarchy.models import Device, Lane, Area, Facility

# Create your models here.
class DeviceStatusChange(models.Model):
    """
    One row per status transition.
    ONLINE→OFFLINE, OFFLINE→ONLINE, etc.
    """

    class ChangeReason(models.TextChoices):
        HEARTBEAT_TIMEOUT  = 'HEARTBEAT_TIMEOUT',  'Heartbeat Timeout'
        HEARTBEAT_RECEIVED = 'HEARTBEAT_RECEIVED',  'Heartbeat Received'
        ERROR_CODES_DETECTED = 'ERROR_CODES_DETECTED', 'Error Codes Detected'
        ERROR_CODES_CLEARED  = 'ERROR_CODES_CLEARED',  'Error Codes Cleared'
        MANUAL         = 'MANUAL',         'Manual Override'
        SYSTEM_STARTUP = 'SYSTEM_STARTUP', 'System Startup'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    device   = models.ForeignKey(Device,   on_delete=models.CASCADE, related_name='status_changes')
    lane     = models.ForeignKey(Lane,     on_delete=models.CASCADE, related_name='device_status_changes')
    area     = models.ForeignKey(Area,     on_delete=models.CASCADE, related_name='device_status_changes')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='device_status_changes')

    previous_status = models.CharField(max_length=20, choices=Device.DeviceStatus.choices)
    new_status      = models.CharField(max_length=20, choices=Device.DeviceStatus.choices)
    reason          = models.CharField(max_length=30, choices=ChangeReason.choices)

    changed_at       = models.DateTimeField(default=timezone.now, db_index=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    # ^ How long the device was in previous_status before this change.
    # NULL on the very first status change (nothing to measure from).

    metadata = models.JSONField(default=dict, blank=True)
    # ^ Stores context: seconds since last heartbeat, which error codes, etc.

    class Meta:
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['device', 'changed_at']),
            models.Index(fields=['facility', 'changed_at']),
        ]


class HealthCheckRun(models.Model):
    """
    Audit log — one row each time the heartbeat checker task runs.
    Useful for debugging: did the task run? What did it find?
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    started_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    devices_checked   = models.PositiveIntegerField(default=0)
    devices_timed_out = models.PositiveIntegerField(default=0)
    devices_recovered = models.PositiveIntegerField(default=0)

    errors = models.TextField(blank=True)

    class Meta:
        ordering = ['-started_at']