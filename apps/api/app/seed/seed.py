from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.asset import Asset, AssetAttribute
from app.models.cloud import CloudAccount, CloudResource
from app.models.cmdb import Relationship
from app.models.datacenter import Building, Rack, Room, Row, Site
from app.models.identity import Tenant, User
from app.models.lifecycle import Contract, License, Vendor, Warranty
from app.models.network import DnsRecord, IpAddress, Network, Subnet, Vlan
from app.models.ops import Alert, Change, Incident, Maintenance
from app.models.telemetry import CapacitySnapshot, Prediction, Recommendation, TelemetrySample

NOW = datetime.now(UTC)
TODAY = date.today()


def _id() -> str:
    return str(uuid4())


def seed_if_empty(db: Session) -> None:
    if db.query(Site).filter(Site.code == "CHN-DC1").first():
        return
    seed(db)


def seed(db: Session, *, reset: bool = False) -> dict:
    tenant = db.query(Tenant).filter(Tenant.slug == "wecrew").one_or_none()
    if tenant is None:
        tenant_id = _id()
        tenant = Tenant(id=tenant_id, name="WeCrew", slug="wecrew")
        db.add(tenant)
        db.flush()
    else:
        tenant_id = tenant.id
        tenant.name = "WeCrew"

    if db.query(Site).filter(Site.tenant_id == tenant_id, Site.code == "CHN-DC1").first():
        return {"tenant_id": tenant_id, "site": "CHN-DC1", "status": "exists"}

    users = {
        "admin": User(
            id=_id(),
            tenant_id=tenant_id,
            email="admin@wecrew.in",
            full_name="Platform Admin",
            hashed_password=hash_password("WeCrew!admin"),
            role="super_admin",
            team="Platform",
        ),
        "sre": User(
            id=_id(),
            tenant_id=tenant_id,
            email="sre@wecrew.in",
            full_name="SRE On-Call",
            hashed_password=hash_password("WeCrew!sre"),
            role="sre",
            team="SRE",
        ),
        "dc": User(
            id=_id(),
            tenant_id=tenant_id,
            email="dceng@wecrew.in",
            full_name="Data Center Engineer",
            hashed_password=hash_password("WeCrew!dc"),
            role="data_center_engineer",
            team="Facilities",
        ),
        "viewer": User(
            id=_id(),
            tenant_id=tenant_id,
            email="viewer@wecrew.in",
            full_name="Executive Viewer",
            hashed_password=hash_password("WeCrew!viewer"),
            role="viewer",
            team="Leadership",
        ),
    }
    existing_emails = {
        email
        for (email,) in db.query(User.email).filter(User.email.in_([u.email for u in users.values()]))
    }
    db.add_all([user for user in users.values() if user.email not in existing_emails])

    nvidia = Vendor(id=_id(), tenant_id=tenant_id, name="NVIDIA", category="gpu", support_email="enterprise@nvidia.com")
    dell = Vendor(id=_id(), tenant_id=tenant_id, name="Dell", category="server")
    supermicro = Vendor(id=_id(), tenant_id=tenant_id, name="Supermicro", category="server")
    arista = Vendor(id=_id(), tenant_id=tenant_id, name="Arista", category="network")
    vertiv = Vendor(id=_id(), tenant_id=tenant_id, name="Vertiv", category="cooling")
    aws_v = Vendor(id=_id(), tenant_id=tenant_id, name="Amazon Web Services", category="cloud")
    db.add_all([nvidia, dell, supermicro, arista, vertiv, aws_v])

    site = Site(
        id=_id(),
        tenant_id=tenant_id,
        name="Chennai DC1",
        code="CHN-DC1",
        site_type="data_center",
        city="Chennai",
        country="IN",
        address="SIPCOT IT Park, Siruseri",
        latitude=12.831,
        longitude=80.223,
        status="online",
    )
    edge = Site(
        id=_id(),
        tenant_id=tenant_id,
        name="Mumbai Edge",
        code="BOM-EDGE1",
        site_type="edge",
        city="Mumbai",
        country="IN",
        status="online",
    )
    db.add_all([site, edge])

    building = Building(id=_id(), tenant_id=tenant_id, site_id=site.id, name="Hall A", floors=2)
    db.add(building)
    gpu_hall = Room(
        id=_id(),
        tenant_id=tenant_id,
        site_id=site.id,
        building_id=building.id,
        name="GPU Hall",
        room_type="white_space",
        design_power_kw=800,
        design_cooling_kw=720,
    )
    net_room = Room(
        id=_id(),
        tenant_id=tenant_id,
        site_id=site.id,
        building_id=building.id,
        name="Core Network",
        room_type="network",
        design_power_kw=80,
        design_cooling_kw=60,
    )
    db.add_all([gpu_hall, net_room])
    row_a = Row(id=_id(), tenant_id=tenant_id, room_id=gpu_hall.id, name="Row A")
    row_n = Row(id=_id(), tenant_id=tenant_id, room_id=net_room.id, name="Row N")
    db.add_all([row_a, row_n])

    r42 = Rack(
        id=_id(),
        tenant_id=tenant_id,
        site_id=site.id,
        room_id=gpu_hall.id,
        row_id=row_a.id,
        name="R42",
        ru_total=42,
        ru_used=36,
        power_capacity_kw=48.0,
        power_used_kw=41.6,
        cooling_capacity_kw=50.0,
        cooling_used_kw=43.2,
        weight_used_kg=980,
        cooling_mode="liquid",
    )
    r10 = Rack(
        id=_id(),
        tenant_id=tenant_id,
        site_id=site.id,
        room_id=gpu_hall.id,
        row_id=row_a.id,
        name="R10",
        ru_total=42,
        ru_used=24,
        power_capacity_kw=20.0,
        power_used_kw=9.4,
        cooling_capacity_kw=18.0,
        cooling_used_kw=8.1,
        weight_used_kg=420,
        cooling_mode="air",
    )
    r01 = Rack(
        id=_id(),
        tenant_id=tenant_id,
        site_id=site.id,
        room_id=net_room.id,
        row_id=row_n.id,
        name="R01",
        ru_total=42,
        ru_used=18,
        power_capacity_kw=12.0,
        power_used_kw=4.2,
        cooling_capacity_kw=10.0,
        cooling_used_kw=3.5,
        weight_used_kg=260,
        cooling_mode="air",
    )
    db.add_all([r42, r10, r01])
    db.flush()

    def asset(**kwargs) -> Asset:
        kwargs.setdefault("tenant_id", tenant_id)
        kwargs.setdefault("site_id", site.id)
        kwargs.setdefault("environment", "production")
        kwargs.setdefault("status", "online")
        kwargs.setdefault("health", "healthy")
        kwargs.setdefault("last_seen_at", NOW)
        a = Asset(id=_id(), **kwargs)
        db.add(a)
        return a

    def attr(asset_obj: Asset, key: str, value, unit: str | None = None, source: str = "seed") -> None:
        db.add(
            AssetAttribute(
                id=_id(),
                tenant_id=tenant_id,
                asset_id=asset_obj.id,
                key=key,
                value=str(value),
                unit=unit,
                source=source,
            )
        )

    def rel(src: Asset, tgt: Asset, rel_type: str) -> None:
        db.add(
            Relationship(
                id=_id(),
                tenant_id=tenant_id,
                source_id=src.id,
                target_id=tgt.id,
                rel_type=rel_type,
            )
        )

    def sample(asset_obj: Asset, metric: str, value: float, unit: str) -> None:
        db.add(
            TelemetrySample(
                id=_id(),
                tenant_id=tenant_id,
                asset_id=asset_obj.id,
                metric=metric,
                value=value,
                unit=unit,
                observed_at=NOW,
            )
        )

    rack_assets = {
        r42: asset(name="R42", asset_type="rack", rack_id=r42.id, room_id=gpu_hall.id, manufacturer="Chatsworth"),
        r10: asset(name="R10", asset_type="rack", rack_id=r10.id, room_id=gpu_hall.id, manufacturer="Chatsworth"),
        r01: asset(name="R01", asset_type="rack", rack_id=r01.id, room_id=net_room.id, manufacturer="Chatsworth"),
    }

    ups = asset(
        name="UPS-A",
        asset_type="ups",
        manufacturer="Eaton",
        model="9395P",
        room_id=gpu_hall.id,
        criticality="critical",
        business_service="Facility Power",
    )
    attr(ups, "load_percent", 68, "%")
    attr(ups, "runtime_minutes", 14, "min")
    attr(ups, "battery_health", 92, "%")
    sample(ups, "infraasset_ups_load_percent", 68, "percent")

    gen = asset(name="GEN-01", asset_type="generator", manufacturer="Caterpillar", model="C32", criticality="critical")
    pdu_a = asset(name="PDU-R42-A", asset_type="pdu", rack_id=r42.id, room_id=gpu_hall.id, manufacturer="Raritan")
    pdu_b = asset(name="PDU-R42-B", asset_type="pdu", rack_id=r42.id, room_id=gpu_hall.id, manufacturer="Raritan")
    attr(pdu_a, "load_percent", 86, "%")
    attr(pdu_b, "load_percent", 81, "%")
    sample(pdu_a, "infraasset_rack_power_kw", 21.0, "kW")
    sample(pdu_b, "infraasset_rack_power_kw", 20.6, "kW")

    cdu = asset(
        name="CDU-03",
        asset_type="cdu",
        manufacturer="Vertiv",
        model="Liebert XDU",
        room_id=gpu_hall.id,
        vendor_id=vertiv.id,
        criticality="critical",
        health="degraded",
        status="warning",
        business_service="GPU Training",
    )
    attr(cdu, "coolant_inlet_temperature_c", 32.4, "C", "modbus")
    attr(cdu, "coolant_outlet_temperature_c", 39.1, "C", "modbus")
    attr(cdu, "coolant_flow_lpm", 118, "lpm", "modbus")
    attr(cdu, "cdu_load_percent", 88, "%")
    attr(cdu, "cdu_pump_speed_percent", 91, "%")
    attr(cdu, "differential_pressure", 1.8, "bar")
    attr(cdu, "leak_status", "ok")
    sample(cdu, "infraasset_coolant_flow_lpm", 118, "lpm")
    sample(cdu, "infraasset_cdu_load_percent", 88, "percent")

    pump = asset(name="PUMP-CDU03-1", asset_type="pump", room_id=gpu_hall.id, health="degraded", status="warning")
    hx = asset(name="HX-03", asset_type="heat_exchanger", room_id=gpu_hall.id)
    chiller = asset(name="CHILLER-2", asset_type="chiller", manufacturer="Trane", criticality="critical")
    manifold = asset(name="MANIFOLD-R42", asset_type="rack_manifold", rack_id=r42.id, room_id=gpu_hall.id)
    crac = asset(name="CRAH-GPU-1", asset_type="crah", room_id=gpu_hall.id)

    spine = asset(
        name="SPINE-01",
        asset_type="switch",
        asset_subtype="spine",
        manufacturer="Arista",
        model="7800R3",
        rack_id=r01.id,
        room_id=net_room.id,
        vendor_id=arista.id,
        management_ip="10.42.0.2",
        criticality="critical",
        business_service="AI Fabric",
    )
    tor = asset(
        name="TOR-R42",
        asset_type="switch",
        asset_subtype="tor",
        manufacturer="Arista",
        model="7060DX4",
        rack_id=r42.id,
        room_id=gpu_hall.id,
        management_ip="10.42.1.2",
        criticality="high",
        business_service="AI Fabric",
    )
    fw = asset(
        name="FW-EDGE-01",
        asset_type="firewall",
        manufacturer="Palo Alto",
        model="PA-5450",
        rack_id=r01.id,
        management_ip="10.42.0.1",
        criticality="critical",
        business_service="Hybrid Connectivity",
    )
    ib = asset(name="IB-LEAF-R42", asset_type="switch", asset_subtype="infiniband", manufacturer="NVIDIA", model="QM9700", rack_id=r42.id)

    k8s = asset(
        name="gpu-cluster",
        asset_type="kubernetes_cluster",
        asset_subtype="onprem",
        manufacturer="Kubernetes",
        model="1.31",
        business_service="GPU Training",
        criticality="critical",
    )
    app = asset(
        name="inference-gateway",
        asset_type="application",
        business_service="GPU Inference",
        criticality="critical",
        health="degraded",
        status="warning",
    )
    nas = asset(name="CEPH-OSD-01", asset_type="storage", asset_subtype="ceph", manufacturer="Western Digital", rack_id=r10.id)

    gpu_nodes: list[Asset] = []
    gpus: list[Asset] = []
    for i in range(1, 5):
        node = asset(
            name=f"gpu-node-{i:02d}",
            hostname=f"gpu-node-{i:02d}",
            fqdn=f"gpu-node-{i:02d}.chn.wecrew.in",
            asset_type="server",
            asset_subtype="gpu",
            manufacturer="Supermicro",
            model="SYS-821GE-TNHR",
            serial_number=f"SM-GPU-{i:04d}",
            rack_id=r42.id,
            room_id=gpu_hall.id,
            rack_unit=1 + (i - 1) * 8,
            rack_unit_height=8,
            vendor_id=supermicro.id,
            management_ip=f"10.42.10.{10 + i}",
            criticality="critical",
            business_service="GPU Training" if i < 4 else "GPU Inference",
            purchase_date=TODAY - timedelta(days=400),
            warranty_expiry=TODAY + timedelta(days=18 if i == 3 else 400),
            eos_date=TODAY + timedelta(days=900),
            cost=420000,
            health="degraded" if i == 2 else "healthy",
            status="warning" if i == 2 else "online",
        )
        gpu_nodes.append(node)
        k8s_node = asset(
            name=f"k8s-{node.name}",
            asset_type="kubernetes_node",
            hostname=node.hostname,
            rack_id=r42.id,
            business_service=node.business_service,
        )
        nic = asset(name=f"{node.name}-nic0", asset_type="nic", asset_subtype="connectx7", rack_id=r42.id)
        cold = asset(name=f"{node.name}-coldplate", asset_type="cold_plate", rack_id=r42.id)
        rel(rack_assets[r42], node, "CONTAINS")
        rel(node, rack_assets[r42], "MEMBER_OF")
        rel(node, pdu_a, "POWERED_BY")
        rel(node, pdu_b, "POWERED_BY")
        rel(node, cold, "COOLED_BY")
        rel(cold, manifold, "COOLED_BY")
        rel(k8s, k8s_node, "CONTAINS")
        rel(k8s_node, node, "RUNS_ON")
        rel(node, nic, "CONTAINS")
        rel(nic, tor, "CONNECTED_TO")
        rel(nic, ib, "CONNECTED_TO")
        attr(node, "cpu_model", "Intel Xeon Platinum 8592+")
        attr(node, "sockets", 2)
        attr(node, "cores", 128)
        attr(node, "cpu_utilization_percent", 41 + i * 8, "%")
        attr(node, "cpu_temperature_c", 62 + i, "C")
        sample(node, "infraasset_cpu_utilization_percent", 41 + i * 8, "percent")
        for g in range(8):
            util = 94 if i == 2 else 70 + i * 3 + g
            temp = 83 if i == 2 else 68 + g
            gpu = asset(
                name=f"{node.name}-gpu{g}",
                asset_type="gpu",
                asset_subtype="h100",
                manufacturer="NVIDIA",
                model="H100 SXM 80GB",
                serial_number=f"GPU-{i:02d}{g}",
                rack_id=r42.id,
                vendor_id=nvidia.id,
                business_service=node.business_service,
                health="degraded" if i == 2 else "healthy",
                status="warning" if i == 2 else "online",
            )
            gpus.append(gpu)
            rel(node, gpu, "CONTAINS")
            rel(gpu, cold, "COOLED_BY")
            attr(gpu, "gpu_uuid", f"GPU-{i}-{g}-{uuid4().hex[:8]}")
            attr(gpu, "gpu_utilization_percent", min(util, 99), "%", "dcgm")
            attr(gpu, "gpu_memory_utilization_percent", 78 + g, "%", "dcgm")
            attr(gpu, "gpu_memory_used_mb", 64000, "MB", "dcgm")
            attr(gpu, "gpu_memory_total_mb", 81559, "MB", "dcgm")
            attr(gpu, "gpu_temperature_c", temp, "C", "dcgm")
            attr(gpu, "gpu_power_watts", 650 + g * 5, "W", "dcgm")
            attr(gpu, "ecc_corrected", 12 if i == 2 else 0, "count", "dcgm")
            attr(gpu, "ecc_uncorrected", 0, "count", "dcgm")
            attr(gpu, "xid_errors", 1 if i == 2 and g == 0 else 0, "count", "dcgm")
            attr(gpu, "throttling", "thermal" if i == 2 else "none", None, "dcgm")
            attr(gpu, "nvlink_status", "up")
            sample(gpu, "infraasset_gpu_temperature_c", temp, "C")
            sample(gpu, "infraasset_gpu_utilization_percent", min(util, 99), "percent")
            sample(gpu, "infraasset_gpu_power_watts", 650 + g * 5, "W")

        pod = asset(
            name=f"train-job-{i}",
            asset_type="pod",
            business_service=node.business_service,
            health=node.health,
        )
        rel(pod, k8s_node, "RUNS_ON")
        rel(app, pod, "DEPENDS_ON")

    cpu_nodes = []
    for i in range(1, 7):
        node = asset(
            name=f"cpu-node-{i:02d}",
            hostname=f"cpu-node-{i:02d}",
            asset_type="server",
            asset_subtype="cpu",
            manufacturer="Dell",
            model="PowerEdge R760",
            serial_number=f"DL-CPU-{i:04d}",
            rack_id=r10.id,
            room_id=gpu_hall.id,
            rack_unit=i * 2,
            rack_unit_height=2,
            vendor_id=dell.id,
            management_ip=f"10.42.20.{10 + i}",
            business_service="Platform Control Plane",
            purchase_date=TODAY - timedelta(days=800),
            warranty_expiry=TODAY + timedelta(days=40 if i == 1 else 500),
            eol_date=TODAY + timedelta(days=20 if i == 1 else 1200),
            cost=18000,
        )
        cpu_nodes.append(node)
        rel(rack_assets[r10], node, "CONTAINS")
        rel(node, crac, "COOLED_BY")
        attr(node, "cpu_utilization_percent", 22 + i * 9, "%")
        attr(node, "cpu_temperature_c", 48 + i, "C")
        sample(node, "infraasset_cpu_utilization_percent", 22 + i * 9, "percent")

    vm = asset(name="vcenter-prod", asset_type="hypervisor", asset_subtype="vmware", manufacturer="VMware")
    guest = asset(name="jump-01", asset_type="vm", hostname="jump-01")
    rel(guest, vm, "RUNS_ON")
    prox = asset(name="pve-01", asset_type="hypervisor", asset_subtype="proxmox")

    rel(manifold, cdu, "COOLED_BY")
    rel(cdu, pump, "DEPENDS_ON")
    rel(cdu, hx, "COOLED_BY")
    rel(hx, chiller, "COOLED_BY")
    rel(tor, spine, "CONNECTED_TO")
    rel(spine, fw, "ROUTES_THROUGH")
    rel(app, k8s, "DEPLOYED_ON")
    rel(k8s, nas, "STORED_ON")
    rel(rack_assets[r42], pdu_a, "POWERED_BY")
    rel(pdu_a, ups, "POWERED_BY")
    rel(pdu_b, ups, "POWERED_BY")
    rel(ups, gen, "POWERED_BY")
    rel(rack_assets[r42], cdu, "COOLED_BY")

    lan = Network(id=_id(), tenant_id=tenant_id, name="CHN-DC1 Fabric", network_type="ai_fabric", site_id=site.id)
    db.add(lan)
    db.flush()
    vlan_mgmt = Vlan(id=_id(), tenant_id=tenant_id, network_id=lan.id, vlan_id=10, name="mgmt", purpose="OOB")
    vlan_gpu = Vlan(id=_id(), tenant_id=tenant_id, network_id=lan.id, vlan_id=100, name="gpu-data", purpose="RoCEv2")
    db.add_all([vlan_mgmt, vlan_gpu])
    db.flush()
    sn_mgmt = Subnet(id=_id(), tenant_id=tenant_id, vlan_id=vlan_mgmt.id, site_id=site.id, cidr="10.42.0.0/24", gateway="10.42.0.1", purpose="mgmt", utilization_percent=22)
    sn_gpu = Subnet(id=_id(), tenant_id=tenant_id, vlan_id=vlan_gpu.id, site_id=site.id, cidr="10.42.10.0/24", gateway="10.42.10.1", purpose="gpu", utilization_percent=41)
    db.add_all([sn_mgmt, sn_gpu])
    db.flush()
    for node in gpu_nodes:
        db.add(
            IpAddress(
                id=_id(),
                tenant_id=tenant_id,
                subnet_id=sn_gpu.id,
                asset_id=node.id,
                address=node.management_ip or "",
                status="allocated",
                role="bmc",
                dns_name=node.fqdn,
            )
        )
        db.add(
            DnsRecord(
                id=_id(),
                tenant_id=tenant_id,
                name=node.fqdn or node.name,
                record_type="A",
                value=node.management_ip or "",
                zone="chn.wecrew.in",
                asset_id=node.id,
            )
        )

    aws = CloudAccount(id=_id(), tenant_id=tenant_id, provider="aws", name="WeCrew Prod", account_id="111122223333", vault_path="secret/cloud/aws/prod")
    azure = CloudAccount(id=_id(), tenant_id=tenant_id, provider="azure", name="WeCrew Corp", account_id="sub-9aa1")
    gcp = CloudAccount(id=_id(), tenant_id=tenant_id, provider="gcp", name="WeCrew Analytics", account_id="wecrew-analytics")
    db.add_all([aws, azure, gcp])
    db.flush()
    eks = CloudResource(id=_id(), tenant_id=tenant_id, account_id=aws.id, provider="aws", resource_type="eks", name="prod-eks", region="ap-south-1", native_id="arn:aws:eks:ap-south-1:111122223333:cluster/prod-eks")
    dx = CloudResource(id=_id(), tenant_id=tenant_id, account_id=aws.id, provider="aws", resource_type="direct_connect", name="CHN-DX", region="ap-south-1", native_id="dxcon-abc")
    s3 = CloudResource(id=_id(), tenant_id=tenant_id, account_id=aws.id, provider="aws", resource_type="s3", name="wecrew-checkpoints", region="ap-south-1", native_id="wecrew-checkpoints")
    db.add_all([eks, dx, s3])
    eks_asset = asset(name="prod-eks", asset_type="cloud_resource", asset_subtype="eks", site_id=None, business_service="Hybrid Inference")
    dx_asset = asset(name="CHN-DX", asset_type="cloud_resource", asset_subtype="direct_connect", business_service="Hybrid Connectivity")
    eks.asset_id = eks_asset.id
    dx.asset_id = dx_asset.id
    rel(eks_asset, dx_asset, "CONNECTED_TO")
    rel(dx_asset, fw, "CONNECTED_TO")

    db.add(
        Alert(
            id=_id(),
            tenant_id=tenant_id,
            asset_id=cdu.id,
            severity="critical",
            title="CDU-03 coolant flow below setpoint",
            message="Flow 118 lpm vs 160 lpm design. Pump speed 91%. GPU thermal throttling on gpu-node-02.",
            source="modbus",
        )
    )
    db.add(
        Alert(
            id=_id(),
            tenant_id=tenant_id,
            asset_id=gpus[8].id,
            severity="high",
            title="H100 thermal throttling on gpu-node-02-gpu0",
            message="DCGM throttle thermal active. Temperature 83C. XID 1 observed.",
            source="dcgm",
        )
    )
    db.add(
        Alert(
            id=_id(),
            tenant_id=tenant_id,
            asset_id=pdu_a.id,
            severity="medium",
            title="PDU-R42-A load 86%",
            message="Rack R42 approaching PDU redundancy threshold.",
            source="snmp",
        )
    )
    db.add(
        Incident(
            id=_id(),
            tenant_id=tenant_id,
            title="Inference latency on inference-gateway",
            severity="high",
            status="investigating",
            business_service="GPU Inference",
            summary="p95 latency 3.2x baseline since CDU-03 flow drop.",
        )
    )
    db.add(
        Change(
            id=_id(),
            tenant_id=tenant_id,
            title="Replace CDU-03 primary pump",
            change_type="hardware",
            status="scheduled",
            risk="high",
            asset_id=cdu.id,
            window_start=NOW + timedelta(days=2),
            window_end=NOW + timedelta(days=2, hours=4),
        )
    )
    db.add(
        Maintenance(
            id=_id(),
            tenant_id=tenant_id,
            title="UPS-A battery string test",
            status="planned",
            asset_id=ups.id,
            impact="No IT impact if generator is available.",
            starts_at=NOW + timedelta(days=9),
            ends_at=NOW + timedelta(days=9, hours=2),
        )
    )

    db.add(Warranty(id=_id(), tenant_id=tenant_id, asset_id=gpu_nodes[2].id, vendor_id=supermicro.id, start_date=TODAY - timedelta(days=400), end_date=TODAY + timedelta(days=18), coverage="4H"))
    db.add(Contract(id=_id(), tenant_id=tenant_id, vendor_id=vertiv.id, name="CDU AMC 2026", contract_type="AMC", start_date=TODAY - timedelta(days=90), end_date=TODAY + timedelta(days=275), value=84000))
    db.add(License(id=_id(), tenant_id=tenant_id, name="VMware vSphere", vendor_id=dell.id, seats=32, used=18, expiry=TODAY + timedelta(days=120)))

    db.add(
        Prediction(
            id=_id(),
            tenant_id=tenant_id,
            asset_id=pump.id,
            prediction_type="cdu_pump_degradation",
            summary="Pump speed has been above 88% for 14 days while flow declined 21%.",
            confidence="likely",
            evidence="coolant_flow_lpm=118 (design 160); cdu_pump_speed_percent=91; GPU thermal throttle on gpu-node-02",
            horizon_days=14,
        )
    )
    db.add(
        Recommendation(
            id=_id(),
            tenant_id=tenant_id,
            title="Fail-open liquid loop or relocate inference pods",
            category="cooling",
            body="R42 cooling headroom is 13.6%. Do not add another 8-GPU chassis until CDU-03 is restored.",
            evidence="rack R42 cooling used 43.2/50 kW; CDU-03 load 88%",
            confidence="confirmed",
        )
    )
    db.add(
        CapacitySnapshot(
            id=_id(),
            tenant_id=tenant_id,
            scope_type="rack",
            scope_id=r42.id,
            resource="power_kw",
            used=41.6,
            maximum=48.0,
            available=6.4,
            headroom_percent=13.3,
            risk="high",
            forecast="At current growth, R42 power headroom is exhausted in ~40 days.",
        )
    )

    db.commit()
    return {"tenant_id": tenant_id, "site": site.code, "rack": r42.name, "cdu": cdu.name}


def main() -> None:
    from app.core.base import Base
    from app.core.db import SessionLocal, engine

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print(seed(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()
