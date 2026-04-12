interface ActivityHeatmapProps {
  data: number[][]
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const getIntensityColor = (value: number) => {
    if (value === 0) return 'bg-slate-700'
    if (value <= 2) return 'bg-cyan-900'
    if (value <= 5) return 'bg-cyan-700'
    if (value <= 8) return 'bg-cyan-500'
    return 'bg-cyan-300'
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider">活动热力图</h3>
      <div className="grid grid-cols-7 gap-1">
        {data.flat().map((value, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-sm ${getIntensityColor(value)}`}
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