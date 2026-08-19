from sqlalchemy.orm import Session

from app.models.identity import AuditLog


def audit(
    db: Session,
    *,
    tenant_id: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: str | None = None,
    actor_id: str | None = None,
    actor_email: str | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    row = AuditLog(
        tenant_id=tenant_id,
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(row)
    db.flush()
    return row
