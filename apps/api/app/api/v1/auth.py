from datetime import UTC, datetime
from typing import Annotated
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_current_user
from app.core.db import get_db
from app.core.security import ROLE_LABELS, create_access_token, hash_password, verify_password
from app.models.identity import Tenant, User
from app.schemas.common import LoginRequest, SignupRequest, TokenResponse, UserOut
from app.services.audit import audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    return _issue(db, body.email, body.password)


@router.post("/signup", response_model=TokenResponse)
def signup(body: SignupRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    email = str(body.email).lower()
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    tenant = Tenant(name=body.organization.strip(), slug=_unique_slug(db, body.organization), status="active")
    db.add(tenant)
    db.flush()

    user = User(
        tenant_id=tenant.id,
        email=email,
        full_name=body.full_name.strip(),
        hashed_password=hash_password(body.password),
        role="platform_admin",
        team="Platform",
        is_active=True,
    )
    db.add(user)
    db.flush()
    return _token_for(db, user, action="signup")


@router.post("/token", response_model=TokenResponse)
def token(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    return _issue(db, form.username, form.password)


def _unique_slug(db: Session, name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40] or "tenant"
    slug = base
    n = 0
    while db.query(Tenant).filter(Tenant.slug == slug).one_or_none():
        n += 1
        slug = f"{base}-{n}"
    return slug


def _issue(db: Session, email: str, password: str) -> TokenResponse:
    user = db.query(User).filter(User.email == email.lower()).one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    return _token_for(db, user, action="login")


def _token_for(db: Session, user: User, *, action: str) -> TokenResponse:
    user.last_login_at = datetime.now(UTC)
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).one()
    audit(
        db,
        tenant_id=user.tenant_id,
        action=action,
        resource_type="user",
        resource_id=user.id,
        actor_id=user.id,
        actor_email=user.email,
    )
    db.commit()
    token = create_access_token(user_id=user.id, tenant_id=user.tenant_id, role=user.role, email=user.email)
    return TokenResponse(
        access_token=token,
        role=user.role,
        email=user.email,
        full_name=user.full_name,
        tenant=tenant.slug,
    )


@router.get("/me", response_model=UserOut)
def me(principal: Annotated[Principal, Depends(get_current_user)]) -> User:
    return principal.user


@router.get("/roles")
def roles() -> dict:
    return {"roles": ROLE_LABELS}
