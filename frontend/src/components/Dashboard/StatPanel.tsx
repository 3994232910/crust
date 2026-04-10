interface StatPanelProps {
  icon: string
  label: string
  value: string
  unit: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

export function StatPanel({ icon, label, value, unit, color }: StatPanelProps) {
  const colorMap = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
  }

  const iconColorMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
  }

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-lg p-4 border shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{unit}</p>
          </div>
        </div>
        <div className={`text-3xl ${iconColorMap[color]}`}>{icon}</div>
      </div>
    </div>
  )
}