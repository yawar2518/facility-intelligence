"""
Hierarchy API ViewSets.

Each ViewSet handles CRUD for one model.
Uses different serializers for list vs detail actions.
"""

from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Facility, Area, Lane, Device
from .serializers import (
    FacilityListSerializer, FacilityDetailSerializer,
    AreaListSerializer, AreaDetailSerializer,
    LaneListSerializer, LaneDetailSerializer,
    DeviceListSerializer, DeviceDetailSerializer,
)


class FacilityViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Facilities.

    List:   GET  /api/v1/facilities/
    Detail: GET  /api/v1/facilities/{id}/
    Create: POST /api/v1/facilities/
    Update: PUT  /api/v1/facilities/{id}/
    Delete: DEL  /api/v1/facilities/{id}/
    """
    queryset = Facility.objects.all().order_by('name')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'address']
    ordering_fields = ['name', 'created_at', 'total_capacity']

    def get_serializer_class(self):
        """Use lightweight serializer for lists, full serializer for detail."""
        if self.action == 'list':
            return FacilityListSerializer
        return FacilityDetailSerializer


class AreaViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for Areas, filterable by facility."""
    queryset = Area.objects.select_related('facility').order_by('facility', 'name')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['facility', 'is_active']
    search_fields = ['name', 'code']

    def get_serializer_class(self):
        if self.action == 'list':
            return AreaListSerializer
        return AreaDetailSerializer


class LaneViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for Lanes, filterable by area and lane type."""
    queryset = Lane.objects.select_related('area__facility').order_by('area', 'name')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['area', 'lane_type', 'is_active']
    search_fields = ['name', 'code']

    def get_serializer_class(self):
        if self.action == 'list':
            return LaneListSerializer
        return LaneDetailSerializer


class DeviceViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for Devices, filterable by lane, type, and status."""
    queryset = Device.objects.select_related(
        'lane__area__facility'
    ).order_by('lane', 'name')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['lane', 'device_type', 'status', 'is_active']
    search_fields = ['name', 'code', 'serial_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return DeviceListSerializer
        return DeviceDetailSerializer