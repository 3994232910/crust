import { useState } from 'react'
import { Send } from 'lucide-react'

interface TaskComposerProps {
  onSubmit: (content: string) => void
  isSubmitting?: boolean
}

export function TaskComposer({ onSubmit, isSubmitting }: TaskComposerProps) {
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim())
      setContent('')
    }
  }

  return (
    <div className="bg-panel border border-border rounded-2xl p-4 backdrop-blur-sm">
      <h3 className="text-sm font-medium text-text-primary mb-3">快速记录</h3>
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              handleSubmit()
            }
          }}
          placeholder="写一句今日记录或任务目标，Ctrl+Enter 快速提交。"
          className="w-full bg-panel-hover border border-border rounded-2xl p-4 text-sm leading-6 resize-none min-h-[130px] focus:outline-none focus:ring-2 focus:ring-accent"
          rows={4}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-full hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? '保存中...' : '保存'}
          </button>
          <button
            onClick={() => setContent('')}
            className="px-4 py-2 rounded-full border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            取消
          </button>
          <span className="text-xs text-text-secondary">按 Ctrl+Enter 快速保存</span>
        </div>
      </div>
    </div>
  )
}