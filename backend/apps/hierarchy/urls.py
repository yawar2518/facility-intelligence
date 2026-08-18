from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FacilityViewSet, AreaViewSet, LaneViewSet, DeviceViewSet, CurrentUserView

router = DefaultRouter()
router.register(r'facilities', FacilityViewSet, basename='facility')
router.register(r'areas', AreaViewSet, basename='area')
router.register(r'lanes', LaneViewSet, basename='lane')
router.register(r'devices', DeviceViewSet, basename='device')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
]