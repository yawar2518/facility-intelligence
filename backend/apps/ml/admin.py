from django.contrib import admin
from .models import Anomaly
from .models import Anomaly, Forecast

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


@admin.register(Forecast)
class ForecastAdmin(admin.ModelAdmin):
    list_display = [
        'lane', 'facility', 'forecast_for',
        'predicted', 'predicted_low', 'predicted_high', 'generated_at'
    ]
    list_filter  = ['facility']
    ordering     = ['-forecast_for']
    readonly_fields = ['id', 'generated_at']