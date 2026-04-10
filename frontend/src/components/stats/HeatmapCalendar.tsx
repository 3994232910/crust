import { useMemo } from 'react'

interface HeatmapCalendarProps {
  data: { date: string; count: number }[]
}

export function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const weeks = useMemo(() => {
    const weeks = []
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 90)

    for (let week = 0; week < 13; week++) {
      const weekData = []
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + week * 7 + day)
        const dateStr = date.toISOString().split('T')[0]
        const count = data.find(d => d.date === dateStr)?.count || 0
        weekData.push({ date: dateStr, count })
      }
      weeks.push(weekData)
    }
    return weeks
  }, [data])

  const getStyle = (count: number) => {
    if (count === 0) return { className: 'bg-panel-hover', size: 8 }
    if (count <= 1) return { className: 'bg-accent-weak', size: 8 }
    if (count <= 3) return { className: 'bg-accent/80', size: 10 }
    return { className: 'bg-accent', size: 12 }
  }

  return (
    <div className="bg-panel border border-border rounded-2xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Activity Heatmap</h3>
          <p className="text-xs text-text-secondary">最近 90 天笔记与任务活跃度</p>
        </div>
      </div>
      <div className="flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day) => {
              const style = getStyle(day.count)
              return (
                <div
                  key={day.date}
                  className={`rounded-sm ${style.className}`}
                  style={{ width: style.size, height: style.size }}
                  title={`${day.date}: ${day.count} activities`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-text-secondary space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-panel-hover inline-block" />
          <span>低活跃：笔记少</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-weak inline-block" />
          <span>中活跃：持续更新</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent/80 inline-block" />
          <span>高活跃：知识连通</span>
        </div>
      </div>
    </div>
  )
}