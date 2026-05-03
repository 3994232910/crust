interface RecentAccessProps {
  items: string[]
}

export function RecentAccess({ items }: RecentAccessProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider">最近访问</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}