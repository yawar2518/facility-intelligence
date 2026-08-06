"""
Hierarchy serializers.

Two tiers per model:
  *ListSerializer  — lightweight, for collection endpoints
  *DetailSerializer — full nested data, for single-record endpoints
"""

from rest_framework import serializers
from .models import Facility, Area, Lane, Device


# ============================================================
# DEVICE
# ============================================================
class DeviceListSerializer(serializers.ModelSerializer):
    device_type_display = serializers.CharField(
        source='get_device_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Device
        fields = [
            'id', 'name', 'code', 'device_type', 'device_type_display',
            'status', 'status_display', 'last_heartbeat',
            'heartbeat_timeout_seconds', 'is_active',
        ]


class DeviceDetailSerializer(serializers.ModelSerializer):
    device_type_display = serializers.CharField(
        source='get_device_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    mqtt_topic_prefix = serializers.CharField(read_only=True)

    class Meta:
        model = Device
        fields = [
            'id', 'name', 'code', 'device_type', 'device_type_display',
            'serial_number', 'firmware_version',
            'status', 'status_display', 'last_heartbeat',
            'heartbeat_timeout_seconds', 'is_active',
            'mqtt_topic_prefix', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_heartbeat']


# ============================================================
# LANE
# ============================================================
class LaneListSerializer(serializers.ModelSerializer):
    lane_type_display = serializers.CharField(
        source='get_lane_type_display',
        read_only=True
    )
    device_count = serializers.IntegerField(
        source='devices.count',
        read_only=True
    )

    class Meta:
        model = Lane
        fields = [
            'id', 'name', 'code', 'lane_type', 'lane_type_display',
            'device_count', 'is_active',
        ]


class LaneDetailSerializer(serializers.ModelSerializer):
    lane_type_display = serializers.CharField(
        source='get_lane_type_display',
        read_only=True
    )
    devices = DeviceListSerializer(many=True, read_only=True)

    class Meta:
        model = Lane
        fields = [
            'id', 'name', 'code', 'lane_type', 'lane_type_display',
            'is_active', 'metadata', 'devices',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================================
# AREA
# ============================================================
class AreaListSerializer(serializers.ModelSerializer):
    lane_count = serializers.IntegerField(
        source='lanes.count',
        read_only=True
    )

    class Meta:
        model = Area
        fields = [
            'id', 'name', 'code', 'capacity',
            'lane_count', 'is_active',
        ]


class AreaDetailSerializer(serializers.ModelSerializer):
    lanes = LaneListSerializer(many=True, read_only=True)

    class Meta:
        model = Area
        fields = [
            'id', 'name', 'code', 'capacity',
            'is_active', 'metadata', 'lanes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================================
# FACILITY
# ============================================================
class FacilityListSerializer(serializers.ModelSerializer):
    area_count = serializers.IntegerField(
        source='areas.count',
        read_only=True
    )

    class Meta:
        model = Facility
        fields = [
            'id', 'name', 'code', 'address',
            'total_capacity', 'area_count', 'is_active', 'timezone',
        ]


class FacilityDetailSerializer(serializers.ModelSerializer):
    areas = AreaListSerializer(many=True, read_only=True)

    class Meta:
        model = Facility
        fields = [
            'id', 'name', 'code', 'address',
            'total_capacity', 'timezone', 'is_active',
            'metadata', 'areas',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']