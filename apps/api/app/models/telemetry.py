from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utcnow


class TelemetrySample(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "telemetry_samples"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), index=True)
    metric: Mapped[str] = mapped_column(String(128), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    labels: Mapped[str | None] = mapped_column(Text, nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class CapacitySnapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "capacity_snapshots"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    scope_type: Mapped[str] = mapped_column(String(64), index=True)
    scope_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource: Mapped[str] = mapped_column(String(64), index=True)
    used: Mapped[float] = mapped_column(Float)
    maximum: Mapped[float] = mapped_column(Float)
    available: Mapped[float] = mapped_column(Float)
    headroom_percent: Mapped[float] = mapped_column(Float)
    risk: Mapped[str] = mapped_column(String(16), default="low")
    forecast: Mapped[str | None] = mapped_column(Text, nullable=True)


class Prediction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "predictions"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    prediction_type: Mapped[str] = mapped_column(String(64))
    summary: Mapped[str] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(String(32))
    evidence: Mapped[str] = mapped_column(Text)
    horizon_days: Mapped[int] = mapped_column(default=30)


class Recommendation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "recommendations"

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(64))
    body: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="open")
