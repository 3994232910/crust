"""
Database models package.

This package contains all database models organized by domain:
- user: User authentication and management
- item: Generic content items
- forge: Forge notes and AI request schemas
- dashboard: Evolution, tasks, logs, kanban, activity
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
    AnnotateRequest,
    CompleteRequest,
    Forge,
    ForgeCreate,
    ForgeUpdate,
    ForgePublic,
    ForgesPublic,
    ImageTo3DRequest,
    LightAdjustRequest,
    LightAdjustWithScreenshotRequest,
    LightAutoOptimizeRequest,
    LightConfig,
    LightOptimizeRequest,
    ModelInfo,
    SummarizeRequest,
)
from app.models.dashboard import (
    ActivityData,
    DashboardData,
    DashboardLog,
    DashboardTask,
    EvolutionLevel,
    HeatmapEntry,
    KanbanData,
    KanbanItem,
    LogCreate,
    LogEntry,
    TaskCreate,
    TaskPublic,
    TaskUpdate,
    UserEvolution,
    UserEvolutionStats,
    WeekPlanDay,
)
from app.models.community import (
    CommunityPost,
    CommunityPostCreate,
    CommunityPostUpdate,
    CommunityPostPublic,
    CommunityPostsPublic,
    UserFollow,
    PostFavorite,
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
    # Forge (ORM + CRUD)
    "Forge",
    "ForgeCreate",
    "ForgeUpdate",
    "ForgePublic",
    "ForgesPublic",
    # Forge (AI request schemas)
    "AnnotateRequest",
    "CompleteRequest",
    "ImageTo3DRequest",
    "LightAdjustRequest",
    "LightAdjustWithScreenshotRequest",
    "LightAutoOptimizeRequest",
    "LightConfig",
    "LightOptimizeRequest",
    "ModelInfo",
    "SummarizeRequest",
    # Dashboard
    "ActivityData",
    "DashboardData",
    "DashboardLog",
    "DashboardTask",
    "EvolutionLevel",
    "HeatmapEntry",
    "KanbanData",
    "KanbanItem",
    "LogCreate",
    "LogEntry",
    "TaskCreate",
    "TaskPublic",
    "TaskUpdate",
    "UserEvolution",
    "UserEvolutionStats",
    "WeekPlanDay",
    # Community
    "CommunityPost",
    "CommunityPostCreate",
    "CommunityPostUpdate",
    "CommunityPostPublic",
    "CommunityPostsPublic",
    "UserFollow",
    "PostFavorite",
    # Common
    "Message",
    "Token",
    "TokenPayload",
    "NewPassword",
]
