from django.contrib import admin
from .models import Anomaly


@admin.register(Anomaly)
class AnomalyAdmin(admin.ModelAdmin):
    list_display = [
        'anomaly_type', 'severity', 'lane',
        'sigma_score', 'detected_at', 'is_acknowledged'
    ]
    list_filter  = ['anomaly_type', 'severity', 'is_acknowledged', 'facility']
    ordering     = ['-detected_at']
    readonly_fields = [
        'id', 'detected_at', 'sigma_score',
        'observed_value', 'baseline_value', 'std_dev'
    ]