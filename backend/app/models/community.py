import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Column, DateTime
from sqlmodel import SQLModel, Field, Relationship
from pgvector.sqlalchemy import Vector

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.user import User

EMBEDDING_DIM = settings.AI_EMBEDDING_DIM


class CommunityPostBase(SQLModel):
    title: str | None = None
    content: str | None = None
    source_forge_id: uuid.UUID | None = None
    is_published: bool = True
    thumbnail: str | None = None


class CommunityPostCreate(CommunityPostBase):
    pass


class CommunityPostUpdate(SQLModel):
    title: str | None = None
    content: str | None = None
    is_published: bool | None = None


class CommunityPostPublic(CommunityPostBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CommunityPostsPublic(SQLModel):
    data: list[CommunityPostPublic]
    count: int


class CommunityPost(CommunityPostBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    owner: "User" = Relationship(back_populates="community_posts")
    embedding: list[float] | None = Field(
        default=None,
        sa_column=Column(Vector(EMBEDDING_DIM), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )


class UserFollow(SQLModel, table=True):
    """用户关注关系表"""
    __tablename__ = "userfollow"
    follower_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    following_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )

    follower: "User" = Relationship(
        back_populates="followers",
        sa_relationship_kwargs={"foreign_keys": "[UserFollow.follower_id]"}
    )
    following: "User" = Relationship(
        back_populates="followings",
        sa_relationship_kwargs={"foreign_keys": "[UserFollow.following_id]"}
    )


class StargazingGroup(SQLModel, table=True):
    """用户自定义的 Star Gazing 分组"""
    __tablename__ = "stargazing_group"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    name: str = Field(max_length=100)
    color: str = Field(max_length=20, default="#60a5fa")


class StargazingAssignment(SQLModel, table=True):
    """某用户把某个关注对象归入哪个分组"""
    __tablename__ = "stargazing_assignment"
    owner_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    target_user_id: uuid.UUID = Field(primary_key=True)
    group_id: uuid.UUID = Field(foreign_key="stargazing_group.id")


class PostFavorite(SQLModel, table=True):
    """帖子收藏表"""
    __tablename__ = "postfavorite"
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    post_id: uuid.UUID = Field(foreign_key="communitypost.id", primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )