from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Relationship(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "source_id",
            "target_id",
            "rel_type",
            name="uq_relationship_edge",
        ),
    )

    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), index=True)
    target_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), index=True)
    rel_type: Mapped[str] = mapped_column(String(64), index=True)
    attributes: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str] = mapped_column(String(32), default="confirmed")
