import type { EvolutionStage } from '@/types/dashboard'

interface EvolutionStageBadgeProps {
  stage: EvolutionStage
  progress: number
  nextUnlock: string
  readyForUpgrade: boolean
}

const stageNames = {
  hadean: '熔核星体',
  archean: '冷却岩壳',
  phanerozoic: '知识海环',
}

export function EvolutionStageBadge({ stage, progress, nextUnlock, readyForUpgrade }: EvolutionStageBadgeProps) {
  return (
    <div className="bg-panel border border-border rounded-2xl p-4 backdrop-blur-sm shadow-sm shadow-slate-900/5">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-text-secondary">Stage {stage === 'hadean' ? '1' : stage === 'archean' ? '2' : '3'}</div>
          <div className="text-lg font-semibold text-text-primary">{stageNames[stage]}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${readyForUpgrade ? 'bg-success/15 text-success' : 'bg-panel-hover text-text-secondary'}`}>
          {readyForUpgrade ? '可升级' : '继续沉积'}
        </span>
      </div>
      <div className="mb-3">
        <div className="w-full bg-panel-hover rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-text-secondary">下一阶段要求：{nextUnlock}</p>
    </div>
  )
}