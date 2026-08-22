from collections import Counter, defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_current_user
from app.core.db import get_db
from app.models.asset import Asset, AssetAttribute
from app.models.cmdb import Relationship
from app.models.datacenter import Building, Rack, Room, Row, Site
from app.models.network import DnsRecord, IpAddress, Network, Subnet, Vlan
from app.models.ops import Alert, Change, Incident, Maintenance
from app.services.capacity import advise_gpu_server_placement, capacity_overview, rack_capacity
from app.services.copilot import ask, latest_metrics
from app.services.graph import blast_radius
from app.schemas.common import AskRequest, CapacityAdviseRequest, SimulateRequest

dc_router = APIRouter(tags=["data-center"])
intel_router = APIRouter(tags=["intelligence"])
ops_router = APIRouter(tags=["operations"])
net_router = APIRouter(prefix="/ipam", tags=["ipam"])
cloud_router = APIRouter(prefix="/cloud", tags=["cloud"])


def _dump(row) -> dict:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


def _asset_ref(db: Session, asset_id: str | None) -> dict | None:
    if not asset_id:
        return None
    asset = db.query(Asset).filter(Asset.id == asset_id).one_or_none()
    if asset is None:
        return None
    return {"id": asset.id, "name": asset.name, "asset_type": asset.asset_type, "health": asset.health}


def _with_asset(db: Session, row) -> dict:
    payload = _dump(row)
    payload["asset"] = _asset_ref(db, getattr(row, "asset_id", None))
    return payload


@dc_router.get("/data-centers")
def data_centers(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    sites = db.query(Site).filter(Site.tenant_id == principal.tenant_id).all()
    return {"items": [_dump(s) for s in sites]}


@dc_router.get("/racks")
def racks(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Rack).filter(Rack.tenant_id == principal.tenant_id).all()
    return {"items": [{**_dump(r), **rack_capacity(db, principal.tenant_id, r)} for r in rows]}


def _addr_payload(ip: IpAddress, subnets: dict[str, Subnet], vlans: dict[str, Vlan]) -> dict:
    subnet = subnets.get(ip.subnet_id) if ip.subnet_id else None
    vlan = vlans.get(subnet.vlan_id) if subnet and subnet.vlan_id else None
    return {
        "id": ip.id,
        "address": ip.address,
        "role": ip.role,
        "status": ip.status,
        "dns_name": ip.dns_name,
        "cidr": subnet.cidr if subnet else None,
        "gateway": subnet.gateway if subnet else None,
        "vlan": vlan.vlan_id if vlan else None,
        "vlan_name": vlan.name if vlan else None,
    }


def _synthetic_addr(asset: Asset) -> dict | None:
    if not asset.management_ip:
        return None
    role = "bmc" if asset.asset_type == "server" else "mgmt"
    return {
        "address": asset.management_ip,
        "role": role,
        "status": "allocated",
        "dns_name": asset.fqdn,
        "cidr": None,
        "gateway": None,
        "vlan": None,
        "vlan_name": None,
    }


@dc_router.get("/racks/{rack_id}")
def rack_detail(
    rack_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    rack = db.query(Rack).filter(Rack.id == rack_id, Rack.tenant_id == principal.tenant_id).one_or_none()
    if rack is None:
        raise HTTPException(404, "Rack not found")
    site = db.query(Site).filter(Site.id == rack.site_id).one_or_none()
    room = db.query(Room).filter(Room.id == rack.room_id).one_or_none()
    row = db.query(Row).filter(Row.id == rack.row_id).one_or_none()
    building = db.query(Building).filter(Building.id == room.building_id).one_or_none() if room else None
    assets = (
        db.query(Asset)
        .filter(Asset.tenant_id == principal.tenant_id, Asset.rack_id == rack.id)
        .order_by(Asset.rack_unit.asc().nullslast(), Asset.name)
        .all()
    )
    asset_ids = [a.id for a in assets]
    ips = db.query(IpAddress).filter(IpAddress.asset_id.in_(asset_ids or ["-"])).all()
    subnet_ids = {ip.subnet_id for ip in ips if ip.subnet_id}
    subnets = {
        s.id: s for s in db.query(Subnet).filter(Subnet.id.in_(subnet_ids or ["-"])).all()
    }
    vlan_ids = {s.vlan_id for s in subnets.values() if s.vlan_id}
    vlans = {v.id: v for v in db.query(Vlan).filter(Vlan.id.in_(vlan_ids or ["-"])).all()}
    ips_by_asset: dict[str, list[dict]] = defaultdict(list)
    for ip in ips:
        if ip.asset_id:
            ips_by_asset[ip.asset_id].append(_addr_payload(ip, subnets, vlans))

    gpu_ids = {a.id for a in assets if a.asset_type == "gpu"}
    server_ids = [a.id for a in assets if a.asset_type == "server"]
    contains = (
        db.query(Relationship)
        .filter(
            Relationship.tenant_id == principal.tenant_id,
            Relationship.rel_type == "CONTAINS",
            Relationship.source_id.in_(server_ids or ["-"]),
        )
        .all()
    )
    gpus_by_server: Counter[str] = Counter()
    for rel in contains:
        if rel.target_id in gpu_ids:
            gpus_by_server[rel.source_id] += 1

    occupancy = []
    for asset in assets:
        addresses = list(ips_by_asset.get(asset.id, []))
        synthetic = _synthetic_addr(asset)
        if synthetic and not any(row["address"] == synthetic["address"] for row in addresses):
            addresses.insert(0, synthetic)
        occupancy.append(
            {
                "id": asset.id,
                "name": asset.name,
                "asset_type": asset.asset_type,
                "asset_subtype": asset.asset_subtype,
                "hostname": asset.hostname,
                "fqdn": asset.fqdn,
                "serial_number": asset.serial_number,
                "manufacturer": asset.manufacturer,
                "model": asset.model,
                "management_ip": asset.management_ip,
                "rack_unit": asset.rack_unit,
                "rack_unit_height": asset.rack_unit_height or 1,
                "status": asset.status,
                "health": asset.health,
                "environment": asset.environment,
                "criticality": asset.criticality,
                "business_service": asset.business_service,
                "gpu_count": gpus_by_server.get(asset.id, 0),
                "addresses": addresses,
            }
        )

    return {
        **_dump(rack),
        "location": {
            "site_id": site.id if site else None,
            "site_code": site.code if site else None,
            "site_name": site.name if site else None,
            "city": site.city if site else None,
            "country": site.country if site else None,
            "address": site.address if site else None,
            "building": building.name if building else None,
            "room": room.name if room else None,
            "row": row.name if row else None,
        },
        "capacity": rack_capacity(db, principal.tenant_id, rack),
        "elevation": occupancy,
        "addresses": [
            {**addr, "asset_id": asset["id"], "asset_name": asset["name"], "asset_type": asset["asset_type"]}
            for asset in occupancy
            for addr in asset["addresses"]
        ],
    }


@dc_router.get("/sites/{site_id}/tree")
def site_tree(
    site_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    site = db.query(Site).filter(Site.id == site_id, Site.tenant_id == principal.tenant_id).one()
    buildings = db.query(Building).filter(Building.site_id == site.id).all()
    rooms = db.query(Room).filter(Room.site_id == site.id).all()
    rows = db.query(Row).filter(Row.room_id.in_([r.id for r in rooms] or ["-"])).all()
    racks = db.query(Rack).filter(Rack.site_id == site.id).all()
    return {
        "site": _dump(site),
        "buildings": [_dump(b) for b in buildings],
        "rooms": [_dump(r) for r in rooms],
        "rows": [_dump(r) for r in rows],
        "racks": [_dump(r) for r in racks],
    }


@dc_router.get("/gpu")
def gpu_fleet(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    gpus = db.query(Asset).filter(Asset.tenant_id == principal.tenant_id, Asset.asset_type == "gpu").all()
    attrs = db.query(AssetAttribute).filter(AssetAttribute.asset_id.in_([g.id for g in gpus] or ["-"])).all()
    by_asset: dict[str, dict] = {}
    for a in attrs:
        by_asset.setdefault(a.asset_id, {})[a.key] = {"value": a.value, "unit": a.unit, "source": a.source}
    return {
        "items": [
            {
                "id": g.id,
                "name": g.name,
                "model": g.model,
                "health": g.health,
                "status": g.status,
                "rack_id": g.rack_id,
                "business_service": g.business_service,
                "metrics": by_asset.get(g.id, {}),
            }
            for g in gpus
        ]
    }


@dc_router.get("/gpu/{gpu_id}/health")
def gpu_health(
    gpu_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    gpu = db.query(Asset).filter(Asset.id == gpu_id, Asset.tenant_id == principal.tenant_id).one_or_none()
    if gpu is None:
        raise HTTPException(404, "GPU not found")
    return {
        "id": gpu.id,
        "name": gpu.name,
        "health": gpu.health,
        "status": gpu.status,
        "metrics": latest_metrics(db, principal.tenant_id, gpu.id),
        "attributes": [
            {"key": a.key, "value": a.value, "unit": a.unit, "source": a.source}
            for a in db.query(AssetAttribute).filter(AssetAttribute.asset_id == gpu.id).all()
        ],
    }


@dc_router.get("/power")
def power(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    types = ["ups", "pdu", "generator", "ats", "transformer"]
    assets = db.query(Asset).filter(Asset.tenant_id == principal.tenant_id, Asset.asset_type.in_(types)).all()
    return {"items": [_asset_with_attrs(db, a) for a in assets]}


@dc_router.get("/cooling")
def cooling(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    types = ["cdu", "pump", "chiller", "heat_exchanger", "cold_plate", "rack_manifold", "crac", "crah"]
    assets = db.query(Asset).filter(Asset.tenant_id == principal.tenant_id, Asset.asset_type.in_(types)).all()
    return {"items": [_asset_with_attrs(db, a) for a in assets]}


@dc_router.get("/storage")
def storage(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    assets = db.query(Asset).filter(Asset.tenant_id == principal.tenant_id, Asset.asset_type == "storage").all()
    return {"items": [_asset_with_attrs(db, a) for a in assets]}


def _asset_with_attrs(db: Session, asset: Asset) -> dict:
    attrs = db.query(AssetAttribute).filter(AssetAttribute.asset_id == asset.id).all()
    rack = db.query(Rack).filter(Rack.id == asset.rack_id).one_or_none() if asset.rack_id else None
    return {
        "id": asset.id,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "health": asset.health,
        "status": asset.status,
        "model": asset.model,
        "manufacturer": asset.manufacturer,
        "hostname": asset.hostname,
        "management_ip": asset.management_ip,
        "serial_number": asset.serial_number,
        "rack_id": asset.rack_id,
        "rack_name": rack.name if rack else None,
        "attributes": {a.key: a.value for a in attrs},
    }


@intel_router.get("/capacity")
def capacity(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": capacity_overview(db, principal.tenant_id)}


@intel_router.post("/capacity/simulate")
def capacity_simulate(
    body: CapacityAdviseRequest,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    return advise_gpu_server_placement(
        db,
        principal.tenant_id,
        body.rack,
        gpu_count=body.gpu_count,
        ru_needed=body.ru_needed,
        power_kw=body.power_kw,
        cooling_kw=body.cooling_kw,
        weight_kg=body.weight_kg,
    )


@intel_router.post("/ai/capacity-advisor")
def capacity_advisor(
    body: CapacityAdviseRequest,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    return advise_gpu_server_placement(
        db,
        principal.tenant_id,
        body.rack,
        gpu_count=body.gpu_count,
        ru_needed=body.ru_needed,
        power_kw=body.power_kw,
        cooling_kw=body.cooling_kw,
        weight_kg=body.weight_kg,
    )


@intel_router.post("/digital-twin/simulate")
def twin_simulate(
    body: SimulateRequest,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    asset_id = body.asset_id
    if not asset_id and body.asset_name:
        asset = (
            db.query(Asset)
            .filter(Asset.tenant_id == principal.tenant_id, Asset.name == body.asset_name)
            .one_or_none()
        )
        asset_id = asset.id if asset else None
    if not asset_id:
        raise HTTPException(400, "asset_id or asset_name required")
    return blast_radius(db, principal.tenant_id, asset_id)


@intel_router.post("/ai/ask")
def ai_ask(
    body: AskRequest,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    result = ask(db, principal.tenant_id, body.question)
    from app.services.audit import audit

    audit(
        db,
        tenant_id=principal.tenant_id,
        action="ai.ask",
        resource_type="copilot",
        actor_id=principal.id,
        actor_email=principal.email,
        details=body.question[:500],
    )
    db.commit()
    return result


@intel_router.post("/ai/root-cause")
def root_cause(
    body: AskRequest,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    return ask(db, principal.tenant_id, body.question if "why" in body.question.lower() else f"why is {body.question}")


@ops_router.get("/alerts")
def alerts(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Alert).filter(Alert.tenant_id == principal.tenant_id).order_by(Alert.fired_at.desc()).all()
    return {"items": [_with_asset(db, r) for r in rows]}


@ops_router.get("/alerts/{alert_id}")
def alert_detail(
    alert_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    row = db.query(Alert).filter(Alert.id == alert_id, Alert.tenant_id == principal.tenant_id).one_or_none()
    if row is None:
        raise HTTPException(404, "Alert not found")
    body = _with_asset(db, row)
    siblings = []
    if row.asset_id:
        siblings = (
            db.query(Alert)
            .filter(Alert.tenant_id == principal.tenant_id, Alert.asset_id == row.asset_id, Alert.id != row.id)
            .order_by(Alert.fired_at.desc())
            .limit(8)
            .all()
        )
    body["related_alerts"] = [_with_asset(db, a) for a in siblings]
    return body


@ops_router.get("/incidents")
def incidents(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Incident).filter(Incident.tenant_id == principal.tenant_id).all()
    return {"items": [_dump(r) for r in rows]}


@ops_router.get("/incidents/{incident_id}")
def incident_detail(
    incident_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    row = db.query(Incident).filter(Incident.id == incident_id, Incident.tenant_id == principal.tenant_id).one_or_none()
    if row is None:
        raise HTTPException(404, "Incident not found")
    assets = []
    if row.business_service:
        assets = (
            db.query(Asset)
            .filter(Asset.tenant_id == principal.tenant_id, Asset.business_service == row.business_service)
            .limit(20)
            .all()
        )
    open_alerts = (
        db.query(Alert)
        .filter(Alert.tenant_id == principal.tenant_id, Alert.status.in_(["open", "firing"]))
        .order_by(Alert.fired_at.desc())
        .limit(12)
        .all()
    )
    return {
        **_dump(row),
        "assets": [_asset_ref(db, a.id) for a in assets],
        "alerts": [_with_asset(db, a) for a in open_alerts],
    }


@ops_router.get("/changes")
def changes(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Change).filter(Change.tenant_id == principal.tenant_id).all()
    return {"items": [_with_asset(db, r) for r in rows]}


@ops_router.get("/changes/{change_id}")
def change_detail(
    change_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    row = db.query(Change).filter(Change.id == change_id, Change.tenant_id == principal.tenant_id).one_or_none()
    if row is None:
        raise HTTPException(404, "Change not found")
    return _with_asset(db, row)


@ops_router.get("/maintenance")
def maintenance(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Maintenance).filter(Maintenance.tenant_id == principal.tenant_id).all()
    return {"items": [_with_asset(db, r) for r in rows]}


@ops_router.get("/maintenance/{maint_id}")
def maintenance_detail(
    maint_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    row = db.query(Maintenance).filter(Maintenance.id == maint_id, Maintenance.tenant_id == principal.tenant_id).one_or_none()
    if row is None:
        raise HTTPException(404, "Maintenance not found")
    return _with_asset(db, row)


@net_router.get("/subnets")
def subnets(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(Subnet).filter(Subnet.tenant_id == principal.tenant_id).all()]}


@net_router.get("/vlans")
def vlans(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(Vlan).filter(Vlan.tenant_id == principal.tenant_id).all()]}


@net_router.get("/addresses")
def addresses(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(IpAddress).filter(IpAddress.tenant_id == principal.tenant_id).all()]}


@net_router.get("/dns")
def dns(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(DnsRecord).filter(DnsRecord.tenant_id == principal.tenant_id).all()]}


@net_router.get("/networks")
def networks(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(Network).filter(Network.tenant_id == principal.tenant_id).all()]}


@cloud_router.get("/accounts")
def cloud_accounts(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    from app.models.cloud import CloudAccount, CloudResource

    accounts = db.query(CloudAccount).filter(CloudAccount.tenant_id == principal.tenant_id).all()
    resources = db.query(CloudResource).filter(CloudResource.tenant_id == principal.tenant_id).all()
    return {"accounts": [_dump(a) for a in accounts], "resources": [_dump(r) for r in resources]}
