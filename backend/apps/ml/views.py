from django.shortcuts import render

# Create your views here.
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncHour
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from django_filters.rest_framework import DjangoFilterBackend
from .models import Anomaly, Forecast
from .serializers import AnomalySerializer, ForecastSerializer
from apps.core.renderers import CSVRenderer

logger = logging.getLogger(__name__)


class AnomalyViewSet(viewsets.ReadOnlyModelViewSet):
    facility_field = 'facility'
    """
    Read-only endpoints for detected anomalies.
    Supports filtering by facility, severity, type, and acknowledgement.
    Add ?format=csv to download as CSV.

    List:   GET /api/v1/ml/anomalies/
    Detail: GET /api/v1/ml/anomalies/{id}/
    """
    def get_queryset(self):
        from apps.core.permissions import get_user_profile

        qs = Anomaly.objects.select_related(
            'facility', 'lane'
        ).order_by('-detected_at')

        user = self.request.user
        if user.is_superuser:
            return qs

        profile = get_user_profile(user)
        if not profile or profile.is_admin:
            return qs

        accessible = profile.accessible_facilities
        return qs.filter(facility__in=accessible)

    serializer_class   = AnomalySerializer
    permission_classes = [IsAuthenticated]
    renderer_classes   = [JSONRenderer, BrowsableAPIRenderer, CSVRenderer]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = [
        'facility', 'anomaly_type', 'severity', 'is_acknowledged'
    ]
    ordering_fields = ['detected_at', 'severity', 'sigma_score']

    @action(detail=True, methods=['post'], url_path='acknowledge')
    def acknowledge(self, request, pk=None):
        """
        POST /api/v1/ml/anomalies/{id}/acknowledge/
        Marks an anomaly as acknowledged by an operator.
        """
        anomaly = self.get_object()

        if anomaly.is_acknowledged:
            return Response(
                {'detail': 'Already acknowledged.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        anomaly.is_acknowledged = True
        anomaly.acknowledged_at = timezone.now()
        anomaly.save(update_fields=['is_acknowledged', 'acknowledged_at'])

        # Broadcast so every connected client's unacknowledged count drops
        # live — not just whichever tab clicked Acknowledge.
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"facility_{str(anomaly.facility_id)}",
                {
                    'type': 'anomaly_acknowledged',  # maps to consumer method name
                    'anomaly_id': str(anomaly.id),
                }
            )
        except Exception as e:
            logger.warning(f"Anomaly-acknowledged WebSocket broadcast failed: {e}")

        logger.info(f"Anomaly {anomaly.id} acknowledged")
        return Response(AnomalySerializer(anomaly).data)


class ForecastViewSet(viewsets.ReadOnlyModelViewSet):
    facility_field = 'facility'
    # rest of the class unchanged
    """
    Read-only endpoints for Prophet lane forecasts.
    Add ?format=csv to download as CSV.

    List:   GET /api/v1/ml/forecasts/
    Detail: GET /api/v1/ml/forecasts/{id}/
    """
    serializer_class   = ForecastSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes   = [JSONRenderer, BrowsableAPIRenderer, CSVRenderer]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['facility', 'lane']
    ordering_fields    = ['forecast_for', 'predicted']
    ordering           = ['forecast_for']

    def get_queryset(self):
        from apps.core.permissions import get_user_profile
        from django.utils import timezone

        qs = Forecast.objects.select_related(
            'facility', 'lane'
        ).filter(
            forecast_for__gte=timezone.now()
        ).order_by('lane', 'forecast_for')

        user = self.request.user
        if user.is_superuser:
            return qs

        profile = get_user_profile(user)
        if not profile or profile.is_admin:
            return qs

        accessible = profile.accessible_facilities
        return qs.filter(facility__in=accessible)

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """
        GET /api/v1/ml/forecasts/history/?lane=<id>&hours=12

        Hourly actual vehicle-event counts for a lane over the trailing
        window — pairs with the forecast list to show past vs. predicted
        traffic in one continuous chart.
        """
        from apps.hierarchy.models import Lane
        from apps.ingestion.models import VehicleEvent
        from apps.monitoring.views import check_facility_access

        lane_id = request.query_params.get('lane')
        if not lane_id:
            return Response({'error': 'lane query param is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lane = Lane.objects.select_related('area__facility').get(pk=lane_id)
        except (Lane.DoesNotExist, ValueError):
            return Response({'error': 'Lane not found'}, status=status.HTTP_404_NOT_FOUND)

        if not check_facility_access(request.user, lane.area.facility_id):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        try:
            hours = int(request.query_params.get('hours', 12))
            hours = max(1, min(hours, 72))
        except ValueError:
            hours = 12

        since = timezone.now() - timedelta(hours=hours)
        rows = (
            VehicleEvent.objects
            .filter(lane_id=lane_id, timestamp__gte=since)
            .annotate(hour=TruncHour('timestamp'))
            .values('hour')
            .annotate(count=Count('record_id'))
            .order_by('hour')
        )

        return Response([
            {'hour': row['hour'].isoformat(), 'count': row['count']}
            for row in rows
        ])