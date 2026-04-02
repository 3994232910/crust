"""Add avatar_url to User

Revision ID: 5652a0222b3c
Revises: fe56fa70289e
Create Date: 2026-04-02 09:19:02.431083

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '5652a0222b3c'
down_revision = 'fe56fa70289e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('avatar_url', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('user', 'avatar_url')
