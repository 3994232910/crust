import { Progress } from '@/components/ui/progress'

interface CoreStageCardProps {
  name: string
  progress: number
  level: number
  nextUnlock: string
}

export function CoreStageCard({ name, progress, level, nextUnlock }: CoreStageCardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-cyan-400">核心阶段</span>
        <span className="text-sm text-slate-400">等级 {level}</span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">进度</span>
            <span className="text-cyan-400">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <p className="text-sm text-slate-400">下一阶段解锁: {nextUnlock}</p>
      </div>
    </div>
  )
}