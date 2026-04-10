import { DataPlanet } from '../planet/DataPlanet'
import type { EvolutionStage } from '@/types/dashboard'

interface CenterStageProps {
  stage: EvolutionStage
  isLoading?: boolean
  progress: number
  isReadyToUpgrade: boolean
  onAdvanceStage: () => void
}

export function CenterStage({ stage, isLoading, progress, isReadyToUpgrade, onAdvanceStage }: CenterStageProps) {
  return (
    <main className="flex-1 relative p-8">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
            <p className="mt-3 text-sm text-text-secondary">正在加载数据星核...</p>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="relative w-full h-full max-w-2xl rounded-4xl overflow-hidden border border-border bg-linear-to-br from-slate-950/5 via-white/60 to-slate-950/10 shadow-2xl shadow-slate-900/10">
            <DataPlanet stage={stage} />
            <div className="absolute inset-x-6 top-6 flex flex-col gap-4 rounded-3xl border border-border bg-panel/85 p-4 shadow-lg backdrop-blur-xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-text-secondary">核心阶段</div>
                  <div className="text-xl font-semibold text-text-primary">{stage === 'hadean' ? '熔核星体' : stage === 'archean' ? '冷却岩壳' : '知识海环'}</div>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span className="inline-flex items-center gap-2 rounded-full bg-panel-hover px-3 py-1">进度 {progress}%</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${isReadyToUpgrade ? 'bg-success/15 text-success' : 'bg-panel-hover text-text-secondary'}`}>
                    {isReadyToUpgrade ? '升级可用' : '继续累积'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!isReadyToUpgrade}
                  onClick={onAdvanceStage}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-text-secondary"
                >
                  {isReadyToUpgrade ? '触发阶段升级' : '继续沉积能量'}
                </button>
                <span className="text-sm text-text-secondary">完成更多任务以增强星核稳定性。</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}