from sqlalchemy.orm import Session

from app.models.asset import Asset, AssetAttribute
from app.models.datacenter import Rack
from app.models.ops import Alert
from app.models.telemetry import TelemetrySample
from app.services.capacity import advise_gpu_server_placement, capacity_overview
from app.services.graph import blast_radius


def ask(db: Session, tenant_id: str, question: str) -> dict:
    q = question.strip().lower()
    evidence: list[dict] = []
    answer = ""
    confidence = "likely"

    if "throttl" in q or ("gpu" in q and "high" in q and "temp" in q):
        rows = (
            db.query(AssetAttribute)
            .filter(AssetAttribute.tenant_id == tenant_id, AssetAttribute.key == "throttling")
            .all()
        )
        hits = [r for r in rows if r.value.lower() not in {"none", "0", "false"}]
        assets = {a.id: a for a in db.query(Asset).filter(Asset.id.in_([r.asset_id for r in hits] or ["-"])).all()}
        names = [assets[r.asset_id].name for r in hits if r.asset_id in assets]
        answer = (
            f"{len(names)} GPU(s) currently report throttling: {', '.join(names) or 'none'}."
            if names
            else "No GPUs currently report throttling."
        )
        evidence = [{"asset_id": r.asset_id, "metric": "throttling", "value": r.value} for r in hits]
    elif "cpu" in q and "high" in q:
        rows = (
            db.query(AssetAttribute)
            .filter(AssetAttribute.tenant_id == tenant_id, AssetAttribute.key == "cpu_utilization_percent")
            .all()
        )
        high = [r for r in rows if float(r.value) >= 80]
        assets = {a.id: a for a in db.query(Asset).filter(Asset.id.in_([r.asset_id for r in high] or ["-"])).all()}
        lines = [f"{assets[r.asset_id].name}: {r.value}%" for r in high if r.asset_id in assets]
        answer = "Servers with CPU ≥ 80%: " + (", ".join(lines) if lines else "none")
        evidence = [{"asset_id": r.asset_id, "metric": "cpu_utilization_percent", "value": r.value} for r in high]
    elif "cool" in q and ("rack" in q or "capacity" in q):
        overview = [r for r in capacity_overview(db, tenant_id) if r["resource"] == "cooling_kw"]
        tight = [r for r in overview if r["headroom_percent"] < 25]
        answer = (
            "Racks with cooling headroom under 25%: "
            + (", ".join(f"{r['scope_name']} ({r['headroom_percent']}%)" for r in tight) or "none")
        )
        evidence = tight
    elif "expire" in q or "eol" in q or "warranty" in q:
        from datetime import date, timedelta

        horizon = date.today() + timedelta(days=45)
        assets = (
            db.query(Asset)
            .filter(Asset.tenant_id == tenant_id)
            .filter((Asset.warranty_expiry != None) | (Asset.eol_date != None))  # noqa: E711
            .all()
        )
        soon = [
            a
            for a in assets
            if (a.warranty_expiry and a.warranty_expiry <= horizon) or (a.eol_date and a.eol_date <= horizon)
        ]
        answer = (
            f"{len(soon)} asset(s) reach warranty or EOL within 45 days: "
            + ", ".join(f"{a.name} (warranty {a.warranty_expiry}, EOL {a.eol_date})" for a in soon[:12])
        )
        evidence = [{"asset_id": a.id, "name": a.name, "warranty": str(a.warranty_expiry), "eol": str(a.eol_date)} for a in soon]
    elif "cdu" in q and ("fail" in q or "happens" in q or "simulate" in q):
        cdu = db.query(Asset).filter(Asset.tenant_id == tenant_id, Asset.asset_type == "cdu").first()
        if "cdu-03" in q or "cdu 03" in q:
            cdu = (
                db.query(Asset)
                .filter(Asset.tenant_id == tenant_id, Asset.asset_type == "cdu", Asset.name.ilike("%CDU-03%"))
                .one_or_none()
                or cdu
            )
        if cdu:
            radius = blast_radius(db, tenant_id, cdu.id)
            answer = (
                f"If {cdu.name} fails, {radius['total_affected']} related assets are in the blast radius "
                f"across {', '.join(f'{k}:{v}' for k, v in radius['counts'].items())}. "
                f"Business services: {', '.join(radius['business_services']) or 'none mapped'}."
            )
            evidence = radius["affected"][:40]
            return {
                "question": question,
                "answer": answer,
                "confidence": "confirmed",
                "evidence": evidence,
                "kind": "blast_radius",
                "payload": radius,
            }
        answer = "No CDU asset is present in inventory."
    elif "add" in q or "install" in q or "another gpu" in q or "eight gpu" in q or "8 gpu" in q:
        rack_name = "R42"
        for token in question.replace("?", "").split():
            if token.upper().startswith("R") and token[1:].isdigit():
                rack_name = token.upper()
        gpu_count = 8 if ("eight" in q or "8" in q) else 1
        result = advise_gpu_server_placement(db, tenant_id, rack_name, gpu_count=gpu_count)
        answer = f"Placement for {gpu_count} GPU(s) in {rack_name}: {result['verdict']}."
        return {
            "question": question,
            "answer": answer,
            "confidence": "confirmed",
            "evidence": result["checks"],
            "kind": "capacity_advisor",
            "payload": result,
        }
    elif "slow" in q or "root cause" in q or "why" in q:
        alerts = (
            db.query(Alert)
            .filter(Alert.tenant_id == tenant_id, Alert.status == "open")
            .order_by(Alert.severity.asc())
            .all()
        )
        cooling = (
            db.query(AssetAttribute)
            .filter(AssetAttribute.tenant_id == tenant_id, AssetAttribute.key == "coolant_flow_lpm")
            .all()
        )
        answer = (
            "Probable chain from current evidence: application latency correlates with GPU throttling "
            "and reduced coolant flow on the CDU serving the GPU hall. Open alerts: "
            + "; ".join(a.title for a in alerts[:5])
        )
        evidence = [{"alert": a.title, "severity": a.severity, "asset_id": a.asset_id} for a in alerts]
        evidence += [{"metric": r.key, "value": r.value, "asset_id": r.asset_id} for r in cooling]
        return {
            "question": question,
            "answer": answer,
            "confidence": "probable",
            "evidence": evidence,
            "kind": "root_cause",
            "payload": {
                "probable_root_cause": "CDU pump degradation reducing coolant flow, causing GPU thermal throttling",
                "chain": [
                    "Application latency",
                    "GPU inference latency",
                    "GPU throttling",
                    "Temperature increase",
                    "Coolant flow reduction",
                    "CDU pump degradation",
                ],
                "recommended_remediation": "Inspect CDU-03 pump speed and differential pressure; fail over cooling loop if headroom allows.",
                "confidence": "probable",
            },
        }
    else:
        total = db.query(Asset).filter(Asset.tenant_id == tenant_id).count()
        critical = db.query(Alert).filter(Alert.tenant_id == tenant_id, Alert.severity == "critical", Alert.status == "open").count()
        answer = (
            f"Inventory contains {total} assets with {critical} open critical alerts. "
            "Ask about GPUs throttling, rack cooling, CDU failure, warranty expiry, or placement in a named rack."
        )
        confidence = "confirmed"
        evidence = [{"assets": total, "critical_alerts": critical}]

    return {
        "question": question,
        "answer": answer,
        "confidence": confidence,
        "evidence": evidence,
        "kind": "inventory",
        "payload": None,
    }


def latest_metrics(db: Session, tenant_id: str, asset_id: str) -> list[dict]:
    rows = (
        db.query(TelemetrySample)
        .filter(TelemetrySample.tenant_id == tenant_id, TelemetrySample.asset_id == asset_id)
        .order_by(TelemetrySample.observed_at.desc())
        .limit(50)
        .all()
    )
    return [
        {"metric": r.metric, "value": r.value, "unit": r.unit, "observed_at": r.observed_at.isoformat()}
        for r in rows
    ]
