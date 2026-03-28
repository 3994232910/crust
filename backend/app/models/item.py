import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User


def get_datetime_utc() -> datetime:
    """Return the current datetime in UTC timezone."""
    return datetime.now(timezone.utc)


# Shared properties
class ItemBase(SQLModel):
    """Base model for Item containing shared properties."""
    
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=255)
    content: Optional[str] = Field(default=None)
    is_folder: bool = Field(default=False)
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="item.id")


# Properties to receive on item creation
class ItemCreate(ItemBase):
    """Model for creating a new item."""
    
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    """Model for updating item information."""
    
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    """Database model for Item table."""
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: Optional[datetime] = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: Optional["User"] = Relationship(back_populates="items")
    parent: "Item" = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Item.id"}
    )
    children: list["Item"] = Relationship(back_populates="parent", cascade_delete=True)


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    """Model for returning item data via API."""
    
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: Optional[datetime] = None
    parent_id: Optional[uuid.UUID] = None


class ItemsPublic(SQLModel):
    """Model for returning list of items via API."""
    
    data: list[ItemPublic]
    count: int
