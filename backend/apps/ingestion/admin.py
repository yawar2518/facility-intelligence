from django.contrib import admin
from .models import Heartbeat, VehicleEvent


@admin.register(Heartbeat)
class HeartbeatAdmin(admin.ModelAdmin):
    list_display = ['device', 'facility_code', 'timestamp', 'firmware_version', 'error_codes']
    list_filter = ['facility_code']
    ordering = ['-timestamp']
    readonly_fields = ['id', 'timestamp']


@admin.register(VehicleEvent)
class VehicleEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'device', 'lane', 'facility', 'timestamp', 'plate_number']
    list_filter = ['event_type', 'facility']
    ordering = ['-timestamp']
    readonly_fields = ['id', 'timestamp']