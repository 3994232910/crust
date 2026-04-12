import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  highlighted?: boolean
}

export function StatCard({ icon: Icon, title, value, trend, highlighted }: StatCardProps) {
  return (
    <div className={`bg-panel border border-border rounded-lg p-3 transition-colors hover:bg-panel-hover ${highlighted ? 'border-accent/30' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-secondary shrink-0" />
          <p className="text-xs text-text-secondary">{title}</p>
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-xl font-semibold text-text-primary mt-1 pl-6">{value}</p>
    </div>
  )
}