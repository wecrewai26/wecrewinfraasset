from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_current_user, require_write
from app.core.db import get_db
from app.models.ops import DiscoveryJob
from app.schemas.common import DiscoveryJobCreate
from app.services.discovery import run_discovery_job

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.get("/jobs")
def list_jobs(
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
) -> dict:
    rows = (
        db.query(DiscoveryJob)
        .filter(DiscoveryJob.tenant_id == principal.tenant_id)
        .order_by(DiscoveryJob.created_at.desc())
        .limit(100)
        .all()
    )
    return {"items": [_job(j) for j in rows]}


@router.post("/jobs")
def create_job(
    body: DiscoveryJobCreate,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(require_write)],
) -> dict:
    job = DiscoveryJob(
        tenant_id=principal.tenant_id,
        name=body.name,
        ip_range=body.ip_range,
        protocols=body.protocols,
        created_by=principal.id,
        status="queued",
    )
    db.add(job)
    db.flush()
    run_discovery_job(db, job, actor_email=principal.email)
    db.commit()
    db.refresh(job)
    return _job(job)


@router.get("/jobs/{job_id}")
def get_job(
    job_id: str,
    db: Annotated[Session, Depends(get_db)],
    principal: Annotated[Principal, Depends(get_current_user)],
) -> dict:
    job = (
        db.query(DiscoveryJob)
        .filter(DiscoveryJob.id == job_id, DiscoveryJob.tenant_id == principal.tenant_id)
        .one()
    )
    return _job(job)


def _job(job: DiscoveryJob) -> dict:
    return {
        "id": job.id,
        "name": job.name,
        "ip_range": job.ip_range,
        "protocols": job.protocols,
        "status": job.status,
        "assets_found": job.assets_found,
        "log": job.log,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "error": job.error,
    }
