"""add forge_links table for bi-directional note linking

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'forgelink',
        sa.Column('source_id', sa.Uuid(), nullable=False),
        sa.Column('target_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['forge.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_id'], ['forge.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('source_id', 'target_id'),
    )
    op.create_index('ix_forgelink_target_id', 'forgelink', ['target_id'])


def downgrade():
    op.drop_index('ix_forgelink_target_id', table_name='forgelink')
    op.drop_table('forgelink')
