interface StageIndicatorProps {
  stage: string
  progress: number
  score: number
}

export function StageIndicator({ stage, progress, score }: StageIndicatorProps) {
  const stages = [
    { name: '冥古宙', key: 'hadean', color: 'from-red-600 to-orange-600', icon: '🌋' },
    { name: '太古宙', key: 'archean', color: 'from-slate-600 to-teal-600', icon: '🌊' },
    { name: '显生宙', key: 'phanerozoic', color: 'from-green-600 to-teal-600', icon: '🌍' },
  ]

  const currentStageIndex = stages.findIndex((s) => s.key === stage)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {stages.map((s, idx) => (
          <div
            key={s.key}
            className={`flex-1 rounded overflow-hidden transition-all duration-500 ${
              idx <= currentStageIndex
                ? `bg-gradient-to-r ${s.color} shadow-lg`
                : 'bg-slate-700 opacity-40'
            }`}
          >
            <div className="px-3 py-2 text-center">
              <div className="text-xs font-semibold text-white">{s.icon}</div>
              <div className="text-xs text-white/80">{s.name}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-700/50 rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">
            {stages[currentStageIndex]?.name}
          </span>
          <span className={`text-xs font-bold bg-gradient-to-r ${stages[currentStageIndex]?.color} bg-clip-text text-transparent`}>
            {score.toFixed(0)} 分
          </span>
        </div>
        <div className="w-full bg-slate-600 rounded h-2 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${stages[currentStageIndex]?.color} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-slate-400 mt-2">
          {progress.toFixed(1)}% 完成度
        </div>
      </div>
    </div>
  )
}