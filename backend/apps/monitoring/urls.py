from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AreaHealthView, DeviceUptimeView, FacilityHealthSummaryView,
    FacilityDeviceTreeView, FacilityStatusChangesView,
    MaintenanceScoreViewSet, FacilitySLAView, FacilityPlaybackView
)

router = DefaultRouter()
router.register(r'maintenance-scores', MaintenanceScoreViewSet, basename='maintenance-score')

urlpatterns = [
    path('', include(router.urls)),
    path(
    'facilities/sla/',
    FacilitySLAView.as_view(),
    name='facility-sla',
    ),
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

    path(
        'facilities/<uuid:facility_id>/playback/',
        FacilityPlaybackView.as_view(),
        name='facility-playback'
    ),

]