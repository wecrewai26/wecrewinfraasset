from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_current_user, require_write
from app.core.db import get_db
from app.models.asset import Asset, AssetAttribute
from app.models.cmdb import Relationship
from app.models.datacenter import Rack, Room, Site
from app.models.network import IpAddress
from app.models.ops import Alert
from app.schemas.common import AssetCreate, AssetList, AssetOut
from app.services.audit import audit

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=AssetList)
def list_assets(
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
    q: str | None = None,
    asset_type: str | None = None,
    status: str | None = None,
    health: str | None = None,
    site_id: str | None = None,
    rack_id: str | None = None,
    environment: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
) -> AssetList:
    query = db.query(Asset).filter(Asset.tenant_id == principal.tenant_id)
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    if status:
        query = query.filter(Asset.status == status)
    if health:
        query = query.filter(Asset.health == health)
    if site_id:
        query = query.filter(Asset.site_id == site_id)
    if rack_id:
        query = query.filter(Asset.rack_id == rack_id)
    if environment:
        query = query.filter(Asset.environment == environment)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Asset.name.ilike(like),
                Asset.hostname.ilike(like),
                Asset.serial_number.ilike(like),
                Asset.management_ip.ilike(like),
                Asset.business_service.ilike(like),
                Asset.model.ilike(like),
            )
        )
    total = query.count()
    items = query.order_by(Asset.name).offset((page - 1) * page_size).limit(page_size).all()
    return AssetList(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=AssetOut)
def create_asset(
    body: AssetCreate,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(require_write)],
) -> Asset:
    asset = Asset(tenant_id=principal.tenant_id, health="unknown", **body.model_dump())
    db.add(asset)
    audit(
        db,
        tenant_id=principal.tenant_id,
        action="asset.create",
        resource_type="asset",
        resource_id=asset.id,
        actor_id=principal.id,
        actor_email=principal.email,
        details=asset.name,
    )
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}")
def get_asset(
    asset_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
) -> dict:
    asset = _get(db, principal.tenant_id, asset_id)
    attrs = db.query(AssetAttribute).filter(AssetAttribute.asset_id == asset.id).all()
    site = db.query(Site).filter(Site.id == asset.site_id).one_or_none() if asset.site_id else None
    room = db.query(Room).filter(Room.id == asset.room_id).one_or_none() if asset.room_id else None
    rack = db.query(Rack).filter(Rack.id == asset.rack_id).one_or_none() if asset.rack_id else None
    rels = (
        db.query(Relationship)
        .filter(
            Relationship.tenant_id == principal.tenant_id,
            or_(Relationship.source_id == asset.id, Relationship.target_id == asset.id),
        )
        .all()
    )
    peer_ids = {r.target_id if r.source_id == asset.id else r.source_id for r in rels}
    peers = {
        a.id: a
        for a in db.query(Asset).filter(Asset.tenant_id == principal.tenant_id, Asset.id.in_(peer_ids or ["-"])).all()
    }
    alerts = (
        db.query(Alert)
        .filter(Alert.tenant_id == principal.tenant_id, Alert.asset_id == asset.id)
        .order_by(Alert.fired_at.desc())
        .limit(25)
        .all()
    )
    addresses = db.query(IpAddress).filter(IpAddress.asset_id == asset.id).all()

    def peer_ref(pid: str) -> dict:
        peer = peers.get(pid)
        if peer is None:
            return {"id": pid, "name": pid[:8], "asset_type": "unknown", "health": "unknown"}
        return {"id": peer.id, "name": peer.name, "asset_type": peer.asset_type, "health": peer.health}

    return {
        **AssetOut.model_validate(asset).model_dump(mode="json"),
        "purchase_date": asset.purchase_date.isoformat() if asset.purchase_date else None,
        "eos_date": asset.eos_date.isoformat() if asset.eos_date else None,
        "cost": asset.cost,
        "currency": asset.currency,
        "tags": asset.tags,
        "location": {
            "site_id": asset.site_id,
            "site_name": site.name if site else None,
            "site_code": site.code if site else None,
            "room_id": asset.room_id,
            "room_name": room.name if room else None,
            "rack_id": asset.rack_id,
            "rack_name": rack.name if rack else None,
            "rack_unit": asset.rack_unit,
            "rack_unit_height": asset.rack_unit_height,
        },
        "attributes": [{"key": a.key, "value": a.value, "unit": a.unit, "source": a.source} for a in attrs],
        "relationships": [
            {
                "id": r.id,
                "rel_type": r.rel_type,
                "confidence": r.confidence,
                "direction": "outbound" if r.source_id == asset.id else "inbound",
                "peer": peer_ref(r.target_id if r.source_id == asset.id else r.source_id),
            }
            for r in rels
        ],
        "alerts": [
            {
                "id": a.id,
                "title": a.title,
                "severity": a.severity,
                "status": a.status,
                "message": a.message,
                "source": a.source,
                "fired_at": a.fired_at.isoformat() if a.fired_at else None,
            }
            for a in alerts
        ],
        "addresses": [
            {
                "id": ip.id,
                "address": ip.address,
                "status": ip.status,
                "role": ip.role,
                "dns_name": ip.dns_name,
            }
            for ip in addresses
        ],
    }


def _get(db: Session, tenant_id: str, asset_id: str) -> Asset:
    asset = db.query(Asset).filter(Asset.tenant_id == tenant_id, Asset.id == asset_id).one_or_none()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset
