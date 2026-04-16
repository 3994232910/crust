"""Add user_activity_ping table for usage-time tracking

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_activity_ping',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('pinged_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_activity_ping_user_id', 'user_activity_ping', ['user_id'])
    op.create_index('ix_user_activity_ping_pinged_at', 'user_activity_ping', ['pinged_at'])


def downgrade():
    op.drop_index('ix_user_activity_ping_pinged_at', table_name='user_activity_ping')
    op.drop_index('ix_user_activity_ping_user_id', table_name='user_activity_ping')
    op.drop_table('user_activity_ping')
