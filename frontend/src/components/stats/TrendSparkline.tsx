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
    <div className="bg-panel border border-border rounded-2xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-primary">Trend</h3>
        <span className="text-xs text-text-secondary">最近 30 天</span>
      </div>
      <div className="h-20 overflow-hidden rounded-2xl bg-panel-hover p-2">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Activity trend chart">
          <title>Activity trend</title>
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(14,165,233,0.35)" />
              <stop offset="100%" stopColor="rgba(14,165,233,0)" />
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