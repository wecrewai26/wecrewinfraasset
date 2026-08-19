from sqlalchemy.orm import Session

from app.models.asset import Asset, AssetAttribute
from app.models.datacenter import Rack


def _attr_map(db: Session, asset_id: str) -> dict[str, str]:
    rows = db.query(AssetAttribute).filter(AssetAttribute.asset_id == asset_id).all()
    return {r.key: r.value for r in rows}


def _headroom(used: float, maximum: float) -> tuple[float, float, str]:
    available = max(maximum - used, 0.0)
    pct = 0.0 if maximum <= 0 else (available / maximum) * 100
    if pct < 10:
        risk = "critical"
    elif pct < 20:
        risk = "high"
    elif pct < 35:
        risk = "medium"
    else:
        risk = "low"
    return available, pct, risk


def rack_capacity(db: Session, tenant_id: str, rack: Rack) -> dict:
    servers = (
        db.query(Asset)
        .filter(Asset.tenant_id == tenant_id, Asset.rack_id == rack.id, Asset.asset_type == "server")
        .all()
    )
    gpus = (
        db.query(Asset)
        .filter(Asset.tenant_id == tenant_id, Asset.rack_id == rack.id, Asset.asset_type == "gpu")
        .all()
    )
    power_avail, power_pct, power_risk = _headroom(rack.power_used_kw, rack.power_capacity_kw)
    cool_avail, cool_pct, cool_risk = _headroom(rack.cooling_used_kw, rack.cooling_capacity_kw)
    ru_avail = max(rack.ru_total - rack.ru_used, 0)
    ru_pct = 0.0 if rack.ru_total == 0 else (ru_avail / rack.ru_total) * 100
    return {
        "rack": rack.name,
        "rack_id": rack.id,
        "space": {
            "used": rack.ru_used,
            "maximum": rack.ru_total,
            "available": ru_avail,
            "headroom_percent": round(ru_pct, 1),
        },
        "power_kw": {
            "used": rack.power_used_kw,
            "maximum": rack.power_capacity_kw,
            "available": round(power_avail, 2),
            "headroom_percent": round(power_pct, 1),
            "risk": power_risk,
        },
        "cooling_kw": {
            "used": rack.cooling_used_kw,
            "maximum": rack.cooling_capacity_kw,
            "available": round(cool_avail, 2),
            "headroom_percent": round(cool_pct, 1),
            "risk": cool_risk,
        },
        "weight_kg": {
            "used": rack.weight_used_kg,
            "maximum": rack.weight_capacity_kg,
            "available": round(max(rack.weight_capacity_kg - rack.weight_used_kg, 0), 1),
        },
        "servers": len(servers),
        "gpus": len(gpus),
    }


def capacity_overview(db: Session, tenant_id: str) -> list[dict]:
    rows = []
    racks = db.query(Rack).filter(Rack.tenant_id == tenant_id).all()
    for rack in racks:
        cap = rack_capacity(db, tenant_id, rack)
        for resource in ("power_kw", "cooling_kw", "space"):
            block = cap[resource]
            rows.append(
                {
                    "scope_type": "rack",
                    "scope_id": rack.id,
                    "scope_name": rack.name,
                    "resource": resource,
                    "used": block["used"],
                    "maximum": block["maximum"],
                    "available": block["available"],
                    "headroom_percent": block["headroom_percent"],
                    "risk": block.get("risk", "low"),
                }
            )
    gpu_count = db.query(Asset).filter(Asset.tenant_id == tenant_id, Asset.asset_type == "gpu").count()
    gpu_util_rows = (
        db.query(AssetAttribute)
        .filter(AssetAttribute.tenant_id == tenant_id, AssetAttribute.key == "gpu_utilization_percent")
        .all()
    )
    if gpu_util_rows:
        avg = sum(float(r.value) for r in gpu_util_rows) / len(gpu_util_rows)
        rows.append(
            {
                "scope_type": "fleet",
                "scope_id": None,
                "scope_name": "GPU fleet",
                "resource": "gpu",
                "used": round(avg, 1),
                "maximum": 100.0,
                "available": round(100 - avg, 1),
                "headroom_percent": round(100 - avg, 1),
                "risk": "low" if avg < 70 else "medium" if avg < 85 else "high",
                "gpu_count": gpu_count,
            }
        )
    return rows


def advise_gpu_server_placement(
    db: Session,
    tenant_id: str,
    rack_name: str,
    gpu_count: int = 8,
    ru_needed: int = 4,
    power_kw: float = 10.2,
    cooling_kw: float = 10.2,
    weight_kg: float = 85.0,
    network_ports: int = 4,
) -> dict:
    rack = db.query(Rack).filter(Rack.tenant_id == tenant_id, Rack.name == rack_name).one_or_none()
    checks = []
    if rack is None:
        return {
            "verdict": "FAIL",
            "rack": rack_name,
            "reason": "Rack not found",
            "checks": [],
            "alternatives": _alternatives(db, tenant_id, ru_needed, power_kw, cooling_kw, weight_kg),
        }

    cap = rack_capacity(db, tenant_id, rack)

    def add(name: str, ok: bool, detail: str, warn: bool = False) -> None:
        checks.append({"name": name, "result": "PASS" if ok and not warn else "WARNING" if warn else "FAIL", "detail": detail})

    add("Rack space", cap["space"]["available"] >= ru_needed, f"{cap['space']['available']} RU free, need {ru_needed}")
    add("Power", cap["power_kw"]["available"] >= power_kw, f"{cap['power_kw']['available']} kW free, need {power_kw} kW")
    add("Cooling", cap["cooling_kw"]["available"] >= cooling_kw, f"{cap['cooling_kw']['available']} kW free, need {cooling_kw} kW")
    add("Weight", cap["weight_kg"]["available"] >= weight_kg, f"{cap['weight_kg']['available']} kg free, need {weight_kg} kg")
    add("Network ports", True, f"{network_ports} ports requested — ToR port inventory assumed available", warn=True)
    add("GPU count", True, f"{gpu_count} GPUs requested for this chassis")

    fails = [c for c in checks if c["result"] == "FAIL"]
    warns = [c for c in checks if c["result"] == "WARNING"]
    verdict = "FAIL" if fails else "WARNING" if warns else "PASS"
    return {
        "verdict": verdict,
        "rack": rack.name,
        "rack_id": rack.id,
        "requested": {
            "gpu_count": gpu_count,
            "ru": ru_needed,
            "power_kw": power_kw,
            "cooling_kw": cooling_kw,
            "weight_kg": weight_kg,
        },
        "checks": checks,
        "capacity": cap,
        "alternatives": _alternatives(db, tenant_id, ru_needed, power_kw, cooling_kw, weight_kg, exclude=rack.id),
    }


def _alternatives(
    db: Session,
    tenant_id: str,
    ru_needed: int,
    power_kw: float,
    cooling_kw: float,
    weight_kg: float,
    exclude: str | None = None,
) -> list[dict]:
    out = []
    for rack in db.query(Rack).filter(Rack.tenant_id == tenant_id).all():
        if exclude and rack.id == exclude:
            continue
        cap = rack_capacity(db, tenant_id, rack)
        if (
            cap["space"]["available"] >= ru_needed
            and cap["power_kw"]["available"] >= power_kw
            and cap["cooling_kw"]["available"] >= cooling_kw
            and cap["weight_kg"]["available"] >= weight_kg
        ):
            out.append({"rack": rack.name, "rack_id": rack.id, "verdict": "PASS", "capacity": cap})
    return out[:5]
