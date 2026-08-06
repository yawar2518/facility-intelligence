from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.hierarchy.models import Device
from apps.monitoring.uptime import calculate_uptime
from apps.monitoring.models import DeviceStatusChange


class DeviceUptimeView(APIView):
    """
    GET /api/v1/monitoring/devices/{device_id}/uptime/?days=7
    
    Returns uptime percentage and breakdown for a single device.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, device_id):
        try:
            device = Device.objects.get(pk=device_id, is_active=True)
        except Device.DoesNotExist:
            return Response(
                {'error': 'Device not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Optional ?days= query param, default 7, max 90
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
    """
    GET /api/v1/monitoring/facilities/{facility_id}/health/
    
    Returns current device counts by status for a facility.
    Quick health overview — no heavy uptime calculation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, facility_id):
        devices = Device.objects.filter(
            lane__area__facility_id=facility_id,
            is_active=True
        )

        if not devices.exists():
            return Response(
                {'error': 'Facility not found or has no devices'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Count devices by status
        total = devices.count()
        online = devices.filter(status='ONLINE').count()
        offline = devices.filter(status='OFFLINE').count()
        degraded = devices.filter(status='DEGRADED').count()
        unknown = devices.filter(status='UNKNOWN').count()

        # Overall health score — simple percentage of non-offline devices
        health_score = round(((online + degraded) / total) * 100, 1)

        return Response({
            'facility_id': str(facility_id),
            'total_devices': total,
            'online': online,
            'offline': offline,
            'degraded': degraded,
            'unknown': unknown,
            'health_score': health_score,
        })