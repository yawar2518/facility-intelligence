from django.urls import path
from .views import AreaHealthView, DeviceUptimeView, FacilityHealthSummaryView
from .views import DeviceUptimeView, FacilityHealthSummaryView, FacilityDeviceTreeView
from .views import FacilityStatusChangesView


urlpatterns = [
    path(
        'devices/<uuid:device_id>/uptime/',
        DeviceUptimeView.as_view(),
        name='device-uptime'
    ),
    path(
        'facilities/<uuid:facility_id>/health/',
        FacilityHealthSummaryView.as_view(),
        name='facility-health'
    ),
    path(
    'facilities/<uuid:facility_id>/devices/',
    FacilityDeviceTreeView.as_view(),
    name='facility-device-tree'
    ),
    path(
    'facilities/<uuid:facility_id>/status-changes/',
    FacilityStatusChangesView.as_view(),
    name='facility-status-changes'
    ),
    path(
    'areas/<uuid:area_id>/health/',
    AreaHealthView.as_view(),
    name='area-health'
    ),
]