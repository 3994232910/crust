import { WeekPlan } from '../Dashboard/WeekPlan'
import { KanbanBoard } from '../Dashboard/KanbanBoard'

interface CenterBottomProps {
  weekPlan: Array<{
    day: string
    date: string
    complete: number
    total: number
    progress: number
  }>
  kanban: {
    todo: Array<{ id: number; content: string; tag: string }>
    processing: Array<{ id: number; content: string; tag: string }>
    done: Array<{ id: number; content: string; tag: string }>
  }
}

export function CenterBottom({ weekPlan, kanban }: CenterBottomProps) {
  return (
    <div className="h-full w-full grid grid-cols-2 gap-0 divide-x divide-border">
      <div className="p-4">
        <WeekPlan data={weekPlan} />
      </div>
      <div className="p-4">
        <KanbanBoard data={kanban} />
      </div>
    </div>
  )
}