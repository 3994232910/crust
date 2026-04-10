interface DailySummaryProps {
  focusTime: string
  newNotes: number
  completedTasks: number
  knowledgeLinks: number
  suggestion: string
}

export function DailySummary({
  focusTime,
  newNotes,
  completedTasks,
  knowledgeLinks,
  suggestion,
}: DailySummaryProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider">今日总结</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">{focusTime}</p>
            <p className="text-xs text-slate-500">专注时间</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{newNotes}</p>
            <p className="text-xs text-slate-500">新增笔记</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{completedTasks}</p>
            <p className="text-xs text-slate-500">完成任务</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{knowledgeLinks}%</p>
            <p className="text-xs text-slate-500">知识关联</p>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-700">
          <p className="text-sm text-slate-300">{suggestion}</p>
        </div>
      </div>
    </div>
  )
}