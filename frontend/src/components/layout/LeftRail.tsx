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
    <aside className="w-80 p-4 space-y-4 overflow-y-auto">
      <EvolutionStageBadge
        stage={stage}
        progress={progress}
        nextUnlock={nextUnlock}
        readyForUpgrade={readyForUpgrade}
      />

      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={FileText} title="Notes" value={stats.totalNotes} highlighted />
        <StatCard icon={GitBranch} title="Connections" value={stats.connections} />
        <StatCard icon={Database} title="Storage" value={stats.storage} />
        <StatCard icon={Clock} title="Active Time" value={stats.activeTime} />
      </div>

      <HeatmapCalendar data={heatmapData} />
      <TrendSparkline data={trendData} />
    </aside>
  )
}