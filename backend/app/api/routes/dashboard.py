from datetime import datetime, timezone, timedelta
from typing import List, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


class EvolutionLevel(BaseModel):
    stage: Literal["hadean", "archean", "phanerozoic"]
    progress: float
    total_score: float
    ready_for_upgrade: bool = False


class UserEvolutionStats(BaseModel):
    total_usage_hours: float
    total_files: int
    total_storage_mb: float
    recent_activity_score: float
    related_items_count: int


class DashboardData(BaseModel):
    user_id: str
    evolution_level: EvolutionLevel
    stats: UserEvolutionStats
    last_updated: datetime
    next_unlock_desc: str


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Literal["low", "medium", "high"] = "low"


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    completed: Optional[bool] = None
    status: Optional[Literal["todo", "processing", "done"]] = None


class TaskPublic(TaskBase):
    id: str
    completed: bool
    status: Literal["todo", "processing", "done"] = "todo"
    energy: int
    created_at: datetime
    updated_at: datetime


class LogEntry(BaseModel):
    id: str
    content: str
    impact: float
    created_at: datetime


class LogCreate(BaseModel):
    content: str = Field(min_length=1)


class KanbanItem(BaseModel):
    id: int
    content: str
    tag: str


class KanbanData(BaseModel):
    todo: List[KanbanItem]
    processing: List[KanbanItem]
    done: List[KanbanItem]


class WeekPlanDay(BaseModel):
    day: str
    date: str
    complete: int
    total: int
    progress: int


class HeatmapEntry(BaseModel):
    date: str
    count: int


class ActivityData(BaseModel):
    heatmap: List[HeatmapEntry]
    trend: List[int]


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


task_store: List[TaskPublic] = [
    TaskPublic(
        id=str(uuid4()),
        title="整理今日笔记",
        description="将 Obsidian 中关键任务转化为地质能量。",
        priority="high",
        completed=False,
        status="todo",
        energy=30,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    ),
    TaskPublic(
        id=str(uuid4()),
        title="补充周计划记录",
        description="快速输入这一周的任务笔记，沉积时间能量。",
        priority="medium",
        completed=False,
        status="processing",
        energy=15,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    ),
    TaskPublic(
        id=str(uuid4()),
        title="整理知识关联节点",
        description="为当前内容添加关系标签，生成数据星环。",
        priority="low",
        completed=False,
        status="todo",
        energy=8,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    ),
]

log_store: List[LogEntry] = []
current_stage: Literal["hadean", "archean", "phanerozoic"] = "hadean"


def calculate_stats() -> UserEvolutionStats:
    total_usage_hours = max(0.5, len(log_store) * 1.5)
    total_files = len(task_store)
    total_storage_mb = total_files * 1.0 + len(log_store) * 0.2
    recent_activity_score = min(100.0, sum(t.energy for t in task_store if t.completed) * 2.5)
    related_items_count = len(log_store)

    return UserEvolutionStats(
        total_usage_hours=round(total_usage_hours, 1),
        total_files=total_files,
        total_storage_mb=round(total_storage_mb, 1),
        recent_activity_score=round(recent_activity_score, 1),
        related_items_count=related_items_count,
    )


def calculate_evolution_level(stats: UserEvolutionStats) -> EvolutionLevel:
    time_score = min(100.0, stats.total_usage_hours * 10)
    space_score = min(100.0, stats.total_files * 15)
    activity_score = stats.recent_activity_score
    links_score = min(100.0, stats.related_items_count * 20)
    total_score = round(time_score * 0.25 + space_score * 0.35 + activity_score * 0.25 + links_score * 0.15, 1)

    if current_stage == "hadean":
        progress = min(100.0, total_score / 100.0 * 100.0)
    elif current_stage == "archean":
        progress = min(100.0, max(0.0, (total_score - 100.0) / 200.0) * 100.0)
    else:
        progress = min(100.0, max(0.0, (total_score - 300.0) / 300.0) * 100.0)

    return EvolutionLevel(
        stage=current_stage,
        progress=round(progress, 1),
        total_score=total_score,
        ready_for_upgrade=current_stage != "phanerozoic" and progress >= 100.0,
    )


def get_next_unlock_desc(stage: str, evolution: EvolutionLevel) -> str:
    if stage == "phanerozoic":
        return "已达到最终阶段"
    if evolution.ready_for_upgrade:
        return "已可进化！"
    remaining = round(100.0 - evolution.progress, 1)
    return f"下一阶段：还需 {remaining}% 进度"


@router.get("/evolution", response_model=DashboardData)
def get_evolution_data() -> DashboardData:
    stats = calculate_stats()
    evolution = calculate_evolution_level(stats)
    return DashboardData(
        user_id="demo-user",
        evolution_level=evolution,
        stats=stats,
        last_updated=datetime.now(timezone.utc),
        next_unlock_desc=get_next_unlock_desc(current_stage, evolution),
    )


@router.get("/tasks", response_model=List[TaskPublic])
def read_tasks() -> List[TaskPublic]:
    return task_store


@router.patch("/tasks/{task_id}", response_model=TaskPublic)
def update_task(task_id: str, task_update: TaskUpdate) -> TaskPublic:
    for task in task_store:
        if task.id == task_id:
            if task_update.completed is not None:
                task.completed = task_update.completed
                if task_update.completed:
                    task.status = "done"
                elif task.status == "done":
                    task.status = "todo"
            if task_update.status is not None:
                task.status = task_update.status
                task.completed = task_update.status == "done"
            task.updated_at = datetime.now(timezone.utc)
            return task
    raise HTTPException(status_code=404, detail="Task not found")


@router.get("/logs", response_model=List[LogEntry])
def read_logs() -> List[LogEntry]:
    return sorted(log_store, key=lambda item: item.created_at, reverse=True)


@router.post("/logs", response_model=LogEntry, status_code=201)
def create_log(log_create: LogCreate) -> LogEntry:
    impact = min(10.0, max(1.0, len(log_create.content) / 20.0))
    log_entry = LogEntry(
        id=str(uuid4()),
        content=log_create.content,
        impact=round(impact, 1),
        created_at=datetime.now(timezone.utc),
    )
    log_store.append(log_entry)
    return log_entry


@router.get("/kanban", response_model=KanbanData)
def get_kanban() -> KanbanData:
    def to_item(task: TaskPublic, idx: int) -> KanbanItem:
        return KanbanItem(id=idx, content=task.title, tag=task.priority)

    return KanbanData(
        todo=[to_item(t, i) for i, t in enumerate(task_store) if t.status == "todo"],
        processing=[to_item(t, i) for i, t in enumerate(task_store) if t.status == "processing"],
        done=[to_item(t, i) for i, t in enumerate(task_store) if t.status == "done"],
    )


@router.get("/week-plan", response_model=List[WeekPlanDay])
def get_week_plan() -> List[WeekPlanDay]:
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    day_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

    result = []
    for i in range(7):
        day = monday + timedelta(days=i)
        day_date = day.date()
        day_tasks = [t for t in task_store if t.updated_at.date() == day_date]
        completed_today = [t for t in day_tasks if t.completed]
        total = len(day_tasks)
        complete = len(completed_today)
        progress = round(complete / total * 100) if total > 0 else 0
        result.append(WeekPlanDay(
            day=day_names[i],
            date=day.strftime("%m/%d"),
            complete=complete,
            total=total,
            progress=progress,
        ))

    return result


@router.get("/activity", response_model=ActivityData)
def get_activity() -> ActivityData:
    today = datetime.now(timezone.utc).date()

    heatmap = []
    for i in range(90):
        day = today - timedelta(days=i)
        count = sum(1 for lg in log_store if lg.created_at.date() == day)
        count += sum(1 for t in task_store if t.completed and t.updated_at.date() == day)
        heatmap.append(HeatmapEntry(date=str(day), count=count))

    trend = []
    for i in range(30):
        day = today - timedelta(days=i)
        score = sum(lg.impact * 10 for lg in log_store if lg.created_at.date() == day)
        score += sum(t.energy for t in task_store if t.completed and t.updated_at.date() == day)
        trend.append(int(score))

    return ActivityData(heatmap=heatmap, trend=trend)


@router.post("/advance", response_model=EvolutionLevel)
def advance_stage() -> EvolutionLevel:
    evolution = calculate_evolution_level(calculate_stats())
    if not evolution.ready_for_upgrade:
        raise HTTPException(status_code=400, detail="Stage not ready for upgrade")
    global current_stage
    if current_stage == "hadean":
        current_stage = "archean"
    elif current_stage == "archean":
        current_stage = "phanerozoic"
    evolution = calculate_evolution_level(calculate_stats())
    return evolution