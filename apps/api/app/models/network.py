from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Network(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "networks"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    network_type: Mapped[str] = mapped_column(String(32), default="lan")
    site_id: Mapped[str | None] = mapped_column(ForeignKey("sites.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="online")


class Vlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vlans"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    network_id: Mapped[str | None] = mapped_column(ForeignKey("networks.id"), nullable=True)
    vlan_id: Mapped[int] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(128))
    purpose: Mapped[str | None] = mapped_column(String(128), nullable=True)


class Subnet(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "subnets"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    vlan_id: Mapped[str | None] = mapped_column(ForeignKey("vlans.id"), nullable=True)
    site_id: Mapped[str | None] = mapped_column(ForeignKey("sites.id"), nullable=True)
    cidr: Mapped[str] = mapped_column(String(64), index=True)
    gateway: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dhcp: Mapped[bool] = mapped_column(Boolean, default=False)
    purpose: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utilization_percent: Mapped[float] = mapped_column(default=0.0)


class IpAddress(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ip_addresses"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    subnet_id: Mapped[str | None] = mapped_column(ForeignKey("subnets.id"), nullable=True)
    asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True, index=True)
    address: Mapped[str] = mapped_column(String(64), index=True)
    ip_version: Mapped[int] = mapped_column(Integer, default=4)
    status: Mapped[str] = mapped_column(String(32), default="allocated")
    role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dns_name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class DnsRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "dns_records"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    record_type: Mapped[str] = mapped_column(String(16), default="A")
    value: Mapped[str] = mapped_column(String(255))
    zone: Mapped[str] = mapped_column(String(255))
    ttl: Mapped[int] = mapped_column(Integer, default=300)
    asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
