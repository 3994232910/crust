import { Search, Settings, Sun, Moon } from 'lucide-react'

interface DashboardHeaderProps {
  productName: string
  currentStage: string
  todaySummary: string
  isDarkMode: boolean
  onToggleTheme: () => void
}

export function DashboardHeader({
  productName,
  currentStage,
  todaySummary,
  isDarkMode,
  onToggleTheme,
}: DashboardHeaderProps) {
  return (
    <header className="h-20 border-b border-border bg-panel/90 backdrop-blur-xl px-6 flex items-center justify-between shadow-sm shadow-slate-200/40">
      <div className="flex flex-col justify-center gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{productName}</h1>
          <span className="rounded-full bg-accent-weak px-3 py-1 text-xs font-semibold text-accent">数据星核仪表盘</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-2 rounded-full bg-panel-hover px-3 py-1">{currentStage}</span>
          <span>{todaySummary}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className="p-2 rounded-lg hover:bg-panel-hover transition-colors">
          <Search className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button type="button" className="p-2 rounded-lg hover:bg-panel-hover transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}