from rest_framework.routers import DefaultRouter
from .views import FacilityViewSet, AreaViewSet, LaneViewSet, DeviceViewSet

router = DefaultRouter()
router.register(r'facilities', FacilityViewSet, basename='facility')
router.register(r'areas', AreaViewSet, basename='area')
router.register(r'lanes', LaneViewSet, basename='lane')
router.register(r'devices', DeviceViewSet, basename='device')

urlpatterns = router.urls