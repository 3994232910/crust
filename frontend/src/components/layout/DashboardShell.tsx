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
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {header}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-sidebar overflow-y-auto overflow-x-hidden">
          {leftRail}
        </aside>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="border-b border-border bg-background">
            {centerTop}
          </div>
          <div className="flex-1 overflow-hidden">
            {centerBottom}
          </div>
        </main>
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-sidebar overflow-y-auto overflow-x-hidden">
          {rightPanel}
        </aside>
      </div>
    </div>
  )
}