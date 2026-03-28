import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Text
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User


def get_datetime_utc() -> datetime:
    """Return the current datetime in UTC timezone."""
    return datetime.now(timezone.utc)


# Shared properties
class ForgeBase(SQLModel):
    """Base model for Forge containing shared properties."""

    title: str = Field(min_length=1, max_length=255)
    content: str = Field(default="", sa_type=Text)  # Markdown content
    is_folder: bool = Field(default=False)
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="forge.id")


# Properties to receive on forge creation
class ForgeCreate(ForgeBase):
    """Model for creating a new forge."""

    pass


# Properties to receive on forge update
class ForgeUpdate(SQLModel):
    """Model for updating forge information."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    content: Optional[str] = Field(default=None, sa_type=Text)
    is_folder: Optional[bool] = None


# Database model
class Forge(ForgeBase, table=True):
    """Database model for Forge table."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: Optional[datetime] = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: Optional[datetime] = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: Optional["User"] = Relationship(back_populates="forges")
    parent: "Forge" = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Forge.id"}
    )
    children: list["Forge"] = Relationship(back_populates="parent", cascade_delete=True)


# Properties to return via API
class ForgePublic(ForgeBase):
    """Model for returning forge data via API."""

    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    parent_id: Optional[uuid.UUID] = None


class ForgesPublic(SQLModel):
    """Model for returning list of forges via API."""

    data: list[ForgePublic]
    count: int
