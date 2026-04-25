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
    <div className="bg-panel border border-border rounded-lg p-4">
      <h3 className="text-xs font-medium text-text-primary mb-2">快速记录</h3>
      <div className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              handleSubmit()
            }
          }}
          placeholder="添加今日任务，Ctrl+Enter 提交"
          className="w-full bg-panel-hover border border-border rounded-md p-3 text-sm leading-5 resize-none min-h-[90px] focus:outline-none focus:ring-1 focus:ring-accent"
          rows={3}
        />
        <div className="flex gap-2 items-center">
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3 h-3" />
            {isSubmitting ? '保存中...' : '保存'}
          </button>
          <button
            onClick={() => setContent('')}
            className="px-3 py-1.5 rounded-md border border-border text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}