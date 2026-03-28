"""
Database models package.

This package contains all database models organized by domain:
- user: User authentication and management
- item: Generic content items
- forge: Forge notes (Obsidian-like)
- common: Shared utility models
"""

from sqlmodel import SQLModel

from app.models.user import (
    User,
    UserCreate,
    UserUpdate,
    UserRegister,
    UserUpdateMe,
    UpdatePassword,
    UserPublic,
    UsersPublic,
    get_datetime_utc,
)
from app.models.item import (
    Item,
    ItemCreate,
    ItemUpdate,
    ItemPublic,
    ItemsPublic,
)
from app.models.forge import (
    Forge,
    ForgeCreate,
    ForgeUpdate,
    ForgePublic,
    ForgesPublic,
)
from app.models.common import (
    Message,
    Token,
    TokenPayload,
    NewPassword,
)

__all__ = [
    # SQLModel base
    "SQLModel",
    # User
    "User",
    "UserCreate",
    "UserUpdate",
    "UserRegister",
    "UserUpdateMe",
    "UpdatePassword",
    "UserPublic",
    "UsersPublic",
    "get_datetime_utc",
    # Item
    "Item",
    "ItemCreate",
    "ItemUpdate",
    "ItemPublic",
    "ItemsPublic",
    # Forge
    "Forge",
    "ForgeCreate",
    "ForgeUpdate",
    "ForgePublic",
    "ForgesPublic",
    # Common
    "Message",
    "Token",
    "TokenPayload",
    "NewPassword",
]
