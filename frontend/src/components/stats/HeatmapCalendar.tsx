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
    if (count === 0) return 'bg-muted'
    if (count <= 1) return 'bg-chart-2/40'
    if (count <= 3) return 'bg-chart-2/70'
    return 'bg-chart-2'
  }

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-text-primary">活跃热图</h3>
        <span className="text-xs text-text-secondary">近 90 天</span>
      </div>
      <div className="flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day) => {
              const styleClass = getStyle(day.count)
              return (
                <div
                  key={day.date}
                  className={`rounded-sm ${styleClass}`}
                  style={{ width: 8, height: 8 }}
                  title={`${day.date}: ${day.count}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
        <span>少</span>
        <span className="w-2 h-2 rounded-sm bg-muted inline-block" />
        <span className="w-2 h-2 rounded-sm bg-chart-2/40 inline-block" />
        <span className="w-2 h-2 rounded-sm bg-chart-2/70 inline-block" />
        <span className="w-2 h-2 rounded-sm bg-chart-2 inline-block" />
        <span>多</span>
      </div>
    </div>
  )
}