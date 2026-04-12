import { Progress } from '@/components/ui/progress'

interface WeekPlanProps {
  data: Array<{
    day: string
    date: string
    complete: number
    total: number
    progress: number
  }>
}

export function WeekPlan({ data }: WeekPlanProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-primary">本周计划</h3>
      <div className="space-y-1.5">
        {data.map((item) => (
          <div key={item.day} className="flex items-center gap-3 py-1.5">
            <div className="w-8 shrink-0">
              <span className="text-xs font-medium text-text-primary">{item.day}</span>
            </div>
            <div className="flex-1">
              <Progress value={item.progress} className="h-1" />
            </div>
            <span className="text-xs text-text-secondary w-10 text-right shrink-0">
              {item.complete}/{item.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}