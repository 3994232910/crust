import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Column
from sqlmodel import SQLModel, Field, Relationship
from pgvector.sqlalchemy import Vector

if TYPE_CHECKING:
    from app.models.user import User

EMBEDDING_DIM = 1536  # OpenAI text-embedding-3-small / DeepSeek 默认维度

class ForgeBase(SQLModel):
    title: str | None = None
    content: str | None = None
    is_folder: bool = False
    parent_id: uuid.UUID | None = None


class ForgeCreate(ForgeBase):
    pass


class ForgeUpdate(SQLModel):
    title: str | None = None
    content: str | None = None
    is_folder: bool | None = None
    parent_id: uuid.UUID | None = None


class ForgePublic(ForgeBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ForgesPublic(SQLModel):
    data: list[ForgePublic]
    count: int


class Forge(ForgeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    owner: "User" = Relationship(back_populates="forges")
    embedding: list[float] | None = Field(
        default=None,
        sa_column=Column(Vector(EMBEDDING_DIM), nullable=True),
    )