from datetime import UTC, datetime, timedelta
from typing import Any
import hashlib
import hmac
import os

from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()

ROLES = [
    "super_admin",
    "platform_admin",
    "asset_admin",
    "network_admin",
    "data_center_engineer",
    "sre",
    "devops_engineer",
    "security_auditor",
    "viewer",
    "vendor",
]

ROLE_LABELS = {
    "super_admin": "Super Admin",
    "platform_admin": "Platform Admin",
    "asset_admin": "Asset Admin",
    "network_admin": "Network Admin",
    "data_center_engineer": "Data Center Engineer",
    "sre": "SRE",
    "devops_engineer": "DevOps Engineer",
    "security_auditor": "Security Auditor",
    "viewer": "Viewer",
    "vendor": "Vendor",
}

WRITE_ROLES = {
    "super_admin",
    "platform_admin",
    "asset_admin",
    "network_admin",
    "data_center_engineer",
    "sre",
    "devops_engineer",
}

ADMIN_ROLES = {"super_admin", "platform_admin"}
AUDIT_ROLES = {"super_admin", "platform_admin", "security_auditor"}


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"pbkdf2${salt.hex()}${digest.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        scheme, salt_hex, digest_hex = hashed.split("$", 2)
    except ValueError:
        return False
    if scheme != "pbkdf2":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), bytes.fromhex(salt_hex), 120_000)
    return hmac.compare_digest(digest.hex(), digest_hex)


def create_access_token(*, user_id: str, tenant_id: str, role: str, email: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_minutes)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "tid": str(tenant_id),
        "role": role,
        "email": email,
        "exp": expire,
        "iss": "infraasset",
    }
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.app_secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise ValueError("invalid token") from exc
