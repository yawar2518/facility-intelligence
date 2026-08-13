"""
Seed script — populate the database with realistic test data.

Run with:
    python manage.py runscript seed_data

Requires django-extensions (already in requirements).
Idempotent — safe to run multiple times (clears existing data first).
"""

from apps.hierarchy.models import Facility, Area, Lane, Device


def run():
    print("🌱 Starting seed...")

    # ── Clear existing hierarchy data ──────────────────────────
    # Order matters: delete children before parents
    Device.objects.all().delete()
    Lane.objects.all().delete()
    Area.objects.all().delete()
    Facility.objects.all().delete()
    print("   Cleared existing data.")

    # ══════════════════════════════════════════════════════════
    # FACILITY 1 — Downtown Garage
    # ══════════════════════════════════════════════════════════
    dg = Facility.objects.create(
        name="Downtown Garage",
        code="DG-01",
        address="123 Main Street, Lahore, Punjab",
        total_capacity=500,
        timezone="Asia/Karachi",
        metadata={"operator": "ParkCo", "levels": 5, "monthly_rate_pkr": 3000}
    )

    # Areas
    dg_l1 = Area.objects.create(
        facility=dg, name="Level 1", code="L1",
        capacity=100,
        metadata={"floor": 1, "covered": True}
    )
    dg_l2 = Area.objects.create(
        facility=dg, name="Level 2", code="L2",
        capacity=120,
        metadata={"floor": 2, "covered": True}
    )
    dg_roof = Area.objects.create(
        facility=dg, name="Rooftop", code="RF",
        capacity=80,
        metadata={"floor": 5, "covered": False}
    )

    # ── Level 1 Lanes ──
    dg_l1_entry = Lane.objects.create(
        area=dg_l1, name="Entry Lane 1", code="EL-1",
        lane_type=Lane.LaneType.ENTRY
    )
    dg_l1_exit = Lane.objects.create(
        area=dg_l1, name="Exit Lane 1", code="XL-1",
        lane_type=Lane.LaneType.EXIT
    )
    dg_l1_pay = Lane.objects.create(
        area=dg_l1, name="Pay Station 1", code="PS-1",
        lane_type=Lane.LaneType.PAY
    )

    # ── Level 2 Lanes ──
    dg_l2_entry = Lane.objects.create(
        area=dg_l2, name="Entry Lane 2", code="EL-2",
        lane_type=Lane.LaneType.ENTRY
    )
    dg_l2_exit = Lane.objects.create(
        area=dg_l2, name="Exit Lane 2", code="XL-2",
        lane_type=Lane.LaneType.EXIT
    )

    # ── Rooftop Lanes ──
    dg_rf_entry = Lane.objects.create(
        area=dg_roof, name="Rooftop Entry", code="EL-1",
        lane_type=Lane.LaneType.ENTRY_EXIT
    )

    # ── Devices — Level 1 Entry ──
    Device.objects.create(
        lane=dg_l1_entry, name="Barrier Gate #1", code="BG-01",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="BG2024-001", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.1.10", "manufacturer": "CAME"}
    )
    Device.objects.create(
        lane=dg_l1_entry, name="LPR Camera #1", code="LPR-01",
        device_type=Device.DeviceType.LPR_CAMERA,
        serial_number="LPR2024-001", firmware_version="v2.1.0",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.1.11", "resolution": "4K"}
    )
    Device.objects.create(
        lane=dg_l1_entry, name="Ticket Dispenser #1", code="TD-01",
        device_type=Device.DeviceType.TICKET_DISPENSER,
        serial_number="TD2024-001", firmware_version="v1.5.3",
        heartbeat_timeout_seconds=90,
        metadata={"ip": "192.168.1.12"}
    )

    # ── Devices — Level 1 Exit ──
    Device.objects.create(
        lane=dg_l1_exit, name="Barrier Gate #2", code="BG-02",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="BG2024-002", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.1.13", "manufacturer": "CAME"}
    )
    Device.objects.create(
        lane=dg_l1_exit, name="LPR Camera #2", code="LPR-02",
        device_type=Device.DeviceType.LPR_CAMERA,
        serial_number="LPR2024-002", firmware_version="v2.1.0",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.1.14"}
    )
    Device.objects.create(
        lane=dg_l1_exit, name="Intercom #1", code="IC-01",
        device_type=Device.DeviceType.INTERCOM,
        serial_number="IC2024-001", firmware_version="v1.2.0",
        heartbeat_timeout_seconds=120,
        metadata={"ip": "192.168.1.15"}
    )

    # ── Devices — Level 1 Pay Station ──
    Device.objects.create(
        lane=dg_l1_pay, name="Payment Kiosk #1", code="PK-01",
        device_type=Device.DeviceType.KIOSK,
        serial_number="PK2024-001", firmware_version="v4.0.2",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.1.16", "accepts_cash": True}
    )

    # ── Devices — Level 2 ──
    Device.objects.create(
        lane=dg_l2_entry, name="Barrier Gate #3", code="BG-03",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="BG2024-003", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.2.10"}
    )
    Device.objects.create(
        lane=dg_l2_entry, name="LPR Camera #3", code="LPR-03",
        device_type=Device.DeviceType.LPR_CAMERA,
        serial_number="LPR2024-003", firmware_version="v2.1.0",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.2.11"}
    )
    Device.objects.create(
        lane=dg_l2_exit, name="Barrier Gate #4", code="BG-04",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="BG2024-004", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.2.12"}
    )
    Device.objects.create(
        lane=dg_l2_exit, name="Payment Kiosk #2", code="PK-02",
        device_type=Device.DeviceType.KIOSK,
        serial_number="PK2024-002", firmware_version="v4.0.2",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.2.13"}
    )

    # ── Devices — Rooftop ──
    Device.objects.create(
        lane=dg_rf_entry, name="Barrier Gate #5", code="BG-05",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="BG2024-005", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "192.168.5.10"}
    )
    Device.objects.create(
        lane=dg_rf_entry, name="Occupancy Sensor #1", code="OS-01",
        device_type=Device.DeviceType.SENSOR,
        serial_number="OS2024-001", firmware_version="v1.0.5",
        heartbeat_timeout_seconds=120,
        metadata={"ip": "192.168.5.11"}
    )

    print(f"   ✅ {dg.name}: "
          f"{dg.areas.count()} areas, "
          f"{Lane.objects.filter(area__facility=dg).count()} lanes, "
          f"{Device.objects.filter(lane__area__facility=dg).count()} devices")

    # ══════════════════════════════════════════════════════════
    # FACILITY 2 — Airport Parking
    # ══════════════════════════════════════════════════════════
    ap = Facility.objects.create(
        name="Airport Parking",
        code="AP-01",
        address="Allama Iqbal International Airport, Lahore",
        total_capacity=1200,
        timezone="Asia/Karachi",
        metadata={"operator": "AirPark", "terminals": 2}
    )

    ap_t1 = Area.objects.create(
        facility=ap, name="Terminal 1 Parking", code="T1",
        capacity=600,
        metadata={"terminal": 1, "covered": True}
    )
    ap_t2 = Area.objects.create(
        facility=ap, name="Terminal 2 Parking", code="T2",
        capacity=600,
        metadata={"terminal": 2, "covered": False}
    )

    # ── Terminal 1 Lanes + Devices ──
    ap_t1_entry = Lane.objects.create(
        area=ap_t1, name="T1 Entry Lane", code="EL-1",
        lane_type=Lane.LaneType.ENTRY
    )
    ap_t1_exit = Lane.objects.create(
        area=ap_t1, name="T1 Exit Lane", code="XL-1",
        lane_type=Lane.LaneType.EXIT
    )

    Device.objects.create(
        lane=ap_t1_entry, name="Barrier Gate #1", code="BG-01",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="AP-BG-001", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "10.0.1.10"}
    )
    Device.objects.create(
        lane=ap_t1_entry, name="LPR Camera #1", code="LPR-01",
        device_type=Device.DeviceType.LPR_CAMERA,
        serial_number="AP-LPR-001", firmware_version="v2.1.0",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "10.0.1.11"}
    )
    Device.objects.create(
        lane=ap_t1_entry, name="Ticket Dispenser #1", code="TD-01",
        device_type=Device.DeviceType.TICKET_DISPENSER,
        serial_number="AP-TD-001", firmware_version="v1.5.3",
        heartbeat_timeout_seconds=90,
        metadata={"ip": "10.0.1.12"}
    )
    Device.objects.create(
        lane=ap_t1_exit, name="Barrier Gate #2", code="BG-02",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="AP-BG-002", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "10.0.1.13"}
    )
    Device.objects.create(
        lane=ap_t1_exit, name="Payment Kiosk #1", code="PK-01",
        device_type=Device.DeviceType.KIOSK,
        serial_number="AP-PK-001", firmware_version="v4.0.2",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "10.0.1.14"}
    )
    Device.objects.create(
        lane=ap_t1_exit, name="Intercom #1", code="IC-01",
        device_type=Device.DeviceType.INTERCOM,
        serial_number="AP-IC-001", firmware_version="v1.2.0",
        heartbeat_timeout_seconds=120,
        metadata={"ip": "10.0.1.15"}
    )

    # ── Terminal 2 Lanes + Devices ──
    ap_t2_entry = Lane.objects.create(
        area=ap_t2, name="T2 Entry Lane", code="EL-1",
        lane_type=Lane.LaneType.ENTRY
    )
    ap_t2_exit = Lane.objects.create(
        area=ap_t2, name="T2 Exit Lane", code="XL-1",
        lane_type=Lane.LaneType.EXIT
    )

    Device.objects.create(
        lane=ap_t2_entry, name="Barrier Gate T2 #1", code="T2-BG-01",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="AP-BG-003", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "10.0.2.10"}
    )
    Device.objects.create(
        lane=ap_t2_entry, name="LPR Camera T2 #1", code="T2-LPR-01",
        device_type=Device.DeviceType.LPR_CAMERA,
        serial_number="AP-LPR-002", firmware_version="v2.1.0",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "10.0.2.11"}
    )
    Device.objects.create(
        lane=ap_t2_exit, name="Barrier Gate T2 #2", code="T2-BG-02",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="AP-BG-004", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "10.0.2.12"}
    )
    Device.objects.create(
        lane=ap_t2_exit, name="Payment Kiosk T2 #1", code="T2-PK-01",
        device_type=Device.DeviceType.KIOSK,
        serial_number="AP-PK-002", firmware_version="v4.0.2",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "10.0.2.13"}
    )

    print(f"   ✅ {ap.name}: "
          f"{ap.areas.count()} areas, "
          f"{Lane.objects.filter(area__facility=ap).count()} lanes, "
          f"{Device.objects.filter(lane__area__facility=ap).count()} devices")

    # ══════════════════════════════════════════════════════════
    # FACILITY 3 — Mall Complex
    # ══════════════════════════════════════════════════════════
    mc = Facility.objects.create(
        name="Mall Complex",
        code="MC-01",
        address="Emporium Mall, Johar Town, Lahore",
        total_capacity=800,
        timezone="Asia/Karachi",
        metadata={"operator": "MallPark", "mall": "Emporium"}
    )

    mc_b1 = Area.objects.create(
        facility=mc, name="Basement 1", code="B1",
        capacity=400,
        metadata={"floor": -1, "covered": True}
    )
    mc_b2 = Area.objects.create(
        facility=mc, name="Basement 2", code="B2",
        capacity=400,
        metadata={"floor": -2, "covered": True}
    )

    # ── Basement 1 ──
    mc_b1_entry = Lane.objects.create(
        area=mc_b1, name="B1 Entry", code="EL-1",
        lane_type=Lane.LaneType.ENTRY
    )
    mc_b1_exit = Lane.objects.create(
        area=mc_b1, name="B1 Exit", code="XL-1",
        lane_type=Lane.LaneType.EXIT
    )
    mc_b1_pay = Lane.objects.create(
        area=mc_b1, name="B1 Pay Station", code="PS-1",
        lane_type=Lane.LaneType.PAY
    )

    Device.objects.create(
        lane=mc_b1_entry, name="Barrier Gate #1", code="BG-01",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="MC-BG-001", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "172.16.1.10"}
    )
    Device.objects.create(
        lane=mc_b1_entry, name="LPR Camera #1", code="LPR-01",
        device_type=Device.DeviceType.LPR_CAMERA,
        serial_number="MC-LPR-001", firmware_version="v2.1.0",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "172.16.1.11"}
    )
    Device.objects.create(
        lane=mc_b1_exit, name="Barrier Gate #2", code="BG-02",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="MC-BG-002", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "172.16.1.12"}
    )
    Device.objects.create(
        lane=mc_b1_exit, name="Intercom #1", code="IC-01",
        device_type=Device.DeviceType.INTERCOM,
        serial_number="MC-IC-001", firmware_version="v1.2.0",
        heartbeat_timeout_seconds=120,
        metadata={"ip": "172.16.1.13"}
    )
    Device.objects.create(
        lane=mc_b1_pay, name="Payment Kiosk #1", code="PK-01",
        device_type=Device.DeviceType.KIOSK,
        serial_number="MC-PK-001", firmware_version="v4.0.2",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "172.16.1.14"}
    )

    # ── Basement 2 ──
    mc_b2_entry = Lane.objects.create(
        area=mc_b2, name="B2 Entry", code="EL-1",
        lane_type=Lane.LaneType.ENTRY
    )
    mc_b2_exit = Lane.objects.create(
        area=mc_b2, name="B2 Exit", code="XL-1",
        lane_type=Lane.LaneType.EXIT
    )

    Device.objects.create(
        lane=mc_b2_entry, name="Barrier Gate B2 #1", code="B2-BG-01",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="MC-BG-003", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "172.16.2.10"}
    )
    Device.objects.create(
        lane=mc_b2_entry, name="LPR Camera B2 #1", code="B2-LPR-01",
        device_type=Device.DeviceType.LPR_CAMERA,
        serial_number="MC-LPR-002", firmware_version="v2.1.0",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "172.16.2.11"}
    )
    Device.objects.create(
        lane=mc_b2_exit, name="Barrier Gate B2 #2", code="B2-BG-02",
        device_type=Device.DeviceType.BARRIER_GATE,
        serial_number="MC-BG-004", firmware_version="v3.2.1",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "172.16.2.12"}
    )
    Device.objects.create(
        lane=mc_b2_exit, name="Payment Kiosk B2 #1", code="B2-PK-01",
        device_type=Device.DeviceType.KIOSK,
        serial_number="MC-PK-002", firmware_version="v4.0.2",
        heartbeat_timeout_seconds=60,
        metadata={"ip": "172.16.2.13"}
    )

    print(f"   ✅ {mc.name}: "
          f"{mc.areas.count()} areas, "
          f"{Lane.objects.filter(area__facility=mc).count()} lanes, "
          f"{Device.objects.filter(lane__area__facility=mc).count()} devices")

    # ── Final summary ──────────────────────────────────────────
    print("\n📊 Seed Summary:")
    print(f"   Facilities : {Facility.objects.count()}")
    print(f"   Areas      : {Area.objects.count()}")
    print(f"   Lanes      : {Lane.objects.count()}")
    print(f"   Devices    : {Device.objects.count()}")
    print("\n✅ Seed complete!")