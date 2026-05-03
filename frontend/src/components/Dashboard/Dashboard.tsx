import { useCallback, useEffect, useState } from 'react'
import { DashboardShell } from '../layout/DashboardShell'
import { LeftRail } from '../layout/LeftRail'
import KnowledgeMapView from '../Forge/KnowledgeMapView'
import { CenterBottom } from '../layout/CenterBottom'
import { RightPanel } from '../layout/RightPanel'
import type { ActivityData, DashboardData, DashboardTask, EvolutionStage, KanbanData, WeekPlanDay } from '@/types/dashboard'

const apiPrefix = '/api/v1/dashboard'

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, headers: { ...authHeaders(), ...init?.headers } })
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlanDay[]>([])
  const [kanban, setKanban] = useState<KanbanData>({ todo: [], processing: [], done: [] })
  const [heatmapData, setHeatmapData] = useState<Array<{ date: string; count: number }>>([])
  const [trendData, setTrendData] = useState<number[]>([])
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [_isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshAll = useCallback(async () => {
    try {
      setIsLoading(true)
      const [dashboardDataResponse, tasksDataResponse, weekPlanResponse, kanbanResponse, activityResponse] = await Promise.all([
        apiFetch(`${apiPrefix}/evolution`),
        apiFetch(`${apiPrefix}/tasks`),
        apiFetch(`${apiPrefix}/week-plan`),
        apiFetch(`${apiPrefix}/kanban`),
        apiFetch(`${apiPrefix}/activity`),
      ])

      if (!dashboardDataResponse.ok) throw new Error(`Failed to fetch dashboard: ${dashboardDataResponse.statusText}`)
      if (!tasksDataResponse.ok) throw new Error(`Failed to fetch tasks: ${tasksDataResponse.statusText}`)
      if (!weekPlanResponse.ok) throw new Error(`Failed to fetch week-plan: ${weekPlanResponse.statusText}`)
      if (!kanbanResponse.ok) throw new Error(`Failed to fetch kanban: ${kanbanResponse.statusText}`)
      if (!activityResponse.ok) throw new Error(`Failed to fetch activity: ${activityResponse.statusText}`)

      const dashboardData = (await dashboardDataResponse.json()) as DashboardData
      const tasksData = (await tasksDataResponse.json()) as DashboardTask[]
      const weekPlanData = (await weekPlanResponse.json()) as WeekPlanDay[]
      const kanbanData = (await kanbanResponse.json()) as KanbanData
      const activityData = (await activityResponse.json()) as ActivityData

      setDashboard(dashboardData)
      setTasks(tasksData)
      setWeekPlan(weekPlanData)
      setKanban(kanbanData)
      setHeatmapData(activityData.heatmap)
      setTrendData(activityData.trend)
      setError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAll()
    const interval = window.setInterval(refreshAll, 60000)
    return () => window.clearInterval(interval)
  }, [refreshAll])

  const handleToggleTask = async (task: DashboardTask) => {
    setBusyTaskId(task.id)
    try {
      const response = await apiFetch(`${apiPrefix}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      })
      if (!response.ok) throw new Error(`任务更新失败: ${response.statusText}`)
      const updatedTask = (await response.json()) as DashboardTask
      setTasks(prev => prev.map(item => (item.id === updatedTask.id ? updatedTask : item)))
      await refreshAll()
    } catch (error) {
      const message = error instanceof Error ? error.message : '任务更新失败'
      setError(message)
    } finally {
      setBusyTaskId(null)
    }
  }

  const handleCreateTask = async (content: string) => {
    setIsSubmittingTask(true)
    try {
      const response = await apiFetch(`${apiPrefix}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: content, priority: 'medium', energy: 10 }),
      })
      if (!response.ok) throw new Error(`任务创建失败: ${response.statusText}`)
      const task = (await response.json()) as DashboardTask
      setTasks(prev => [...prev, task])
    } catch (error) {
      const message = error instanceof Error ? error.message : '任务创建失败'
      setError(message)
    } finally {
      setIsSubmittingTask(false)
    }
  }

  // backend unavailable — render with mock data, show a non-blocking banner

  const currentStage: EvolutionStage = (dashboard?.evolution_level.stage as EvolutionStage) ?? 'hadean'
  const isReadyToUpgrade = dashboard?.evolution_level.ready_for_upgrade ?? false

  return (
    <>
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-sm text-destructive">
          <span>后端连接失败，显示本地数据：{error}</span>
          <button type="button" onClick={refreshAll} className="underline hover:no-underline">重试</button>
        </div>
      )}
    <DashboardShell
      leftRail={
        <LeftRail
          stage={currentStage}
          progress={dashboard?.evolution_level.progress ?? 0}
          nextUnlock={dashboard?.next_unlock_desc ?? ''}
          readyForUpgrade={isReadyToUpgrade}
          stats={{
            totalNotes: dashboard?.stats.total_files ?? 0,
            storage: `${(dashboard?.stats.total_storage_mb ?? 0).toFixed(1)}MB`,
            activeTime: `${(dashboard?.stats.total_usage_hours ?? 0).toFixed(1)}h`,
            connections: dashboard?.stats.related_items_count ?? 0,
          }}
          heatmapData={heatmapData}
          trendData={trendData}
        />
      }
      centerTop={<div className="h-full w-full"><KnowledgeMapView embedded /></div>}
      centerBottom={<CenterBottom weekPlan={weekPlan} kanban={kanban} />}
      rightPanel={
        <RightPanel
          energy={{
            today: tasks.filter(t => t.completed).reduce((sum, t) => sum + t.energy, 0),
            taskComplete: tasks.filter(t => t.completed).length,
            taskTotal: tasks.length,
          }}
          onTaskCreate={handleCreateTask}
          isSubmittingTask={isSubmittingTask}
          tasks={tasks}
          onTaskToggle={handleToggleTask}
          busyTaskId={busyTaskId}
        />
      }
    />
    </>
  )
}
