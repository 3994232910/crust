import { ReactNode } from 'react'

interface DashboardShellProps {
  header: ReactNode
  leftRail: ReactNode
  centerTop: ReactNode
  centerBottom: ReactNode
  rightPanel: ReactNode
}

export function DashboardShell({ header, leftRail, centerTop, centerBottom, rightPanel }: DashboardShellProps) {
  return (
    <div className="w-screen h-screen bg-background text-text-primary overflow-hidden">
      {header}
      <div className="flex h-[calc(100vh-80px)]">
        <aside className="w-1/5 border-r border-border bg-panel/50 backdrop-blur-sm overflow-y-auto">
          {leftRail}
        </aside>
        <main className="w-3/5 flex flex-col">
          <div className="h-2/5 border-b border-border bg-background">
            {centerTop}
          </div>
          <div className="h-3/5 flex">
            {centerBottom}
          </div>
        </main>
        <aside className="w-1/5 border-l border-border bg-panel/50 backdrop-blur-sm overflow-y-auto">
          {rightPanel}
        </aside>
      </div>
    </div>
  )
}