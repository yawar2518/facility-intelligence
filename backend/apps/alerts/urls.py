from rest_framework.routers import DefaultRouter
from .views import AlertLogViewSet

router = DefaultRouter()
router.register(r'alert-logs', AlertLogViewSet, basename='alert-log')

urlpatterns = router.urls