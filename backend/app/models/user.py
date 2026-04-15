import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.forge import Forge
    from app.models.community import CommunityPost, UserFollow


def get_datetime_utc() -> datetime:
    """Return the current datetime in UTC timezone."""
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    """Base model for User containing shared properties."""
    
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: Optional[str] = Field(default=None, max_length=255)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


# Properties to receive via API on creation
class UserCreate(UserBase):
    """Model for creating a new user."""
    
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    """Model for user registration."""
    
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    """Model for updating user information."""
    
    email: Optional[EmailStr] = Field(default=None, max_length=255)  # type: ignore
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    """Model for user to update their own information."""
    
    full_name: Optional[str] = Field(default=None, max_length=255)
    email: Optional[EmailStr] = Field(default=None, max_length=255)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class UpdatePassword(SQLModel):
    """Model for updating user password."""
    
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    """Database model for User table."""
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: Optional[datetime] = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    forges: list["Forge"] = Relationship(back_populates="owner", cascade_delete=True)
    community_posts: list["CommunityPost"] = Relationship(back_populates="owner", cascade_delete=True)
    followers: list["UserFollow"] = Relationship(
        back_populates="follower",
        sa_relationship_kwargs={"foreign_keys": "[UserFollow.follower_id]"}
    )
    followings: list["UserFollow"] = Relationship(
        back_populates="following",
        sa_relationship_kwargs={"foreign_keys": "[UserFollow.following_id]"}
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    """Model for returning user data via API."""
    
    id: uuid.UUID
    created_at: Optional[datetime] = None


class UsersPublic(SQLModel):
    """Model for returning list of users via API."""
    
    data: list[UserPublic]
    count: int
