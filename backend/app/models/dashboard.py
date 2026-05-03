"""
Dashboard domain models: evolution, tasks, logs, kanban, activity.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# DB table models
# ---------------------------------------------------------------------------

class DashboardTask(SQLModel, table=True):
    __tablename__ = "dashboard_task"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    title: str = Field(max_length=255)
    description: str = Field(default="", max_length=1000)
    priority: str = Field(default="low")       # low | medium | high
    completed: bool = Field(default=False)
    status: str = Field(default="todo")        # todo | processing | done
    energy: int = Field(default=10)
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class DashboardLog(SQLModel, table=True):
    __tablename__ = "dashboard_log"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    content: str
    impact: float = Field(default=1.0)
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class UserActivityPing(SQLModel, table=True):
    """Records a heartbeat every ~5 minutes for each authenticated user session.
    Used to calculate daily active minutes for the activity trend chart.
    """
    __tablename__ = "user_activity_ping"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    pinged_at: datetime = Field(
        default_factory=_utcnow,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class UserEvolution(SQLModel, table=True):
    __tablename__ = "user_evolution"

    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True, ondelete="CASCADE")
    stage: str = Field(default="hadean")   # hadean | archean | phanerozoic


# ---------------------------------------------------------------------------
# API-only schemas (no DB table)
# ---------------------------------------------------------------------------

class EvolutionLevel(SQLModel):
    stage: Literal["hadean", "archean", "phanerozoic"]
    progress: float
    total_score: float
    ready_for_upgrade: bool = False


class UserEvolutionStats(SQLModel):
    total_usage_hours: float
    total_files: int
    total_storage_mb: float
    recent_activity_score: float
    related_items_count: int


class DashboardData(SQLModel):
    user_id: str
    evolution_level: EvolutionLevel
    stats: UserEvolutionStats
    last_updated: datetime
    next_unlock_desc: str


class TaskBase(SQLModel):
    title: str
    description: Optional[str] = ""
    priority: Literal["low", "medium", "high"] = "low"


class TaskCreate(TaskBase):
    energy: int = 10
    status: Literal["todo", "processing", "done"] = "todo"


class TaskUpdate(SQLModel):
    completed: Optional[bool] = None
    status: Optional[Literal["todo", "processing", "done"]] = None


class TaskPublic(TaskBase):
    id: str
    completed: bool
    status: Literal["todo", "processing", "done"] = "todo"
    energy: int
    created_at: datetime
    updated_at: datetime


class LogEntry(SQLModel):
    id: str
    content: str
    impact: float
    created_at: datetime


class LogCreate(SQLModel):
    content: str = Field(min_length=1)


class KanbanItem(SQLModel):
    id: int
    content: str
    tag: str


class KanbanData(SQLModel):
    todo: List[KanbanItem]
    processing: List[KanbanItem]
    done: List[KanbanItem]


class WeekPlanDay(SQLModel):
    day: str
    date: str
    complete: int
    total: int
    progress: int


class HeatmapEntry(SQLModel):
    date: str
    count: int


class ActivityData(SQLModel):
    heatmap: List[HeatmapEntry]
    trend: List[int]
