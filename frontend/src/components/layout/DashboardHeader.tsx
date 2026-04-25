interface DashboardHeaderProps {
  productName: string
}

export function DashboardHeader({
  productName,
}: DashboardHeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground">{productName}</h1>
      </div>
    </header>
  )
}