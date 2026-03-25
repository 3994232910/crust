"""merge two heads

Revision ID: f914183cc94c
Revises: 67e16814e0c4, abc123456789
Create Date: 2026-03-25 18:37:45.931031

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'f914183cc94c'
down_revision = ('67e16814e0c4', 'abc123456789')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
