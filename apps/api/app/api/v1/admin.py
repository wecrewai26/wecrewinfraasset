from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_current_user, require_admin, require_audit
from app.core.db import get_db
from app.models.asset import Asset
from app.models.identity import AuditLog, Credential, User
from app.models.lifecycle import Contract, License, Vendor, Warranty
from app.models.telemetry import Prediction, Recommendation
from app.schemas.common import UserOut

admin_router = APIRouter(tags=["administration"])


def _dump(row) -> dict:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


def _asset_ref(db: Session, asset_id: str | None) -> dict | None:
    if not asset_id:
        return None
    asset = db.query(Asset).filter(Asset.id == asset_id).one_or_none()
    if asset is None:
        return None
    return {
        "id": asset.id,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "health": asset.health,
        "hostname": asset.hostname,
        "serial_number": asset.serial_number,
        "model": asset.model,
        "manufacturer": asset.manufacturer,
    }


def _vendor_ref(db: Session, vendor_id: str | None) -> dict | None:
    if not vendor_id:
        return None
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).one_or_none()
    if vendor is None:
        return None
    return {
        "id": vendor.id,
        "name": vendor.name,
        "category": vendor.category,
        "support_email": vendor.support_email,
        "support_phone": vendor.support_phone,
    }


def _warranty_payload(db: Session, row: Warranty) -> dict:
    return {**_dump(row), "asset": _asset_ref(db, row.asset_id), "vendor": _vendor_ref(db, row.vendor_id)}


def _contract_payload(db: Session, row: Contract) -> dict:
    return {**_dump(row), "vendor": _vendor_ref(db, row.vendor_id)}


def _license_payload(db: Session, row: License) -> dict:
    return {**_dump(row), "vendor": _vendor_ref(db, row.vendor_id), "asset": _asset_ref(db, row.asset_id)}


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
def vendors(
    db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]
):
    rows = db.query(Vendor).filter(Vendor.tenant_id == principal.tenant_id).all()
    assets = db.query(Asset).filter(Asset.tenant_id == principal.tenant_id, Asset.vendor_id.isnot(None)).all()
    count_by_vendor: dict[str, int] = {}
    for asset in assets:
        if asset.vendor_id:
            count_by_vendor[asset.vendor_id] = count_by_vendor.get(asset.vendor_id, 0) + 1
    return {"items": [{**_dump(r), "asset_count": count_by_vendor.get(r.id, 0)} for r in rows]}


@admin_router.get("/vendors/{vendor_id}")
def vendor_detail(
    vendor_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    row = (
        db.query(Vendor).filter(Vendor.id == vendor_id, Vendor.tenant_id == principal.tenant_id).one_or_none()
    )
    if row is None:
        raise HTTPException(404, "Vendor not found")
    assets = (
        db.query(Asset)
        .filter(Asset.tenant_id == principal.tenant_id, Asset.vendor_id == row.id)
        .order_by(Asset.name)
        .all()
    )
    warranties = (
        db.query(Warranty)
        .filter(Warranty.tenant_id == principal.tenant_id, Warranty.vendor_id == row.id)
        .all()
    )
    contracts = (
        db.query(Contract)
        .filter(Contract.tenant_id == principal.tenant_id, Contract.vendor_id == row.id)
        .all()
    )
    licenses = (
        db.query(License).filter(License.tenant_id == principal.tenant_id, License.vendor_id == row.id).all()
    )
    return {
        **_dump(row),
        "assets": [_asset_ref(db, a.id) for a in assets],
        "warranties": [_warranty_payload(db, w) for w in warranties],
        "contracts": [_contract_payload(db, c) for c in contracts],
        "licenses": [_license_payload(db, lic) for lic in licenses],
    }


@admin_router.get("/contracts")
def contracts(
    db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]
):
    rows = db.query(Contract).filter(Contract.tenant_id == principal.tenant_id).all()
    return {"items": [_contract_payload(db, r) for r in rows]}


@admin_router.get("/contracts/{contract_id}")
def contract_detail(
    contract_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    row = (
        db.query(Contract)
        .filter(Contract.id == contract_id, Contract.tenant_id == principal.tenant_id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(404, "Contract not found")
    return _contract_payload(db, row)


@admin_router.get("/warranties")
def warranties(
    db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]
):
    rows = db.query(Warranty).filter(Warranty.tenant_id == principal.tenant_id).all()
    return {"items": [_warranty_payload(db, r) for r in rows]}


@admin_router.get("/warranties/{warranty_id}")
def warranty_detail(
    warranty_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    row = (
        db.query(Warranty)
        .filter(Warranty.id == warranty_id, Warranty.tenant_id == principal.tenant_id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(404, "Warranty not found")
    return _warranty_payload(db, row)


@admin_router.get("/licenses")
def licenses(
    db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]
):
    rows = db.query(License).filter(License.tenant_id == principal.tenant_id).all()
    return {"items": [_license_payload(db, r) for r in rows]}


@admin_router.get("/licenses/{license_id}")
def license_detail(
    license_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
):
    row = (
        db.query(License)
        .filter(License.id == license_id, License.tenant_id == principal.tenant_id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(404, "License not found")
    return _license_payload(db, row)


@admin_router.get("/predictions")
def predictions(
    db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]
):
    return {
        "items": [
            _dump(r) for r in db.query(Prediction).filter(Prediction.tenant_id == principal.tenant_id).all()
        ]
    }


@admin_router.get("/recommendations")
def recommendations(
    db: Annotated[Session, Depends(get_db)], principal: Annotated[Principal, Depends(get_current_user)]
):
    return {
        "items": [
            _dump(r)
            for r in db.query(Recommendation).filter(Recommendation.tenant_id == principal.tenant_id).all()
        ]
    }
