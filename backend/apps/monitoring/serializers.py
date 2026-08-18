from rest_framework import serializers
from .models import MaintenanceScore


class MaintenanceScoreSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_code = serializers.CharField(source='device.code', read_only=True)
    device_type = serializers.CharField(source='device.device_type', read_only=True)
    facility    = serializers.CharField(source='device.lane.area.facility.name', read_only=True)

    class Meta:
        model  = MaintenanceScore
        fields = [
            'id', 'device_name', 'device_code', 'device_type',
            'facility', 'risk_score', 'risk_level', 'explanation', 'computed_at',
        ]