from rest_framework import serializers
from .models import Anomaly


class AnomalySerializer(serializers.ModelSerializer):
    anomaly_type_display = serializers.CharField(
        source='get_anomaly_type_display', read_only=True
    )
    severity_display = serializers.CharField(
        source='get_severity_display', read_only=True
    )
    lane_name     = serializers.CharField(source='lane.name', read_only=True)
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    facility_code = serializers.CharField(source='facility.code', read_only=True)

    class Meta:
        model  = Anomaly
        fields = [
            'id',
            'facility', 'facility_name', 'facility_code',
            'lane', 'lane_name',
            'anomaly_type', 'anomaly_type_display',
            'severity', 'severity_display',
            'observed_value', 'baseline_value', 'std_dev', 'sigma_score',
            'explanation',
            'detected_at', 'window_start', 'window_end',
            'is_acknowledged', 'acknowledged_at',
        ]
        read_only_fields = [
            'id', 'detected_at', 'facility_name', 'facility_code', 'lane_name'
        ]