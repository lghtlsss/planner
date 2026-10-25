"""Add optional group id to users.

Revision ID: 9ad4197bd38c
Revises: c3801f70c167
Create Date: 2026-10-25 18:37:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9ad4197bd38c"
down_revision: Union[str, Sequence[str], None] = "c3801f70c167"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("group_id", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "group_id")
