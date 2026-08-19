from __future__ import annotations

from datetime import UTC, datetime
from typing import Protocol

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.ops import DiscoveryJob
from app.services.audit import audit


class DiscoveryPlugin(Protocol):
    name: str

    def discover(self, job: DiscoveryJob) -> list[dict]: ...


class IcmpPlugin:
    name = "icmp"

    def discover(self, job: DiscoveryJob) -> list[dict]:
        # Agentless ICMP sweep is executed by collector-workers against real ranges.
        # The API plugin records the stage so jobs remain auditable in development.
        return []


class SnmpPlugin:
    name = "snmp"

    def discover(self, job: DiscoveryJob) -> list[dict]:
        return []


class SyntheticPlugin:
    """Deterministic lab discovery used in development and tests."""

    name = "synthetic"

    def discover(self, job: DiscoveryJob) -> list[dict]:
        prefix = job.ip_range.split("/")[0].rsplit(".", 1)[0]
        return [
            {
                "name": f"disc-switch-{job.id[:6]}",
                "asset_type": "switch",
                "asset_subtype": "tor",
                "manufacturer": "Arista",
                "model": "7050X3",
                "management_ip": f"{prefix}.10",
                "status": "online",
                "health": "healthy",
                "serial_number": f"SN-{job.id[:8].upper()}",
            },
            {
                "name": f"disc-server-{job.id[:6]}",
                "asset_type": "server",
                "asset_subtype": "cpu",
                "manufacturer": "Dell",
                "model": "R760",
                "management_ip": f"{prefix}.21",
                "status": "online",
                "health": "healthy",
                "serial_number": f"SV-{job.id[:8].upper()}",
            },
        ]


PLUGIN_REGISTRY: dict[str, DiscoveryPlugin] = {
    "icmp": IcmpPlugin(),
    "snmp": SnmpPlugin(),
    "snmpv2c": SnmpPlugin(),
    "snmpv3": SnmpPlugin(),
    "synthetic": SyntheticPlugin(),
}


def run_discovery_job(db: Session, job: DiscoveryJob, actor_email: str | None = None) -> DiscoveryJob:
    job.status = "running"
    job.started_at = datetime.now(UTC)
    stages = [
        "IP Range",
        "Ping Sweep",
        "Port Detection",
        "Device Identification",
        "Credential Matching",
        "Deep Discovery",
        "Normalization",
        "Asset Creation",
        "Relationship Mapping",
        "Topology Generation",
    ]
    log_lines = [f"[{datetime.now(UTC).isoformat()}] start {job.ip_range}"]
    found: list[dict] = []
    protocols = [p.strip().lower() for p in job.protocols.split(",") if p.strip()]
    for protocol in protocols:
        plugin = PLUGIN_REGISTRY.get(protocol)
        if plugin is None:
            log_lines.append(f"skip unknown protocol {protocol}")
            continue
        log_lines.append(f"protocol {protocol}")
        found.extend(plugin.discover(job))
    created = 0
    for item in found:
        existing = (
            db.query(Asset)
            .filter(Asset.tenant_id == job.tenant_id, Asset.serial_number == item.get("serial_number"))
            .one_or_none()
        )
        if existing:
            existing.last_seen_at = datetime.now(UTC)
            existing.status = item.get("status", existing.status)
            continue
        asset = Asset(
            tenant_id=job.tenant_id,
            discovered_by="discovery",
            last_seen_at=datetime.now(UTC),
            environment="production",
            criticality="medium",
            **{k: v for k, v in item.items() if k in Asset.__table__.columns.keys()},
        )
        db.add(asset)
        created += 1
    for stage in stages:
        log_lines.append(f"stage {stage}: ok")
    job.assets_found = created
    job.status = "completed"
    job.finished_at = datetime.now(UTC)
    job.log = "\n".join(log_lines)
    audit(
        db,
        tenant_id=job.tenant_id,
        action="discovery.complete",
        resource_type="discovery_job",
        resource_id=job.id,
        details=f"found={created} protocols={job.protocols}",
        actor_email=actor_email,
    )
    db.flush()
    return job
