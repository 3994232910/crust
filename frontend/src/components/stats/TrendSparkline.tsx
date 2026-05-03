interface TrendSparklineProps {
  data: number[]
}

export function TrendSparkline({ data }: TrendSparklineProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-text-primary">活跃趋势</h3>
        <span className="text-xs text-text-secondary">近 30 天</span>
      </div>
      <div className="h-16 overflow-hidden rounded bg-panel-hover p-2">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Activity trend chart">
          <title>Activity trend</title>
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill="url(#trendGradient)"
            points={`${points} 100,100 0,100`}
          />
          <polyline
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            points={points}
          />
        </svg>
      </div>
    </div>
  )

}