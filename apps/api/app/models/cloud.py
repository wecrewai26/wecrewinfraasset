from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CloudAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cloud_accounts"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str] = mapped_column(String(128))
    account_id: Mapped[str] = mapped_column(String(128))
    environment: Mapped[str] = mapped_column(String(32), default="production")
    status: Mapped[str] = mapped_column(String(32), default="connected")
    vault_path: Mapped[str | None] = mapped_column(String(512), nullable=True)


class CloudResource(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cloud_resources"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("cloud_accounts.id"), index=True)
    asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    resource_type: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(255))
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    native_id: Mapped[str] = mapped_column(String(255), index=True)
    status: Mapped[str] = mapped_column(String(32), default="running")
    extra: Mapped[str | None] = mapped_column(Text, nullable=True)
