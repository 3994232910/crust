import { DashboardTask } from '@/types/dashboard'

interface TaskBoardProps {
  tasks: DashboardTask[]
  busyTaskId: string | null
  onToggleComplete: (task: DashboardTask) => Promise<void>
}

const priorityStyles: Record<DashboardTask['priority'], string> = {
  low: 'bg-slate-700 text-slate-200',
  medium: 'bg-sky-700 text-sky-100',
  high: 'bg-rose-600 text-rose-100',
}

export function TaskBoard({ tasks, busyTaskId, onToggleComplete }: TaskBoardProps) {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-4 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">任务板</p>
          <h2 className="text-lg font-semibold text-white">演化目标</h2>
        </div>
        <span className="text-xs text-slate-400">{tasks.length} 项</span>
      </div>

      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{task.description}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${priorityStyles[task.priority]}`}>
                {task.priority}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                能量: <span className="text-slate-100">{task.energy}</span>
              </div>
              <button
                type="button"
                disabled={busyTaskId === task.id}
                onClick={() => onToggleComplete(task)}
                className="inline-flex items-center rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {task.completed ? '撤销完成' : '标记完成'}
              </button>
            </div>
          </div>
        ))}
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            暂无任务，先记录一次日志，让演化开始积累。
          </div>
        ) : null}
      </div>
    </div>
  )
}
