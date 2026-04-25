import { useMemo } from 'react'
import type React from 'react'

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

  const getStyle = (count: number): React.CSSProperties => {
    if (count === 0) return { backgroundColor: 'var(--muted)' }
    const pct = count <= 1 ? 30 : count <= 3 ? 60 : 100
    return { backgroundColor: `color-mix(in oklch, var(--accent) ${pct}%, var(--background))` }
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
            {week.map((day) => (
              <div
                key={day.date}
                className="rounded-sm"
                style={{ width: 8, height: 8, ...getStyle(day.count) }}
                title={`${day.date}: ${day.count}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
        <span>少</span>
        <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'var(--muted)' }} />
        <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'color-mix(in oklch, var(--accent) 30%, var(--background))' }} />
        <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'color-mix(in oklch, var(--accent) 60%, var(--background))' }} />
        <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'var(--accent)' }} />
        <span>多</span>
      </div>
    </div>
  )
}