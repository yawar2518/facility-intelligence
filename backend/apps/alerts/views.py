from datetime import timedelta

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from apps.core.permissions import FacilityFilterMixin
from .models import AlertLog
from .serializers import AlertLogSerializer, AlertLogCSVSerializer
from apps.core.renderers import CSVRenderer
from django.db import models

class AlertLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = AlertLogSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes   = [JSONRenderer, BrowsableAPIRenderer, CSVRenderer]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['rule', 'status']
    ordering_fields    = ['sent_at']

    def get_queryset(self):
        from apps.core.permissions import get_user_profile

        qs = AlertLog.objects.select_related(
            'rule', 'recipient', 'anomaly'
        ).order_by('-sent_at')

        user = self.request.user
        if user.is_superuser:
            return qs

        profile = get_user_profile(user)
        if not profile or profile.is_admin:
            return qs

        accessible = profile.accessible_facilities
        # Rules with facility=null are global rules — include them for all users
        return qs.filter(
            models.Q(rule__facility__in=accessible) |
            models.Q(rule__facility__isnull=True)
        )

    def get_serializer_class(self):
        if self.request.accepted_renderer.format == 'csv':
            return AlertLogCSVSerializer
        return AlertLogSerializer

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        24h sent/failed tallies for the header stat row. Computed here
        rather than on the frontend because the log list itself is
        paginated (50/page) and can't be summed client-side, and reuses
        the same facility scoping as the list endpoint.
        """
        since = timezone.now() - timedelta(hours=24)
        qs = self.get_queryset().filter(sent_at__gte=since)
        return Response({
            'sent_24h':   qs.filter(status=AlertLog.Status.SENT).count(),
            'failed_24h': qs.filter(status=AlertLog.Status.FAILED).count(),
        })