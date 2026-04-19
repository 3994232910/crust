"""Update embedding dimension to 1536 for LiteLLM

Revision ID: d22aef3cbaa3
Revises: a3f2c1d8e954
Create Date: 2026-04-10

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = 'd22aef3cbaa3'
down_revision = 'a3f2c1d8e954'
branch_labels = None
depends_on = None

# 新的 embedding 维度 (OpenAI text-embedding-3-small)
NEW_EMBEDDING_DIM = 1536
# 旧的 embedding 维度 (DashScope text-embedding-v3)
OLD_EMBEDDING_DIM = 1024


def upgrade() -> None:
    # 删除旧的索引
    op.execute("DROP INDEX IF EXISTS forge_embedding_ivfflat_idx")

    # 删除旧的 embedding 列
    op.drop_column('forge', 'embedding')

    # 添加新的 embedding 列（1536维）
    op.add_column('forge', sa.Column('embedding', Vector(NEW_EMBEDDING_DIM), nullable=True))

    # 重新创建 IVFFlat 索引
    op.execute(
        "CREATE INDEX IF NOT EXISTS forge_embedding_ivfflat_idx "
        "ON forge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )


def downgrade() -> None:
    # 删除索引
    op.execute("DROP INDEX IF EXISTS forge_embedding_ivfflat_idx")

    # 删除新的 embedding 列
    op.drop_column('forge', 'embedding')

    # 恢复旧的 embedding 列（1024维）
    op.add_column('forge', sa.Column('embedding', Vector(OLD_EMBEDDING_DIM), nullable=True))

    # 重新创建索引
    op.execute(
        "CREATE INDEX IF NOT EXISTS forge_embedding_ivfflat_idx "
        "ON forge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )
