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


@dc_router.get("/data-centers")
def data_centers(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    sites = db.query(Site).filter(Site.tenant_id == principal.tenant_id).all()
    return {"items": [_dump(s) for s in sites]}


@dc_router.get("/racks")
def racks(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Rack).filter(Rack.tenant_id == principal.tenant_id).all()
    return {"items": [{**_dump(r), **rack_capacity(db, principal.tenant_id, r)} for r in rows]}


@dc_router.get("/racks/{rack_id}")
def rack_detail(
    rack_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    rack = db.query(Rack).filter(Rack.id == rack_id, Rack.tenant_id == principal.tenant_id).one_or_none()
    if rack is None:
        raise HTTPException(404, "Rack not found")
    assets = (
        db.query(Asset)
        .filter(Asset.tenant_id == principal.tenant_id, Asset.rack_id == rack.id)
        .order_by(Asset.rack_unit.asc().nullslast(), Asset.name)
        .all()
    )
    return {
        **_dump(rack),
        "capacity": rack_capacity(db, principal.tenant_id, rack),
        "elevation": [
            {
                "id": a.id,
                "name": a.name,
                "asset_type": a.asset_type,
                "rack_unit": a.rack_unit,
                "rack_unit_height": a.rack_unit_height or 1,
                "status": a.status,
                "health": a.health,
                "model": a.model,
            }
            for a in assets
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
    return {
        "id": asset.id,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "health": asset.health,
        "status": asset.status,
        "model": asset.model,
        "rack_id": asset.rack_id,
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
    return {"items": [_dump(r) for r in rows]}


@ops_router.get("/incidents")
def incidents(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Incident).filter(Incident.tenant_id == principal.tenant_id).all()
    return {"items": [_dump(r) for r in rows]}


@ops_router.get("/changes")
def changes(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Change).filter(Change.tenant_id == principal.tenant_id).all()
    return {"items": [_dump(r) for r in rows]}


@ops_router.get("/maintenance")
def maintenance(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    rows = db.query(Maintenance).filter(Maintenance.tenant_id == principal.tenant_id).all()
    return {"items": [_dump(r) for r in rows]}


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
