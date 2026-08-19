from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import ADMIN_ROLES, AUDIT_ROLES, WRITE_ROLES, decode_token
from app.models.identity import User

oauth2 = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


class Principal:
    def __init__(self, user: User):
        self.user = user
        self.id = user.id
        self.email = user.email
        self.role = user.role
        self.tenant_id = user.tenant_id


def get_current_user(
    token: Annotated[str, Depends(oauth2)],
    db: Annotated[Session, Depends(get_db)],
) -> Principal:
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("sub"), User.is_active.is_(True)).one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return Principal(user)


def require_write(principal: Annotated[Principal, Depends(get_current_user)]) -> Principal:
    if principal.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Write access required")
    return principal


def require_admin(principal: Annotated[Principal, Depends(get_current_user)]) -> Principal:
    if principal.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")
    return principal


def require_audit(principal: Annotated[Principal, Depends(get_current_user)]) -> Principal:
    if principal.role not in AUDIT_ROLES and principal.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Auditor access required")
    return principal
