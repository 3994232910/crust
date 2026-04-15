from datetime import datetime, timezone, timedelta, date as date_type
from typing import List, Literal
import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select, func

from app.api.deps import CurrentUser, SessionDep
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
    UserActivityPing,
    UserEvolution,
    UserEvolutionStats,
    WeekPlanDay,
)
from app.models.forge import Forge

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ---------------------------------------------------------------------------
# Default tasks seeded for new users
# ---------------------------------------------------------------------------

_DEFAULT_TASKS = [
    {"title": "整理今日笔记", "description": "将关键内容转化为 Forge 笔记", "priority": "high", "energy": 30},
    {"title": "补充周计划记录", "description": "快速输入本周任务进度", "priority": "medium", "energy": 15},
    {"title": "整理知识关联节点", "description": "为内容添加关联，沉积知识星环", "priority": "low", "energy": 8},
]


def _seed_default_tasks(session: Session, user_id: uuid.UUID) -> None:
    now = datetime.now(timezone.utc)
    for t in _DEFAULT_TASKS:
        task = DashboardTask(
            user_id=user_id,
            title=t["title"],
            description=t["description"],
            priority=t["priority"],
            energy=t["energy"],
            created_at=now,
            updated_at=now,
        )
        session.add(task)
    session.commit()


# ---------------------------------------------------------------------------
# Stat / evolution helpers
# ---------------------------------------------------------------------------

def _get_tasks(session: Session, user_id: uuid.UUID) -> list[DashboardTask]:
    return list(session.exec(
        select(DashboardTask).where(DashboardTask.user_id == user_id)
    ).all())


def _get_logs(session: Session, user_id: uuid.UUID) -> list[DashboardLog]:
    return list(session.exec(
        select(DashboardLog).where(DashboardLog.user_id == user_id)
    ).all())


def _calculate_stats(session: Session, user_id: uuid.UUID) -> UserEvolutionStats:
    tasks = _get_tasks(session, user_id)
    logs = _get_logs(session, user_id)

    forge_count = session.exec(
        select(func.count()).select_from(Forge).where(Forge.owner_id == user_id)
    ).one()

    forge_storage = session.exec(
        select(func.coalesce(func.sum(func.length(Forge.content)), 0))
        .where(Forge.owner_id == user_id)
    ).one()

    total_usage_hours = max(0.5, len(logs) * 1.5)
    total_storage_mb = round((forge_storage or 0) / (1024 * 1024) + len(logs) * 0.0002, 2)
    recent_activity_score = min(100.0, sum(t.energy for t in tasks if t.completed) * 2.5)

    return UserEvolutionStats(
        total_usage_hours=round(total_usage_hours, 1),
        total_files=forge_count,
        total_storage_mb=total_storage_mb,
        recent_activity_score=round(recent_activity_score, 1),
        related_items_count=len(logs),
    )


def _calculate_evolution_level(stats: UserEvolutionStats, stage: str) -> EvolutionLevel:
    time_score = min(100.0, stats.total_usage_hours * 10)
    space_score = min(100.0, stats.total_files * 15)
    activity_score = stats.recent_activity_score
    links_score = min(100.0, stats.related_items_count * 20)
    total_score = round(time_score * 0.25 + space_score * 0.35 + activity_score * 0.25 + links_score * 0.15, 1)

    if stage == "hadean":
        progress = min(100.0, total_score)
    elif stage == "archean":
        progress = min(100.0, max(0.0, (total_score - 100.0) / 2.0))
    else:
        progress = min(100.0, max(0.0, (total_score - 300.0) / 3.0))

    typed_stage = stage if stage in ("hadean", "archean", "phanerozoic") else "hadean"
    return EvolutionLevel(
        stage=typed_stage,  # type: ignore[arg-type]
        progress=round(progress, 1),
        total_score=total_score,
        ready_for_upgrade=stage != "phanerozoic" and progress >= 100.0,
    )


def _get_next_unlock_desc(stage: str, evolution: EvolutionLevel) -> str:
    if stage == "phanerozoic":
        return "已达到最终阶段"
    if evolution.ready_for_upgrade:
        return "已可进化！"
    return f"下一阶段：还需 {round(100.0 - evolution.progress, 1)}% 进度"


def _task_to_public(task: DashboardTask) -> TaskPublic:
    return TaskPublic(
        id=str(task.id),
        title=task.title,
        description=task.description,
        priority=task.priority,  # type: ignore[arg-type]
        completed=task.completed,
        status=task.status,  # type: ignore[arg-type]
        energy=task.energy,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _log_to_public(log: DashboardLog) -> LogEntry:
    return LogEntry(
        id=str(log.id),
        content=log.content,
        impact=log.impact,
        created_at=log.created_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/evolution", response_model=DashboardData)
def get_evolution_data(session: SessionDep, current_user: CurrentUser) -> DashboardData:
    evo_record = session.get(UserEvolution, current_user.id)
    if not evo_record:
        evo_record = UserEvolution(user_id=current_user.id, stage="hadean")
        session.add(evo_record)
        session.commit()

    stats = _calculate_stats(session, current_user.id)
    evolution = _calculate_evolution_level(stats, evo_record.stage)
    return DashboardData(
        user_id=str(current_user.id),
        evolution_level=evolution,
        stats=stats,
        last_updated=datetime.now(timezone.utc),
        next_unlock_desc=_get_next_unlock_desc(evo_record.stage, evolution),
    )


@router.get("/tasks", response_model=List[TaskPublic])
def read_tasks(session: SessionDep, current_user: CurrentUser) -> List[TaskPublic]:
    tasks = _get_tasks(session, current_user.id)
    if not tasks:
        _seed_default_tasks(session, current_user.id)
        tasks = _get_tasks(session, current_user.id)
    return [_task_to_public(t) for t in tasks]


@router.post("/tasks", response_model=TaskPublic, status_code=201)
def create_task(task_in: TaskCreate, session: SessionDep, current_user: CurrentUser) -> TaskPublic:
    now = datetime.now(timezone.utc)
    task = DashboardTask(
        user_id=current_user.id,
        title=task_in.title,
        description=task_in.description or "",
        priority=task_in.priority,
        energy=task_in.energy,
        status=task_in.status,
        created_at=now,
        updated_at=now,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return _task_to_public(task)


@router.patch("/tasks/{task_id}", response_model=TaskPublic)
def update_task(task_id: str, task_update: TaskUpdate, session: SessionDep, current_user: CurrentUser) -> TaskPublic:
    task = session.get(DashboardTask, uuid.UUID(task_id))
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")

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
    session.add(task)
    session.commit()
    session.refresh(task)
    return _task_to_public(task)


@router.get("/logs", response_model=List[LogEntry])
def read_logs(session: SessionDep, current_user: CurrentUser) -> List[LogEntry]:
    logs = list(session.exec(
        select(DashboardLog)
        .where(DashboardLog.user_id == current_user.id)
        .order_by(DashboardLog.created_at.desc())  # type: ignore[union-attr]
    ).all())
    return [_log_to_public(lg) for lg in logs]


@router.post("/logs", response_model=LogEntry, status_code=201)
def create_log(log_create: LogCreate, session: SessionDep, current_user: CurrentUser) -> LogEntry:
    impact = min(10.0, max(1.0, len(log_create.content) / 20.0))
    log = DashboardLog(
        user_id=current_user.id,
        content=log_create.content,
        impact=round(impact, 1),
        created_at=datetime.now(timezone.utc),
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return _log_to_public(log)


@router.get("/kanban", response_model=KanbanData)
def get_kanban(session: SessionDep, current_user: CurrentUser) -> KanbanData:
    tasks = _get_tasks(session, current_user.id)

    def to_item(task: DashboardTask, idx: int) -> KanbanItem:
        return KanbanItem(id=idx, content=task.title, tag=task.priority)

    return KanbanData(
        todo=[to_item(t, i) for i, t in enumerate(tasks) if t.status == "todo"],
        processing=[to_item(t, i) for i, t in enumerate(tasks) if t.status == "processing"],
        done=[to_item(t, i) for i, t in enumerate(tasks) if t.status == "done"],
    )


@router.get("/week-plan", response_model=List[WeekPlanDay])
def get_week_plan(session: SessionDep, current_user: CurrentUser) -> List[WeekPlanDay]:
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    day_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    tasks = _get_tasks(session, current_user.id)

    result = []
    for i in range(7):
        day = monday + timedelta(days=i)
        day_date = day.date()
        day_tasks = [t for t in tasks if t.updated_at.date() == day_date]
        complete = sum(1 for t in day_tasks if t.completed)
        total = len(day_tasks)
        result.append(WeekPlanDay(
            day=day_names[i],
            date=day.strftime("%m/%d"),
            complete=complete,
            total=total,
            progress=round(complete / total * 100) if total > 0 else 0,
        ))

    return result


@router.get("/activity", response_model=ActivityData)
def get_activity(session: SessionDep, current_user: CurrentUser) -> ActivityData:
    today = datetime.now(timezone.utc).date()
    ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)

    pings = list(session.exec(
        select(UserActivityPing)
        .where(UserActivityPing.user_id == current_user.id)
        .where(UserActivityPing.pinged_at >= ninety_days_ago)
    ).all())

    # Group ping counts by date
    ping_counts: dict[date_type, int] = {}
    for p in pings:
        d = p.pinged_at.date()
        ping_counts[d] = ping_counts.get(d, 0) + 1

    # Heatmap: 90 days, count = number of pings that day (any usage = visible dot)
    heatmap = []
    for i in range(90):
        day = today - timedelta(days=i)
        heatmap.append(HeatmapEntry(date=str(day), count=ping_counts.get(day, 0)))

    # Trend: 30 days, value = active minutes (pings × 5 min per ping)
    trend = []
    for i in range(30):
        day = today - timedelta(days=i)
        minutes = ping_counts.get(day, 0) * 5
        trend.append(minutes)

    return ActivityData(heatmap=heatmap, trend=trend)


@router.post("/advance", response_model=EvolutionLevel)
def advance_stage(session: SessionDep, current_user: CurrentUser) -> EvolutionLevel:
    evo_record = session.get(UserEvolution, current_user.id)
    if not evo_record:
        evo_record = UserEvolution(user_id=current_user.id, stage="hadean")
        session.add(evo_record)
        session.commit()

    stats = _calculate_stats(session, current_user.id)
    evolution = _calculate_evolution_level(stats, evo_record.stage)

    if not evolution.ready_for_upgrade:
        raise HTTPException(status_code=400, detail="Stage not ready for upgrade")

    stage_map: dict[str, Literal["hadean", "archean", "phanerozoic"]] = {
        "hadean": "archean",
        "archean": "phanerozoic",
    }
    evo_record.stage = stage_map.get(evo_record.stage, evo_record.stage)
    session.add(evo_record)
    session.commit()

    return _calculate_evolution_level(stats, evo_record.stage)
