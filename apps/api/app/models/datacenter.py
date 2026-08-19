from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Site(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sites"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    code: Mapped[str] = mapped_column(String(32), index=True)
    site_type: Mapped[str] = mapped_column(String(32), default="data_center")
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    country: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="online")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    buildings: Mapped[list["Building"]] = relationship(back_populates="site")


class Building(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "buildings"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    site_id: Mapped[str] = mapped_column(ForeignKey("sites.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    floors: Mapped[int] = mapped_column(Integer, default=1)

    site: Mapped[Site] = relationship(back_populates="buildings")
    rooms: Mapped[list["Room"]] = relationship(back_populates="building")


class Room(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "rooms"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    site_id: Mapped[str] = mapped_column(ForeignKey("sites.id"), index=True)
    building_id: Mapped[str] = mapped_column(ForeignKey("buildings.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    room_type: Mapped[str] = mapped_column(String(32), default="white_space")
    design_power_kw: Mapped[float | None] = mapped_column(Float, nullable=True)
    design_cooling_kw: Mapped[float | None] = mapped_column(Float, nullable=True)

    building: Mapped[Building] = relationship(back_populates="rooms")
    rows: Mapped[list["Row"]] = relationship(back_populates="room")


class Row(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "rows"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), index=True)
    name: Mapped[str] = mapped_column(String(64))

    room: Mapped[Room] = relationship(back_populates="rows")
    racks: Mapped[list["Rack"]] = relationship(back_populates="row")


class Rack(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "racks"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    site_id: Mapped[str] = mapped_column(ForeignKey("sites.id"), index=True)
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), index=True)
    row_id: Mapped[str] = mapped_column(ForeignKey("rows.id"), index=True)
    name: Mapped[str] = mapped_column(String(64), index=True)
    ru_total: Mapped[int] = mapped_column(Integer, default=42)
    ru_used: Mapped[int] = mapped_column(Integer, default=0)
    power_capacity_kw: Mapped[float] = mapped_column(Float, default=12.0)
    power_used_kw: Mapped[float] = mapped_column(Float, default=0.0)
    cooling_capacity_kw: Mapped[float] = mapped_column(Float, default=12.0)
    cooling_used_kw: Mapped[float] = mapped_column(Float, default=0.0)
    weight_capacity_kg: Mapped[float] = mapped_column(Float, default=1500.0)
    weight_used_kg: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(32), default="online")
    cooling_mode: Mapped[str] = mapped_column(String(32), default="hybrid")

    row: Mapped[Row] = relationship(back_populates="racks")
