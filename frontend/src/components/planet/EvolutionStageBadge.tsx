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
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <div className="text-xs text-text-secondary">Stage {stage === 'hadean' ? '1' : stage === 'archean' ? '2' : '3'}</div>
          <div className="text-base font-semibold text-text-primary">{stageNames[stage]}</div>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${readyForUpgrade ? 'bg-success/10 text-success' : 'bg-panel-hover text-text-secondary'}`}>
          {readyForUpgrade ? '可升级' : '进行中'}
        </span>
      </div>
      <div className="mb-2">
        <div className="w-full bg-panel-hover rounded-full h-1.5">
          <div
            className="bg-accent h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-text-secondary">{nextUnlock}</p>
    </div>
  )
}