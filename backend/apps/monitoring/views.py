from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, viewsets, filters
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from django_filters.rest_framework import DjangoFilterBackend
from datetime import timedelta

from apps.hierarchy.models import Device, Area, Lane, Facility
from apps.monitoring.uptime import calculate_uptime
from apps.monitoring.models import DeviceStatusChange, MaintenanceScore
from apps.monitoring.serializers import MaintenanceScoreSerializer
from apps.core.renderers import CSVRenderer
from apps.ml.models import Anomaly
from django.utils import timezone as django_timezone


def check_facility_access(user, facility_id):
    """
    Returns True if the user has access to the given facility.
    Admins and superusers always have access.
    """
    from apps.core.permissions import get_user_profile

    if user.is_superuser:
        return True

    profile = get_user_profile(user)
    if not profile or profile.is_admin:
        return True

    return profile.accessible_facilities.filter(id=facility_id).exists()


class DeviceUptimeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, device_id):
        try:
            device = Device.objects.select_related(
                'lane__area__facility'
            ).get(pk=device_id, is_active=True)
        except Device.DoesNotExist:
            return Response({'error': 'Device not found'}, status=status.HTTP_404_NOT_FOUND)

        if not check_facility_access(request.user, device.lane.area.facility_id):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        try:
            days = int(request.query_params.get('days', 7))
            days = max(1, min(days, 90))
        except ValueError:
            days = 7

        uptime_data = calculate_uptime(device, days=days)
        return Response({
            'device_id': str(device.id),
            'device_code': device.code,
            'device_type': device.device_type,
            'current_status': device.status,
            **uptime_data,
        })


class FacilityHealthSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, facility_id):
        if not check_facility_access(request.user, facility_id):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        devices = Device.objects.filter(lane__area__facility_id=facility_id, is_active=True)
        if not devices.exists():
            return Response({'error': 'Facility not found or has no devices'}, status=status.HTTP_404_NOT_FOUND)

        total    = devices.count()
        online   = devices.filter(status='ONLINE').count()
        offline  = devices.filter(status='OFFLINE').count()
        degraded = devices.filter(status='DEGRADED').count()
        unknown  = devices.filter(status='UNKNOWN').count()
        health_score = round(((online + degraded) / total) * 100, 1)

        return Response({
            'facility_id': str(facility_id),
            'total_devices': total,
            'online': online, 'offline': offline,
            'degraded': degraded, 'unknown': unknown,
            'health_score': health_score,
        })


class FacilityDeviceTreeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, facility_id):
        if not check_facility_access(request.user, facility_id):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        try:
            facility = Facility.objects.get(pk=facility_id, is_active=True)
        except Facility.DoesNotExist:
            return Response({'error': 'Facility not found'}, status=status.HTTP_404_NOT_FOUND)

        areas = Area.objects.filter(facility=facility, is_active=True).prefetch_related('lanes__devices').order_by('name')
        areas_data = []
        for area in areas:
            lanes_data  = []
            area_devices = []
            for lane in area.lanes.filter(is_active=True).order_by('name'):
                devices_data = []
                for device in lane.devices.filter(is_active=True).order_by('name'):
                    devices_data.append({
                        'id': str(device.id), 'name': device.name,
                        'code': device.code, 'device_type': device.device_type,
                        'status': device.status, 'last_heartbeat': device.last_heartbeat,
                        'heartbeat_timeout_seconds': device.heartbeat_timeout_seconds,
                    })
                    area_devices.append(device)
                lanes_data.append({
                    'id': str(lane.id), 'name': lane.name,
                    'code': lane.code, 'lane_type': lane.lane_type,
                    'devices': devices_data,
                })

            total   = len(area_devices)
            offline = sum(1 for d in area_devices if d.status == 'OFFLINE')
            area_health = round(((total - offline) / total) * 100, 1) if total > 0 else 100.0

            areas_data.append({
                'id': str(area.id), 'name': area.name,
                'code': area.code, 'capacity': area.capacity,
                'health_score': area_health, 'lanes': lanes_data,
            })

        return Response({
            'facility_id': str(facility.id),
            'facility_code': facility.code,
            'facility_name': facility.name,
            'areas': areas_data,
        })


class FacilityStatusChangesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, facility_id):
        if not check_facility_access(request.user, facility_id):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        try:
            facility = Facility.objects.get(pk=facility_id, is_active=True)
        except Facility.DoesNotExist:
            return Response({'error': 'Facility not found'}, status=status.HTTP_404_NOT_FOUND)

        limit   = max(1, min(int(request.query_params.get('limit', 50)), 200))
        changes = DeviceStatusChange.objects.filter(facility=facility).select_related('device', 'lane', 'area').order_by('-changed_at')[:limit]

        data = [{
            'id': str(c.id), 'device_code': c.device.code,
            'device_name': c.device.name, 'device_type': c.device.device_type,
            'area_name': c.area.name, 'lane_name': c.lane.name,
            'previous_status': c.previous_status, 'new_status': c.new_status,
            'reason': c.reason, 'changed_at': c.changed_at,
            'duration_seconds': c.duration_seconds, 'metadata': c.metadata,
        } for c in changes]

        return Response({
            'facility_id': str(facility.id),
            'facility_code': facility.code,
            'count': len(data), 'changes': data,
        })


class AreaHealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, area_id):
        try:
            area = Area.objects.select_related('facility').get(pk=area_id, is_active=True)
        except Area.DoesNotExist:
            return Response({'error': 'Area not found'}, status=status.HTTP_404_NOT_FOUND)

        if not check_facility_access(request.user, area.facility_id):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        devices  = Device.objects.filter(lane__area=area, is_active=True)
        total    = devices.count()
        online   = devices.filter(status='ONLINE').count()
        offline  = devices.filter(status='OFFLINE').count()
        degraded = devices.filter(status='DEGRADED').count()
        unknown  = devices.filter(status='UNKNOWN').count()
        health_score = round(((online + degraded) / total) * 100, 1) if total > 0 else 100.0

        return Response({
            'area_id': str(area.id), 'area_name': area.name,
            'area_code': area.code, 'facility_code': area.facility.code,
            'capacity': area.capacity, 'total_devices': total,
            'online': online, 'offline': offline,
            'degraded': degraded, 'unknown': unknown,
            'health_score': health_score,
        })


class FacilitySLAView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.core.permissions import get_user_profile

        user = request.user
        all_facilities = Facility.objects.filter(is_active=True)

        if not user.is_superuser:
            profile = get_user_profile(user)
            if profile and not profile.is_admin:
                all_facilities = profile.accessible_facilities

        since = django_timezone.now() - timedelta(days=7)
        results = []

        for facility in all_facilities:
            devices  = Device.objects.filter(lane__area__facility=facility, is_active=True)
            total    = devices.count()
            online   = devices.filter(status='ONLINE').count()
            degraded = devices.filter(status='DEGRADED').count()
            offline  = devices.filter(status='OFFLINE').count()

            uptime_pct = round(((online + degraded) / total * 100), 1) if total > 0 else 100.0

            incident_count = DeviceStatusChange.objects.filter(
                facility=facility, changed_at__gte=since, new_status='OFFLINE',
            ).count()

            anomaly_count = Anomaly.objects.filter(
                facility=facility, detected_at__gte=since,
            ).count()

            critical_anomalies = Anomaly.objects.filter(
                facility=facility, detected_at__gte=since, severity='CRITICAL',
            ).count()

            results.append({
                'facility_id':        str(facility.id),
                'facility_name':      facility.name,
                'facility_code':      facility.code,
                'total_devices':      total,
                'online':             online,
                'degraded':           degraded,
                'offline':            offline,
                'uptime_pct':         uptime_pct,
                'incident_count':     incident_count,
                'anomaly_count':      anomaly_count,
                'critical_anomalies': critical_anomalies,
            })

        results.sort(key=lambda x: (-x['uptime_pct'], x['anomaly_count']))
        return Response(results)


class MaintenanceScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only endpoint for predictive maintenance scores.
    Add ?format=csv to download as CSV.
    """
    serializer_class   = MaintenanceScoreSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes   = [JSONRenderer, BrowsableAPIRenderer, CSVRenderer]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['risk_level']
    ordering_fields    = ['risk_score', 'computed_at']

    def get_queryset(self):
        from apps.core.permissions import get_user_profile

        qs = MaintenanceScore.objects.select_related(
            'device__lane__area__facility'
        ).order_by('-risk_score', '-computed_at')

        user = self.request.user
        if user.is_superuser:
            return qs

        profile = get_user_profile(user)
        if not profile or profile.is_admin:
            return qs

        accessible = profile.accessible_facilities
        return qs.filter(device__lane__area__facility__in=accessible)