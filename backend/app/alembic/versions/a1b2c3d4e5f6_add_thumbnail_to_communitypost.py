"""add thumbnail to communitypost

Revision ID: a1b2c3d4e5f6
Revises: 6d8ec23f34f9
Create Date: 2026-04-15 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

revision = 'a1b2c3d4e5f6'
down_revision = '6d8ec23f34f9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('communitypost', sa.Column('thumbnail', sqlmodel.sql.sqltypes.AutoString(), nullable=True))


def downgrade():
    op.drop_column('communitypost', 'thumbnail')
