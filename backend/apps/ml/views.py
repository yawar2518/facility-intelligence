from django.shortcuts import render

# Create your views here.
import logging
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Anomaly
from .serializers import AnomalySerializer

logger = logging.getLogger(__name__)


class AnomalyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only endpoints for detected anomalies.
    Supports filtering by facility, severity, type, and acknowledgement.

    List:   GET /api/v1/ml/anomalies/
    Detail: GET /api/v1/ml/anomalies/{id}/
    """
    queryset = Anomaly.objects.select_related(
        'facility', 'lane'
    ).order_by('-detected_at')

    serializer_class   = AnomalySerializer
    permission_classes = [IsAuthenticated]
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

        logger.info(f"Anomaly {anomaly.id} acknowledged")
        return Response(AnomalySerializer(anomaly).data)