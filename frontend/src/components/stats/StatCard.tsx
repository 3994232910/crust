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

export function StatCard({ icon: Icon, title, value, description, trend, highlighted }: StatCardProps) {
  return (
    <div className={`bg-panel border border-border rounded-2xl p-4 backdrop-blur-sm transition-colors ${highlighted ? 'shadow-lg shadow-accent/10' : 'hover:bg-panel-hover'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent-weak rounded-xl">
            <Icon className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="text-3xl font-semibold text-text-primary leading-none">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`text-sm font-semibold ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      {description ? <p className="mt-3 text-xs text-text-secondary leading-5">{description}</p> : null}
    </div>
  )
}