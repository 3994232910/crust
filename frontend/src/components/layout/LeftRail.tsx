import { EvolutionStageBadge } from '../planet/EvolutionStageBadge'
import { StatCard } from '../stats/StatCard'
import { HeatmapCalendar } from '../stats/HeatmapCalendar'
import { TrendSparkline } from '../stats/TrendSparkline'
import { FileText, Database, Clock, GitBranch } from 'lucide-react'
import type { EvolutionStage } from '@/types/dashboard'

interface LeftRailProps {
  stage: EvolutionStage
  progress: number
  nextUnlock: string
  readyForUpgrade: boolean
  stats: {
    totalNotes: number
    storage: string
    activeTime: string
    connections: number
  }
  heatmapData: { date: string; count: number }[]
  trendData: number[]
}

export function LeftRail({ stage, progress, nextUnlock, readyForUpgrade, stats, heatmapData, trendData }: LeftRailProps) {
  return (
    <aside className="w-80 p-6 space-y-6 overflow-y-auto">
      <EvolutionStageBadge
        stage={stage}
        progress={progress}
        nextUnlock={nextUnlock}
        readyForUpgrade={readyForUpgrade}
      />

      <div className="rounded-3xl border border-border bg-panel/80 p-4 shadow-sm shadow-slate-900/5">
        <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">核心指标</p>
        <div className="space-y-3">
          <StatCard icon={FileText} title="Notes" value={stats.totalNotes} description="总笔记数量，推动知识网络成长。" highlighted />
          <StatCard icon={GitBranch} title="Connections" value={stats.connections} description="关联条目越多，星核越稳定。" />
        </div>
      </div>

      <div className="grid gap-3">
        <StatCard
          icon={Database}
          title="Storage"
          value={stats.storage}
        />
        <StatCard
          icon={Clock}
          title="Active Time"
          value={stats.activeTime}
        />
      </div>

      <HeatmapCalendar data={heatmapData} />
      <TrendSparkline data={trendData} />
    </aside>
  )
}