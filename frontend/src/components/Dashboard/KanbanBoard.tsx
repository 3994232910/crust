import { Badge } from '@/components/ui/badge'

interface KanbanBoardProps {
  data: {
    todo: Array<{ id: number; content: string; tag: string }>
    processing: Array<{ id: number; content: string; tag: string }>
    done: Array<{ id: number; content: string; tag: string }>
  }
}

const tagColors = {
  study: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  plan: 'bg-green-500/20 text-green-300 border-green-500/30',
  knowledge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  tool: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

function KanbanColumn({ title, items, color }: { title: string; items: Array<{ id: number; content: string; tag: string }>; color: string }) {
  return (
    <div className="flex-1 space-y-3">
      <h4 className={`text-sm font-medium px-3 py-2 rounded-lg ${color}`}>
        {title} ({items.length})
      </h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="p-3 bg-background/50 rounded-lg border border-border/30 hover:bg-background/70 transition-colors">
            <p className="text-sm text-text-primary mb-2">{item.content}</p>
            <Badge variant="outline" className={`text-xs ${tagColors[item.tag as keyof typeof tagColors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
              {item.tag}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard({ data }: KanbanBoardProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">任务看板</h3>
      <div className="flex gap-4 h-full">
        <KanbanColumn
          title="待办"
          items={data.todo}
          color="bg-red-500/20 text-red-300 border border-red-500/30"
        />
        <KanbanColumn
          title="进行中"
          items={data.processing}
          color="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
        />
        <KanbanColumn
          title="已完成"
          items={data.done}
          color="bg-green-500/20 text-green-300 border border-green-500/30"
        />
      </div>
    </div>
  )
}