import { FileText, TrendingUp, Database } from 'lucide-react'

interface CoreMetricsProps {
  totalNotes: number
  weeklyNew: number
  tasksCompleted: number
  storageUsed: number
}

export function CoreMetrics({ totalNotes, weeklyNew, tasksCompleted, storageUsed }: CoreMetricsProps) {
  const metrics = [
    {
      icon: FileText,
      label: '总笔记数',
      value: totalNotes.toString(),
      change: `+${weeklyNew} 本周`,
      color: 'text-blue-400',
    },
    {
      icon: TrendingUp,
      label: '任务完成',
      value: tasksCompleted.toString(),
      change: '今日',
      color: 'text-green-400',
    },
    {
      icon: Database,
      label: '存储占用',
      value: `${storageUsed}MB`,
      change: '当前',
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider">核心指标</h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
              <div>
                <p className="text-sm text-slate-400">{metric.label}</p>
                <p className="text-xs text-slate-500">{metric.change}</p>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-100">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}