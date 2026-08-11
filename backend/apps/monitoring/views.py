from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.hierarchy.models import Device
from apps.monitoring.uptime import calculate_uptime
from apps.monitoring.models import DeviceStatusChange
from apps.hierarchy.models import Device, Area, Lane, Facility


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

class FacilityDeviceTreeView(APIView):
    """
    GET /api/v1/monitoring/facilities/{facility_id}/devices/
    
    Returns the full Facility → Area → Lane → Device tree
    with current status on every device.
    Used by the dashboard status grid.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, facility_id):
        try:
            facility = Facility.objects.get(pk=facility_id, is_active=True)
        except Facility.DoesNotExist:
            return Response(
                {'error': 'Facility not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Load entire tree in 3 queries using select_related/prefetch
        # Instead of N+1 queries (one per area, one per lane, one per device)
        areas = (
            Area.objects
            .filter(facility=facility, is_active=True)
            .prefetch_related('lanes__devices')
            .order_by('name')
        )

        areas_data = []
        for area in areas:
            lanes_data = []
            area_devices = []

            for lane in area.lanes.filter(is_active=True).order_by('name'):
                devices_data = []
                for device in lane.devices.filter(is_active=True).order_by('name'):
                    devices_data.append({
                        'id': str(device.id),
                        'name': device.name,
                        'code': device.code,
                        'device_type': device.device_type,
                        'status': device.status,
                        'last_heartbeat': device.last_heartbeat,
                        'heartbeat_timeout_seconds': device.heartbeat_timeout_seconds,
                    })
                    area_devices.append(device)

                lanes_data.append({
                    'id': str(lane.id),
                    'name': lane.name,
                    'code': lane.code,
                    'lane_type': lane.lane_type,
                    'devices': devices_data,
                })

            # Area health score — % of non-offline devices
            total = len(area_devices)
            if total > 0:
                offline = sum(1 for d in area_devices if d.status == 'OFFLINE')
                area_health = round(((total - offline) / total) * 100, 1)
            else:
                area_health = 100.0

            areas_data.append({
                'id': str(area.id),
                'name': area.name,
                'code': area.code,
                'capacity': area.capacity,
                'health_score': area_health,
                'lanes': lanes_data,
            })

        return Response({
            'facility_id': str(facility.id),
            'facility_code': facility.code,
            'facility_name': facility.name,
            'areas': areas_data,
        })

class FacilityStatusChangesView(APIView):
    """
    GET /api/v1/monitoring/facilities/{facility_id}/status-changes/?limit=50
    
    Returns recent status changes for all devices in a facility.
    Used by the anomaly/event timeline on the dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, facility_id):
        try:
            facility = Facility.objects.get(pk=facility_id, is_active=True)
        except Facility.DoesNotExist:
            return Response(
                {'error': 'Facility not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        limit = int(request.query_params.get('limit', 50))
        limit = max(1, min(limit, 200))  # cap at 200

        changes = (
            DeviceStatusChange.objects
            .filter(facility=facility)
            .select_related('device', 'lane', 'area')
            .order_by('-changed_at')[:limit]
        )

        data = []
        for change in changes:
            data.append({
                'id': str(change.id),
                'device_code': change.device.code,
                'device_name': change.device.name,
                'device_type': change.device.device_type,
                'area_name': change.area.name,
                'lane_name': change.lane.name,
                'previous_status': change.previous_status,
                'new_status': change.new_status,
                'reason': change.reason,
                'changed_at': change.changed_at,
                'duration_seconds': change.duration_seconds,
                'metadata': change.metadata,
            })

        return Response({
            'facility_id': str(facility.id),
            'facility_code': facility.code,
            'count': len(data),
            'changes': data,
        })

class AreaHealthView(APIView):
    """
    GET /api/v1/monitoring/areas/{area_id}/health/
    
    Returns health rollup for a single area.
    Device counts by status + area health score.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, area_id):
        try:
            area = Area.objects.select_related('facility').get(
                pk=area_id, is_active=True
            )
        except Area.DoesNotExist:
            return Response(
                {'error': 'Area not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        devices = Device.objects.filter(
            lane__area=area, is_active=True
        )

        total = devices.count()
        online = devices.filter(status='ONLINE').count()
        offline = devices.filter(status='OFFLINE').count()
        degraded = devices.filter(status='DEGRADED').count()
        unknown = devices.filter(status='UNKNOWN').count()

        health_score = round(
            ((online + degraded) / total) * 100, 1
        ) if total > 0 else 100.0

        return Response({
            'area_id': str(area.id),
            'area_name': area.name,
            'area_code': area.code,
            'facility_code': area.facility.code,
            'capacity': area.capacity,
            'total_devices': total,
            'online': online,
            'offline': offline,
            'degraded': degraded,
            'unknown': unknown,
            'health_score': health_score,
        })