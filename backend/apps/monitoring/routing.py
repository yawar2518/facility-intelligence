from django.urls import re_path
from .consumers import FacilityStatusConsumer

websocket_urlpatterns = [
    re_path(
        r'ws/facility/(?P<facility_id>[0-9a-f-]+)/$',
        FacilityStatusConsumer.as_asgi(),
    ),
]