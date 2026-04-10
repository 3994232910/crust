import { CheckSquare } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  energy: number
  completed: boolean
}

interface CommandBoardProps {
  tasks: Task[]
  onToggle: (taskId: string) => void
}

const priorityStyles = {
  low: 'border-slate-600 text-slate-400',
  medium: 'border-blue-600 text-blue-400',
  high: 'border-red-600 text-red-400',
}

export function CommandBoard({ tasks, onToggle }: CommandBoardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider">命令板</h3>
      <div className="space-y-3">
        {tasks.map(task => (
          <div
            key={task.id}
            className={`rounded-lg border p-4 transition-all hover:bg-slate-700/30 ${priorityStyles[task.priority]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-slate-100">{task.title}</h4>
                <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">能量: {task.energy}</span>
                  <span className={`text-xs px-2 py-1 rounded ${priorityStyles[task.priority]}`}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onToggle(task.id)}
                className="p-2 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <CheckSquare className={`w-5 h-5 ${task.completed ? 'text-green-400' : 'text-slate-500'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}