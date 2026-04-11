import type { DashboardTask } from '@/types/dashboard'

interface TaskListProps {
  tasks: DashboardTask[]
  onToggleTask: (task: DashboardTask) => void
  busyTaskId?: string
}

export function TaskList({ tasks, onToggleTask, busyTaskId }: TaskListProps) {
  const completedCount = tasks.filter(task => task.completed).length
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-danger'
      case 'medium': return 'bg-accent'
      default: return 'bg-text-secondary'
    }
  }

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-text-primary">今日任务</p>
        <span className="text-xs text-text-secondary">{completedCount}/{tasks.length}</span>
      </div>
      <div className="w-full h-1 rounded-full bg-panel-hover overflow-hidden mb-3">
        <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onToggleTask(task)}
            disabled={busyTaskId === task.id}
            className={`w-full text-left bg-panel-hover rounded-md px-3 py-2.5 hover:bg-border/50 transition-colors ${task.completed ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityDot(task.priority)}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{task.title}</p>
                {task.description && (
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{task.description}</p>
                )}
              </div>
              {task.completed && (
                <span className="text-xs text-success shrink-0">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}