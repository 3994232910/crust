import uuid
from typing import TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User

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