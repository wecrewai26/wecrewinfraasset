from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_current_user
from app.core.db import get_db
from app.models.asset import Asset
from app.models.cmdb import Relationship
from app.models.datacenter import Rack, Site
from app.models.ops import Alert, Incident
from app.models.telemetry import TelemetrySample
from app.services.graph import topology_graph

cmdb_router = APIRouter(prefix="/cmdb", tags=["cmdb"])
topology_router = APIRouter(prefix="/topology", tags=["topology"])
overview_router = APIRouter(prefix="/overview", tags=["overview"])


@cmdb_router.get("/relationships")
def relationships(
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
    rel_type: str | None = None,
    asset_id: str | None = None,
    limit: int = Query(500, le=5000),
) -> list[dict]:
    q = db.query(Relationship).filter(Relationship.tenant_id == principal.tenant_id)
    if rel_type:
        q = q.filter(Relationship.rel_type == rel_type)
    if asset_id:
        q = q.filter((Relationship.source_id == asset_id) | (Relationship.target_id == asset_id))
    rows = q.limit(limit).all()
    ids = {r.source_id for r in rows} | {r.target_id for r in rows}
    assets = {
        a.id: a
        for a in db.query(Asset).filter(Asset.tenant_id == principal.tenant_id, Asset.id.in_(ids or ["-"])).all()
    }

    def ref(aid: str) -> dict:
        asset = assets.get(aid)
        if asset is None:
            return {"id": aid, "name": aid[:8], "asset_type": "unknown", "health": "unknown"}
        return {"id": asset.id, "name": asset.name, "asset_type": asset.asset_type, "health": asset.health}

    return [
        {
            "id": r.id,
            "rel_type": r.rel_type,
            "confidence": r.confidence,
            "source_id": r.source_id,
            "target_id": r.target_id,
            "source": ref(r.source_id),
            "target": ref(r.target_id),
        }
        for r in rows
    ]


@topology_router.get("")
def topology(
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
    types: str | None = None,
) -> dict:
    type_list = [t.strip() for t in types.split(",")] if types else None
    return topology_graph(db, principal.tenant_id, type_list)


@overview_router.get("/kpis")
def kpis(
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
) -> dict:
    tid = principal.tenant_id

    def count(*filters) -> int:
        q = db.query(func.count(Asset.id)).filter(Asset.tenant_id == tid, *filters)
        return int(q.scalar() or 0)

    def metric(name: str) -> float:
        row = (
            db.query(func.avg(TelemetrySample.value))
            .filter(TelemetrySample.tenant_id == tid, TelemetrySample.metric == name)
            .scalar()
        )
        return float(row or 0)

    racks = db.query(Rack).filter(Rack.tenant_id == tid).all()
    power = sum(r.power_used_kw for r in racks)
    cooling = sum(r.cooling_used_kw for r in racks)
    cooling_cap = sum(r.cooling_capacity_kw for r in racks)
    headroom = max(cooling_cap - cooling, 0)
    alerts = (
        db.query(func.count(Alert.id))
        .filter(Alert.tenant_id == tid, Alert.status == "open", Alert.severity.in_(["critical", "high"]))
        .scalar()
    )
    incidents = db.query(func.count(Incident.id)).filter(Incident.tenant_id == tid, Incident.status != "resolved").scalar()
    dist = (
        db.query(Asset.asset_type, func.count(Asset.id))
        .filter(Asset.tenant_id == tid)
        .group_by(Asset.asset_type)
        .all()
    )
    sites = db.query(Site).filter(Site.tenant_id == tid).all()
    unhealthy = count(Asset.health.in_(["degraded", "unhealthy"]))
    return {
        "total_assets": count(),
        "physical_servers": count(Asset.asset_type == "server"),
        "virtual_machines": count(Asset.asset_type == "vm"),
        "kubernetes_nodes": count(Asset.asset_type == "kubernetes_node"),
        "gpus": count(Asset.asset_type == "gpu"),
        "network_devices": count(Asset.asset_type.in_(["switch", "router", "firewall", "load_balancer"])),
        "it_power_load_kw": round(power, 1),
        "cooling_load_kw": round(cooling, 1),
        "thermal_headroom_kw": round(headroom, 1),
        "critical_alerts": int(alerts or 0),
        "open_incidents": int(incidents or 0),
        "unhealthy_assets": unhealthy,
        "capacity_risks": sum(1 for r in racks if (r.power_capacity_kw - r.power_used_kw) / max(r.power_capacity_kw, 0.01) < 0.2),
        "asset_distribution": [{"type": t, "count": c} for t, c in dist],
        "sites": [{"id": s.id, "name": s.name, "code": s.code, "city": s.city, "status": s.status} for s in sites],
        "racks": [
            {
                "id": r.id,
                "name": r.name,
                "power_used_kw": r.power_used_kw,
                "power_capacity_kw": r.power_capacity_kw,
                "cooling_used_kw": r.cooling_used_kw,
                "cooling_capacity_kw": r.cooling_capacity_kw,
                "ru_used": r.ru_used,
                "ru_total": r.ru_total,
            }
            for r in racks
        ],
        "gpu_avg_util": metric("infraasset_gpu_utilization_percent"),
        "gpu_avg_temp": metric("infraasset_gpu_temperature_c"),
    }
