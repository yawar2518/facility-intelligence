from django.contrib import admin
from .models import Facility, Area, Lane, Device
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import UserProfile

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    extra = 0
    fields = ['role', 'facilities']
    filter_horizontal = ['facilities']


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]


# Re-register User with our custom admin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

class AreaInline(admin.TabularInline):
    """
    Shows areas directly inside the Facility admin page.
    Inline = child records displayed within the parent's page.
    """
    model = Area
    extra = 0                    # Don't show empty placeholder rows
    fields = ['name', 'code', 'capacity', 'is_active']
    show_change_link = True      # Link to the Area's own edit page


class LaneInline(admin.TabularInline):
    model = Lane
    extra = 0
    fields = ['name', 'code', 'lane_type', 'is_active']
    show_change_link = True


class DeviceInline(admin.TabularInline):
    model = Device
    extra = 0
    fields = ['name', 'code', 'device_type', 'status', 'last_heartbeat', 'is_active']
    show_change_link = True
    readonly_fields = ['last_heartbeat', 'status']


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'total_capacity', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'address']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [AreaInline]           # Areas shown inside Facility page

    fieldsets = [
        ('Identity', {
            'fields': ['id', 'name', 'code', 'address']
        }),
        ('Configuration', {
            'fields': ['total_capacity', 'timezone', 'is_active']
        }),
        ('Metadata', {
            'fields': ['metadata'],
            'classes': ['collapse']  # Collapsed by default — advanced section
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'facility', 'capacity', 'is_active']
    list_filter = ['is_active', 'facility']
    search_fields = ['name', 'code', 'facility__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [LaneInline]


@admin.register(Lane)
class LaneAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'area', 'lane_type', 'is_active']
    list_filter = ['is_active', 'lane_type', 'area__facility']
    search_fields = ['name', 'code']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [DeviceInline]


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'device_type', 'status',
        'last_heartbeat', 'lane', 'is_active'
    ]
    list_filter = ['is_active', 'device_type', 'status', 'lane__area__facility']
    search_fields = ['name', 'code', 'serial_number']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_heartbeat', 'status']

    fieldsets = [
        ('Identity', {
            'fields': ['id', 'name', 'code', 'device_type', 'lane']
        }),
        ('Hardware', {
            'fields': ['serial_number', 'firmware_version']
        }),
        ('Status', {
            'fields': ['status', 'last_heartbeat', 'heartbeat_timeout_seconds', 'is_active']
        }),
        ('Metadata', {
            'fields': ['metadata'],
            'classes': ['collapse']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]