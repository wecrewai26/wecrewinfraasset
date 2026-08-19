"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-19
"""

from alembic import op
from sqlalchemy import inspect

from app.core.base import Base
from app.models import *  # noqa: F401,F403

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    for table in reversed(Base.metadata.sorted_tables):
        if inspector.has_table(table.name):
            table.drop(bind)
