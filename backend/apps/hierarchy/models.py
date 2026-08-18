"""
Hierarchy models — the core domain of the platform.

Physical structure:
    Facility → Area → Lane → Device

Every other part of the system (monitoring, alerts, ML)
references this hierarchy.
"""

import uuid
from django.db import models
from django.contrib.auth.models import User


class TimeStampedModel(models.Model):
    """
    Abstract base class that adds created_at and updated_at
    to every model that inherits from it.

    'Abstract' means Django does NOT create a table for this
    class itself — it just adds these fields to child models.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Facility(TimeStampedModel):
    """
    Top level of the hierarchy.
    Represents one physical parking site — a garage,
    a campus, a surface lot, etc.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this facility"
    )
    name = models.CharField(
        max_length=255,
        help_text="Human-readable name, e.g. 'Downtown Garage'"
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Short unique code used in MQTT topics, e.g. 'DG-01'"
    )
    address = models.TextField(
        blank=True,
        help_text="Physical address of the facility"
    )
    total_capacity = models.PositiveIntegerField(
        default=0,
        help_text="Total vehicle capacity across all areas"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive facilities are hidden from dashboards"
    )
    timezone = models.CharField(
        max_length=50,
        default='UTC',
        help_text="Local timezone for this facility, e.g. 'Asia/Karachi'"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Flexible key-value store for facility-specific config"
    )

    class Meta:
        verbose_name = 'Facility'
        verbose_name_plural = 'Facilities'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Area(TimeStampedModel):
    """
    Second level of the hierarchy.
    A physical zone within a facility — a level, a wing,
    a campus building, etc.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name='areas',
        help_text="The facility this area belongs to"
    )
    name = models.CharField(
        max_length=255,
        help_text="e.g. 'Level 2', 'Zone B', 'Building C'"
    )
    code = models.CharField(
        max_length=50,
        help_text="Short code used in MQTT topics, e.g. 'L2'"
    )
    capacity = models.PositiveIntegerField(
        default=0,
        help_text="Vehicle capacity for this area"
    )
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Area'
        verbose_name_plural = 'Areas'
        ordering = ['facility', 'name']
        # Two areas in the same facility cannot share the same code
        unique_together = [['facility', 'code']]

    def __str__(self):
        return f"{self.facility.code} / {self.name}"


class Lane(TimeStampedModel):
    """
    Third level of the hierarchy.
    A single entry, exit, or pay lane within an area.
    """

    class LaneType(models.TextChoices):
        ENTRY = 'ENTRY', 'Entry'
        EXIT = 'EXIT', 'Exit'
        PAY = 'PAY', 'Pay Station'
        ENTRY_EXIT = 'ENTRY_EXIT', 'Bi-directional'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name='lanes',
        help_text="The area this lane belongs to"
    )
    name = models.CharField(
        max_length=255,
        help_text="e.g. 'Entry Lane 3', 'Exit Lane 1'"
    )
    code = models.CharField(
        max_length=50,
        help_text="Short code used in MQTT topics, e.g. 'EL-3'"
    )
    lane_type = models.CharField(
        max_length=20,
        choices=LaneType.choices,
        default=LaneType.ENTRY,
        help_text="Whether vehicles enter, exit, or pay here"
    )
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Lane'
        verbose_name_plural = 'Lanes'
        ordering = ['area', 'name']
        unique_together = [['area', 'code']]

    def __str__(self):
        return f"{self.area} / {self.name}"

    @property
    def facility(self):
        """Convenience shortcut: lane.facility instead of lane.area.facility"""
        return self.area.facility


class Device(TimeStampedModel):
    """
    Fourth and lowest level of the hierarchy.
    A physical device attached to a lane.

    Each device type has different rules for what
    'healthy' means — defined in the monitoring app.
    """

    class DeviceType(models.TextChoices):
        BARRIER_GATE = 'BARRIER_GATE', 'Barrier Gate'
        LPR_CAMERA = 'LPR_CAMERA', 'LPR Camera'
        KIOSK = 'KIOSK', 'Payment Kiosk'
        INTERCOM = 'INTERCOM', 'Intercom'
        TICKET_DISPENSER = 'TICKET_DISPENSER', 'Ticket Dispenser'
        SENSOR = 'SENSOR', 'Occupancy Sensor'

    class DeviceStatus(models.TextChoices):
        ONLINE = 'ONLINE', 'Online'
        OFFLINE = 'OFFLINE', 'Offline'
        DEGRADED = 'DEGRADED', 'Degraded'
        MAINTENANCE = 'MAINTENANCE', 'Under Maintenance'
        UNKNOWN = 'UNKNOWN', 'Unknown'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    lane = models.ForeignKey(
        Lane,
        on_delete=models.CASCADE,
        related_name='devices',
        help_text="The lane this device is attached to"
    )
    name = models.CharField(
        max_length=255,
        help_text="e.g. 'Barrier Gate #12', 'LPR Camera #4'"
    )
    code = models.CharField(
        max_length=50,
        help_text="Unique device code — used as MQTT client ID"
    )
    device_type = models.CharField(
        max_length=30,
        choices=DeviceType.choices,
        help_text="Determines which health rules apply to this device"
    )
    serial_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Manufacturer serial number for maintenance records"
    )
    firmware_version = models.CharField(
        max_length=50,
        blank=True,
        help_text="Current firmware version running on device"
    )
    # Current status — updated by the monitoring app
    status = models.CharField(
        max_length=20,
        choices=DeviceStatus.choices,
        default=DeviceStatus.UNKNOWN,
        help_text="Current health status, updated by heartbeat monitor"
    )
    last_heartbeat = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the most recent heartbeat received"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Deactivated devices are excluded from monitoring"
    )
    # Heartbeat timeout threshold — can be customized per device
    heartbeat_timeout_seconds = models.PositiveIntegerField(
        default=60,
        help_text="Seconds without heartbeat before device is marked offline"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Device-specific config: IP address, port, credentials ref, etc."
    )

    class Meta:
        verbose_name = 'Device'
        verbose_name_plural = 'Devices'
        ordering = ['lane', 'name']
        unique_together = [['lane', 'code']]

    def __str__(self):
        return f"{self.name} [{self.get_device_type_display()}] — {self.lane}"

    @property
    def facility(self):
        """Convenience shortcut: device.facility"""
        return self.lane.area.facility

    @property
    def area(self):
        """Convenience shortcut: device.area"""
        return self.lane.area

    @property
    def mqtt_topic_prefix(self):
        """
        Returns the MQTT topic prefix for this device.
        Format: facility/{fcode}/area/{acode}/lane/{lcode}/device/{dcode}
        Used by both the simulator and the ingestion service.
        """
        return (
            f"facility/{self.facility.code}"
            f"/area/{self.area.code}"
            f"/lane/{self.lane.code}"
            f"/device/{self.code}"
        )

class UserProfile(models.Model):
    """
    Extends Django's User with a role and facility assignments.
    One profile per user — created automatically on user creation.
    """

    class Role(models.TextChoices):
        ADMIN            = 'ADMIN',            'Admin'
        REGIONAL_MANAGER = 'REGIONAL_MANAGER', 'Regional Manager'
        FACILITY_OWNER   = 'FACILITY_OWNER',   'Facility Owner'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.FACILITY_OWNER,
    )
    # Facilities this user can access
    facilities = models.ManyToManyField(
        Facility,
        blank=True,
        related_name='user_profiles',
        help_text="Facilities this user has access to. Ignored for Admin role."
    )

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def accessible_facilities(self):
        """Returns queryset of facilities this user can access."""
        if self.is_admin:
            return Facility.objects.filter(is_active=True)
        return self.facilities.filter(is_active=True)