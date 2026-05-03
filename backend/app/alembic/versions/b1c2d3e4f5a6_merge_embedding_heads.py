"""merge embedding heads

Revision ID: b1c2d3e4f5a6
Revises: d22aef3cbaa3
Create Date: 2026-04-12 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = 'd22aef3cbaa3'
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass