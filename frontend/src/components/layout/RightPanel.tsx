import { TaskComposer } from '../tasks/TaskComposer'
import { TaskList } from '../tasks/TaskList'
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
}

export function RightPanel({ energy, onLogSubmit, isSubmittingLog, tasks, onTaskToggle, busyTaskId }: RightPanelProps) {
  return (
    <aside className="w-96 p-4 space-y-4 overflow-y-auto">
      <div className="border border-border bg-panel rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary">今日能量</p>
          <p className="text-sm font-medium text-text-primary">任务 {energy.taskComplete}/{energy.taskTotal}</p>
        </div>
        <span className="text-lg font-semibold text-accent">+{energy.today}</span>
      </div>

      <TaskComposer onSubmit={onLogSubmit} isSubmitting={isSubmittingLog} />
      <TaskList tasks={tasks} onToggleTask={onTaskToggle} busyTaskId={busyTaskId ?? undefined} />
    </aside>
  )
}