"""Revert embedding dimension from 1536 to 1024 for DashScope text-embedding-v3

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None

NEW_DIM = 1024
OLD_DIM = 1536


def upgrade() -> None:
    # TODO: 删除索引（需要 vector 扩展）
    # op.execute("DROP INDEX IF EXISTS forge_embedding_ivfflat_idx")
    op.drop_column('forge', 'embedding')
    op.add_column('forge', sa.Column('embedding', sa.Text, nullable=True))
    # TODO: 创建索引（需要 vector 扩展）
    # op.execute(
    #     "CREATE INDEX IF NOT EXISTS forge_embedding_ivfflat_idx "
    #     "ON forge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    # )
    pass


def downgrade() -> None:
    # TODO: 删除索引（需要 vector 扩展）
    # op.execute("DROP INDEX IF EXISTS forge_embedding_ivfflat_idx")
    op.drop_column('forge', 'embedding')
    op.add_column('forge', sa.Column('embedding', sa.Text, nullable=True))
    # TODO: 创建索引（需要 vector 扩展）
    # op.execute(
    #     "CREATE INDEX IF NOT EXISTS forge_embedding_ivfflat_idx "
    #     "ON forge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    # )
    pass
