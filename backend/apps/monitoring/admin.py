from django.contrib import admin
from .models import DeviceStatusChange, HealthCheckRun, MaintenanceScore


@admin.register(DeviceStatusChange)
class DeviceStatusChangeAdmin(admin.ModelAdmin):
    list_display  = ['device', 'previous_status', 'new_status', 'reason', 'changed_at']
    list_filter   = ['reason', 'new_status', 'facility']
    ordering      = ['-changed_at']
    readonly_fields = ['id', 'changed_at']


@admin.register(HealthCheckRun)
class HealthCheckRunAdmin(admin.ModelAdmin):
    list_display  = ['started_at', 'completed_at', 'devices_checked',
                     'devices_timed_out', 'devices_recovered']
    ordering      = ['-started_at']
    readonly_fields = ['id', 'started_at']


@admin.register(MaintenanceScore)
class MaintenanceScoreAdmin(admin.ModelAdmin):
    list_display  = ['device', 'risk_level', 'risk_score', 'computed_at']
    list_filter   = ['risk_level']
    ordering      = ['-computed_at', '-risk_score']
    readonly_fields = ['id', 'computed_at']