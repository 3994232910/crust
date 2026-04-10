import { TaskComposer } from '../tasks/TaskComposer'
import { TaskList } from '../tasks/TaskList'
import { ActivityFeed } from '../logs/ActivityFeed'
import type { DashboardTask } from '@/types/dashboard'

interface RightPanelProps {
  energy: {
    today: number
    taskComplete: number
    taskTotal: number
  }
  onLogSubmit: (content: string) => void
  isSubmittingLog?: boolean
  tasks: DashboardTask[]
  onTaskToggle: (task: DashboardTask) => void
  busyTaskId?: string | null
  activities: string[]
}

export function RightPanel({ energy, onLogSubmit, isSubmittingLog, tasks, onTaskToggle, busyTaskId, activities }: RightPanelProps) {
  const activityItems = activities.map((activity, index) => ({
    id: `activity-${index}`,
    type: 'note' as const,
    description: activity,
    timestamp: new Date().toLocaleTimeString(),
    energy: activity.includes('+') ? parseInt(activity.match(/\+(\d+)/)?.[1] || '0') : 0,
  }))

  return (
    <aside className="w-96 p-6 space-y-6 overflow-y-auto">
      <div className="rounded-3xl border border-border bg-panel/80 p-4 shadow-sm shadow-slate-900/5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">今日能量</p>
            <p className="text-xs text-text-secondary">任务与记录驱动的星核回馈</p>
          </div>
          <div className="rounded-full bg-accent-weak px-3 py-1 text-sm font-semibold text-accent">+{energy.today}</div>
        </div>
        <div className="rounded-2xl bg-panel-hover p-3 text-sm text-text-secondary">
          <div className="flex items-center justify-between">
            <span>任务完成率</span>
            <strong className="text-text-primary">{energy.taskComplete}/{energy.taskTotal}</strong>
          </div>
        </div>
      </div>

      <TaskComposer onSubmit={onLogSubmit} isSubmitting={isSubmittingLog} />
      <TaskList tasks={tasks} onToggleTask={onTaskToggle} busyTaskId={busyTaskId ?? undefined} />
      <ActivityFeed activities={activityItems} />
    </aside>
  )
}