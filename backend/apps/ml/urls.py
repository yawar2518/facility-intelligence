from rest_framework.routers import DefaultRouter
from .views import AnomalyViewSet, ForecastViewSet

router = DefaultRouter()
router.register(r'anomalies', AnomalyViewSet, basename='anomaly')
router.register(r'forecasts', ForecastViewSet, basename='forecast')

urlpatterns = router.urls