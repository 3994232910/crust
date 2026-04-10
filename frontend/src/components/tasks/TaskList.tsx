import type { DashboardTask } from '@/types/dashboard'

interface TaskListProps {
  tasks: DashboardTask[]
  onToggleTask: (task: DashboardTask) => void
  busyTaskId?: string
}

export function TaskList({ tasks, onToggleTask, busyTaskId }: TaskListProps) {
  const completedCount = tasks.filter(task => task.completed).length
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-danger'
      case 'medium': return 'border-accent'
      case 'low': return 'border-text-secondary'
      default: return 'border-border'
    }
  }

  const getCategoryLabel = (title: string) => {
    const lower = title.toLowerCase()
    if (lower.includes('整理') || lower.includes('笔记')) return { label: '📝 笔记', color: 'bg-accent-weak text-accent' }
    if (lower.includes('能量') || lower.includes('专注')) return { label: '⚡ 能量', color: 'bg-success/10 text-success' }
    return { label: '🔗 链接', color: 'bg-slate-100 text-slate-700' }
  }

  return (
    <div className="bg-panel border border-border rounded-2xl p-4 backdrop-blur-sm">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <p className="text-sm font-medium text-text-primary">今日任务</p>
            <p className="text-xs text-text-secondary">完成率 {completedCount}/{tasks.length}</p>
          </div>
          <div className="w-32 h-2 rounded-full bg-panel-hover overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => {
          const category = getCategoryLabel(task.title)
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onToggleTask(task)}
              disabled={busyTaskId === task.id}
              className={`w-full text-left border-l-4 ${getPriorityColor(task.priority)} bg-panel-hover rounded-2xl p-4 hover:bg-panel-hover/90 transition-colors ${task.completed ? 'opacity-80' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${category.color}`}>{category.label}</span>
                    {task.completed ? <span className="text-xs text-success">已完成</span> : <span className="text-xs text-text-secondary">{task.priority}</span>}
                  </div>
                  <h4 className={`text-base font-semibold ${task.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{task.title}</h4>
                  {task.description && <p className="mt-2 text-sm text-text-secondary leading-6">{task.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-semibold text-accent">+{task.energy} Energy</span>
                  <div className={`rounded-lg px-3 py-1 text-xs font-medium ${task.completed ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-700'}`}>
                    {task.completed ? '已领取' : '待完成'}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}