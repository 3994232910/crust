"""Add dashboard_task, dashboard_log, user_evolution tables

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
Create Date: 2026-04-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

revision = 'c3d4e5f6a7b8'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'dashboard_task',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=False, server_default=''),
        sa.Column('priority', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='low'),
        sa.Column('completed', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='todo'),
        sa.Column('energy', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dashboard_task_user_id', 'dashboard_task', ['user_id'])

    op.create_table(
        'dashboard_log',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('content', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('impact', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dashboard_log_user_id', 'dashboard_log', ['user_id'])

    op.create_table(
        'user_evolution',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('stage', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='hadean'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
    )


def downgrade():
    op.drop_table('user_evolution')
    op.drop_index('ix_dashboard_log_user_id', table_name='dashboard_log')
    op.drop_table('dashboard_log')
    op.drop_index('ix_dashboard_task_user_id', table_name='dashboard_task')
    op.drop_table('dashboard_task')
