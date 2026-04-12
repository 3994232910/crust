import { Sun, Moon } from 'lucide-react'

interface DashboardHeaderProps {
  productName: string
  currentStage: string
  isDarkMode: boolean
  onToggleTheme: () => void
}

export function DashboardHeader({
  productName,
  currentStage,
  isDarkMode,
  onToggleTheme,
}: DashboardHeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground">{productName}</h1>
        <span className="text-muted-foreground text-sm">·</span>
        <span className="text-sm text-muted-foreground">{currentStage}</span>
      </div>
      <button
        type="button"
        onClick={onToggleTheme}
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="切换主题"
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  )
}