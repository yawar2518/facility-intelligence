from django.urls import path
from .views import DeviceUptimeView, FacilityHealthSummaryView

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
]