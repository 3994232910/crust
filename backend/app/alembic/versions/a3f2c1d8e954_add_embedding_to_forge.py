"""Add embedding vector to forge

Revision ID: a3f2c1d8e954
Revises: 9ed6910b19de
Branch labels: None
Depends on: None

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

from app.models.forge import EMBEDDING_DIM

revision = 'a3f2c1d8e954'
down_revision = '9ed6910b19de'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # TODO: 启用 pgvector 扩展（需要先安装 pgvector）
    # op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 添加 embedding 列（暂时使用文本类型）
    op.add_column('forge', sa.Column('embedding', sa.Text, nullable=True))

    # TODO: 创建 IVFFlat 索引（需要 vector 扩展）
    # op.execute(
    #     "CREATE INDEX IF NOT EXISTS forge_embedding_ivfflat_idx "
    #     "ON forge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    # )
    pass


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS forge_embedding_ivfflat_idx")
    op.drop_column('forge', 'embedding')
