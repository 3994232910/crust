import { useCallback, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { DashboardShell } from '../layout/DashboardShell'
import { DashboardHeader } from '../layout/DashboardHeader'
import { LeftRail } from '../layout/LeftRail'
import { CenterTop } from '../layout/CenterTop'
import { CenterBottom } from '../layout/CenterBottom'
import { RightPanel } from '../layout/RightPanel'
import type { DashboardData, DashboardLog, DashboardTask, EvolutionStage } from '@/types/dashboard'

const apiPrefix = '/api/v1/dashboard'

// Mock data structure as provided
const dashboardData = {
  core: {
    stage: "熔岩星体 Stage 1",
    progress: 36.9,
    unlockDesc: "下一阶段：需累计 20 条知识关联",
  },
  stats: {
    notes: 3,
    connections: 1,
    storage: "3.2MB",
    activeTime: "1.5h",
  },
  energy: {
    today: 24,
    taskComplete: 2,
    taskTotal: 3,
  },
  todayTasks: [
    {
      id: "1",
      title: "整理今日笔记",
      description: "将笔记分类并补全关键标签",
      priority: "high",
      completed: false,
      energy: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "2",
      title: "补充周计划记录",
      description: "把本周任务进度写入日记系统",
      priority: "medium",
      completed: true,
      energy: 15,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "3",
      title: "整理知识关联节点",
      description: "把相关笔记链接到知识图谱中",
      priority: "medium",
      completed: true,
      energy: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ] as DashboardTask[],
  weekPlan: [
    { day: "周一", date: "04/01", complete: 2, total: 5, progress: 40 },
    { day: "周二", date: "04/02", complete: 3, total: 6, progress: 50 },
    { day: "周三", date: "04/03", complete: 4, total: 6, progress: 67 },
    { day: "周四", date: "04/04", complete: 1, total: 4, progress: 25 },
    { day: "周五", date: "04/05", complete: 0, total: 5, progress: 0 },
    { day: "周六", date: "04/06", complete: 0, total: 0, progress: 0 },
    { day: "周日", date: "04/07", complete: 0, total: 0, progress: 0 },
  ],
  kanban: {
    todo: [
      { id: 101, content: "复习数学公式", tag: "study" },
      { id: 102, content: "整理 Obsidian 模板", tag: "tool" },
    ],
    processing: [
      { id: 201, content: "英语单词背诵", tag: "study" },
    ],
    done: [
      { id: 301, content: "高数作业", tag: "study" },
      { id: 302, content: "整理笔记结构", tag: "knowledge" },
    ],
  },
  activityFeed: [
    "完成高数作业 +1 Energy",
    "添加新笔记 · 知识体系更新",
    "今日连续活跃 1 天",
  ],
}

export function DashboardPage() {
  const { theme, setTheme } = useTheme()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [, setTasks] = useState<DashboardTask[]>([])
  const [logs, setLogs] = useState<DashboardLog[]>([])
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [isSubmittingLog, setIsSubmittingLog] = useState(false)
  const [_isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshAll = useCallback(async () => {
    try {
      setIsLoading(true)
      const [dashboardDataResponse, tasksDataResponse, logsDataResponse] = await Promise.all([
        fetch(`${apiPrefix}/evolution`),
        fetch(`${apiPrefix}/tasks`),
        fetch(`${apiPrefix}/logs`),
      ])

      if (!dashboardDataResponse.ok) throw new Error(`Failed to fetch dashboard: ${dashboardDataResponse.statusText}`)
      if (!tasksDataResponse.ok) throw new Error(`Failed to fetch tasks: ${tasksDataResponse.statusText}`)
      if (!logsDataResponse.ok) throw new Error(`Failed to fetch logs: ${logsDataResponse.statusText}`)

      const dashboardData = (await dashboardDataResponse.json()) as DashboardData
      const tasksData = (await tasksDataResponse.json()) as DashboardTask[]
      const logsData = (await logsDataResponse.json()) as DashboardLog[]

      setDashboard(dashboardData)
      setTasks(tasksData)
      setLogs(logsData)
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-text-primary px-6">
        <div className="rounded-xl border border-danger bg-panel p-8 text-center shadow-lg">
          <h2 className="text-2xl font-semibold text-danger mb-3">无法加载仪表盘</h2>
          <p className="mb-4 text-text-secondary">{error}</p>
          <button
            type="button"
            onClick={refreshAll}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  const isReadyToUpgrade = dashboard?.evolution_level.ready_for_upgrade ?? false
  const currentStage = (dashboard?.evolution_level.stage ?? 'hadean') as EvolutionStage

  // Mock data for heatmap and trends
  const heatmapData = Array.from({ length: 90 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    count: Math.floor(Math.random() * 5)
  }))

  const trendData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: Math.floor(Math.random() * 100) + 50
  }))

  return (
    <DashboardShell
      header={
        <DashboardHeader
          productName="Knowledge Core"
          currentStage={dashboardData.core.stage}
          todaySummary={`今日笔记 ${logs.length} 条，能量 +${dashboardData.energy.today}`}
          isDarkMode={theme === 'dark'}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
      }
      leftRail={
        <LeftRail
          stage={currentStage}
          progress={dashboardData.core.progress}
          nextUnlock={dashboardData.core.unlockDesc}
          readyForUpgrade={isReadyToUpgrade}
          stats={{
            totalNotes: dashboardData.stats.notes,
            storage: dashboardData.stats.storage,
            activeTime: dashboardData.stats.activeTime,
            connections: dashboardData.stats.connections,
          }}
          heatmapData={heatmapData}
          trendData={trendData.map(d => d.value)}
        />
      }
      centerTop={<CenterTop stage={currentStage} />}
      centerBottom={<CenterBottom weekPlan={dashboardData.weekPlan} kanban={dashboardData.kanban} />}
      rightPanel={
        <RightPanel
          energy={dashboardData.energy}
          onLogSubmit={handleCreateLog}
          isSubmittingLog={isSubmittingLog}
          tasks={dashboardData.todayTasks}
          onTaskToggle={handleToggleTask}
          busyTaskId={busyTaskId}
          activities={dashboardData.activityFeed}
        />
      }
    />
  )
}
