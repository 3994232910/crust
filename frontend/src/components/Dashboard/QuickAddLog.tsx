import { useState } from 'react'

interface QuickAddLogProps {
  onCreateLog: (content: string) => Promise<void>
  isSubmitting: boolean
}

export function QuickAddLog({ onCreateLog, isSubmitting }: QuickAddLogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')

  const handleSubmit = async () => {
    if (!content.trim()) {
      return
    }
    await onCreateLog(content.trim())
    setContent('')
    setIsOpen(false)
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 rounded-3xl border border-slate-700 p-4 shadow-xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">快速日志</p>
          <h2 className="text-lg font-semibold text-white">记一次演化日志</h2>
        </div>
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
          type="button"
        >
          {isOpen ? '关闭' : '记录'}
        </button>
      </div>

      {isOpen ? (
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={event => setContent(event.target.value)}
            rows={4}
            placeholder="写下你刚刚完成的任务、见解或想法…"
            className="w-full rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? '正在记录…' : '保存日志'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              className="text-xs text-slate-400 transition hover:text-slate-100"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-slate-400">
          日志会提升关系强度，并推动地球演化。
        </p>
      )}
    </div>
  )
}
