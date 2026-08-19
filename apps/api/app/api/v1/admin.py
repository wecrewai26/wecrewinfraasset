from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_current_user, require_admin, require_audit
from app.core.db import get_db
from app.models.identity import AuditLog, Credential, User
from app.models.lifecycle import Contract, License, Vendor, Warranty
from app.models.telemetry import Prediction, Recommendation
from app.schemas.common import UserOut

admin_router = APIRouter(tags=["administration"])


def _dump(row) -> dict:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


@admin_router.get("/users", response_model=list[UserOut])
def users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[Principal, Depends(require_admin)],
) -> list[User]:
    return db.query(User).all()


@admin_router.get("/audit")
def audit_logs(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[Principal, Depends(require_audit)],
) -> dict:
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return {"items": [_dump(r) for r in rows]}


@admin_router.get("/credentials")
def credentials(
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(require_admin)],
) -> dict:
    rows = db.query(Credential).filter(Credential.tenant_id == principal.tenant_id).all()
    return {
        "items": [
            {
                "id": r.id,
                "name": r.name,
                "protocol": r.protocol,
                "username": r.username,
                "vault_path": r.vault_path,
                "has_secret": bool(r.secret_ciphertext),
            }
            for r in rows
        ]
    }


@admin_router.get("/vendors")
def vendors(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(Vendor).filter(Vendor.tenant_id == principal.tenant_id).all()]}


@admin_router.get("/contracts")
def contracts(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(Contract).filter(Contract.tenant_id == principal.tenant_id).all()]}


@admin_router.get("/warranties")
def warranties(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(Warranty).filter(Warranty.tenant_id == principal.tenant_id).all()]}


@admin_router.get("/licenses")
def licenses(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(License).filter(License.tenant_id == principal.tenant_id).all()]}


@admin_router.get("/predictions")
def predictions(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(Prediction).filter(Prediction.tenant_id == principal.tenant_id).all()]}


@admin_router.get("/recommendations")
def recommendations(db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]):
    return {"items": [_dump(r) for r in db.query(Recommendation).filter(Recommendation.tenant_id == principal.tenant_id).all()]}
