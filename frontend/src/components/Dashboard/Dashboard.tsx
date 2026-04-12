import { useCallback, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { DashboardShell } from '../layout/DashboardShell'
import { DashboardHeader } from '../layout/DashboardHeader'
import { LeftRail } from '../layout/LeftRail'
import { CenterTop } from '../layout/CenterTop'
import { CenterBottom } from '../layout/CenterBottom'
import { RightPanel } from '../layout/RightPanel'
import type { ActivityData, DashboardData, DashboardLog, DashboardTask, EvolutionStage, KanbanData, WeekPlanDay } from '@/types/dashboard'

const apiPrefix = '/api/v1/dashboard'

export function DashboardPage() {
  const { theme, setTheme } = useTheme()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [_logs, setLogs] = useState<DashboardLog[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlanDay[]>([])
  const [kanban, setKanban] = useState<KanbanData>({ todo: [], processing: [], done: [] })
  const [heatmapData, setHeatmapData] = useState<Array<{ date: string; count: number }>>([])
  const [trendData, setTrendData] = useState<number[]>([])
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [isSubmittingLog, setIsSubmittingLog] = useState(false)
  const [_isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshAll = useCallback(async () => {
    try {
      setIsLoading(true)
      const [dashboardDataResponse, tasksDataResponse, logsDataResponse, weekPlanResponse, kanbanResponse, activityResponse] = await Promise.all([
        fetch(`${apiPrefix}/evolution`),
        fetch(`${apiPrefix}/tasks`),
        fetch(`${apiPrefix}/logs`),
        fetch(`${apiPrefix}/week-plan`),
        fetch(`${apiPrefix}/kanban`),
        fetch(`${apiPrefix}/activity`),
      ])

      if (!dashboardDataResponse.ok) throw new Error(`Failed to fetch dashboard: ${dashboardDataResponse.statusText}`)
      if (!tasksDataResponse.ok) throw new Error(`Failed to fetch tasks: ${tasksDataResponse.statusText}`)
      if (!logsDataResponse.ok) throw new Error(`Failed to fetch logs: ${logsDataResponse.statusText}`)
      if (!weekPlanResponse.ok) throw new Error(`Failed to fetch week-plan: ${weekPlanResponse.statusText}`)
      if (!kanbanResponse.ok) throw new Error(`Failed to fetch kanban: ${kanbanResponse.statusText}`)
      if (!activityResponse.ok) throw new Error(`Failed to fetch activity: ${activityResponse.statusText}`)

      const dashboardData = (await dashboardDataResponse.json()) as DashboardData
      const tasksData = (await tasksDataResponse.json()) as DashboardTask[]
      const logsData = (await logsDataResponse.json()) as DashboardLog[]
      const weekPlanData = (await weekPlanResponse.json()) as WeekPlanDay[]
      const kanbanData = (await kanbanResponse.json()) as KanbanData
      const activityData = (await activityResponse.json()) as ActivityData

      setDashboard(dashboardData)
      setTasks(tasksData)
      setLogs(logsData)
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
      const response = await fetch(`${apiPrefix}/tasks/${task.id}`, {
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

  const handleCreateLog = async (content: string) => {
    setIsSubmittingLog(true)
    try {
      const response = await fetch(`${apiPrefix}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) throw new Error(`日志创建失败: ${response.statusText}`)
      const log = (await response.json()) as DashboardLog
      setLogs(prev => [log, ...prev])
      await refreshAll()
    } catch (error) {
      const message = error instanceof Error ? error.message : '日志创建失败'
      setError(message)
    } finally {
      setIsSubmittingLog(false)
    }
  }

  // backend unavailable — render with mock data, show a non-blocking banner

  const isReadyToUpgrade = dashboard?.evolution_level.ready_for_upgrade ?? false
  const currentStage = (dashboard?.evolution_level.stage ?? 'hadean') as EvolutionStage

  return (
    <>
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-sm text-destructive">
          <span>后端连接失败，显示本地数据：{error}</span>
          <button type="button" onClick={refreshAll} className="underline hover:no-underline">重试</button>
        </div>
      )}
    <DashboardShell
      header={
        <DashboardHeader
          productName="Knowledge Core"
          currentStage={currentStage}
          isDarkMode={theme === 'dark'}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
      }
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
      centerTop={<CenterTop stage={currentStage} />}
      centerBottom={<CenterBottom weekPlan={weekPlan} kanban={kanban} />}
      rightPanel={
        <RightPanel
          energy={{
            today: tasks.filter(t => t.completed).reduce((sum, t) => sum + t.energy, 0),
            taskComplete: tasks.filter(t => t.completed).length,
            taskTotal: tasks.length,
          }}
          onLogSubmit={handleCreateLog}
          isSubmittingLog={isSubmittingLog}
          tasks={tasks}
          onTaskToggle={handleToggleTask}
          busyTaskId={busyTaskId}
        />
      }
    />
    </>
  )
}
