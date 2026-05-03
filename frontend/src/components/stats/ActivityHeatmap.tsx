import type React from 'react'

interface ActivityHeatmapProps {
  data: number[][]
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const getIntensityStyle = (value: number): React.CSSProperties => {
    if (value === 0) return { backgroundColor: 'color-mix(in oklch, var(--accent) 10%, var(--background))' }
    const pct = value <= 2 ? 25 : value <= 5 ? 50 : value <= 8 ? 75 : 100
    return { backgroundColor: `color-mix(in oklch, var(--accent) ${pct}%, var(--background))` }
  }

  return (
    <div className="bg-panel backdrop-blur-sm rounded-xl p-6 border border-border">
      <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">活动热力图</h3>
      <div className="grid grid-cols-7 gap-1">
        {data.flat().map((value, index) => (
          <div
            key={index}
            className="w-3 h-3 rounded-sm"
            style={getIntensityStyle(value)}
            title={`活动: ${value}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
        <span>低</span>
        <span>高</span>
      </div>
    </div>
  )
}