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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">本周计划</h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.day} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">{item.day}</span>
              <span className="text-xs text-text-secondary">{item.date}</span>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <span className="text-xs text-text-secondary">
                {item.complete}/{item.total}
              </span>
              <Progress value={item.progress} className="w-16 h-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}