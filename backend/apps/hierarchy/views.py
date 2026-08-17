"""
Hierarchy API ViewSets.

Each ViewSet handles CRUD for one model.
Uses different serializers for list vs detail actions.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.core.permissions import get_user_profile
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

class CurrentUserView(APIView):
    """
    GET /api/v1/auth/me/
    Returns the current user's profile and accessible facilities.
    Used by the frontend to adapt UI based on role.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = get_user_profile(user)

        if not profile:
            return Response({
                'username': user.username,
                'email': user.email,
                'role': 'ADMIN' if user.is_superuser else 'UNKNOWN',
                'facilities': [],
            })

        facilities = [
            {'id': str(f.id), 'name': f.name, 'code': f.code}
            for f in profile.accessible_facilities
        ]

        return Response({
            'username': user.username,
            'email':    user.email,
            'role':     profile.role,
            'facilities': facilities,
        })
    
class FacilityViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Facilities.
    Non-admin users only see their assigned facilities.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'address']
    ordering_fields = ['name', 'created_at', 'total_capacity']

    def get_queryset(self):
        from apps.core.permissions import get_user_profile

        qs = Facility.objects.all().order_by('name')
        user = self.request.user

        if user.is_superuser:
            return qs

        profile = get_user_profile(user)
        if not profile or profile.is_admin:
            return qs

        return profile.accessible_facilities.order_by('name')

    def get_serializer_class(self):
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