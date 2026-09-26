from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Asset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "assets"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    asset_type: Mapped[str] = mapped_column(String(64), index=True)
    asset_subtype: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fqdn: Mapped[str | None] = mapped_column(String(255), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    manufacturer: Mapped[str | None] = mapped_column(String(128), nullable=True)
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="unknown", index=True)
    health: Mapped[str] = mapped_column(String(32), default="unknown", index=True)
    environment: Mapped[str] = mapped_column(String(32), default="production", index=True)
    site_id: Mapped[str | None] = mapped_column(ForeignKey("sites.id"), nullable=True, index=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    rack_id: Mapped[str | None] = mapped_column(ForeignKey("racks.id"), nullable=True, index=True)
    rack_unit: Mapped[int | None] = mapped_column(nullable=True)
    rack_unit_height: Mapped[int | None] = mapped_column(nullable=True)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    vendor_id: Mapped[str | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    warranty_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    eos_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    eol_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    criticality: Mapped[str] = mapped_column(String(16), default="medium")
    business_service: Mapped[str | None] = mapped_column(String(255), nullable=True)
    management_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    discovered_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)

    attributes: Mapped[list["AssetAttribute"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )


class AssetAttribute(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "asset_attributes"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), index=True)
    key: Mapped[str] = mapped_column(String(128), index=True)
    value: Mapped[str] = mapped_column(Text)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)

    asset: Mapped[Asset] = relationship(back_populates="attributes")
