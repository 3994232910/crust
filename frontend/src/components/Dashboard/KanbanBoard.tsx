interface KanbanBoardProps {
  data: {
    todo: Array<{ id: number; content: string; tag: string }>
    processing: Array<{ id: number; content: string; tag: string }>
    done: Array<{ id: number; content: string; tag: string }>
  }
}

function KanbanColumn({ title, items, dotColor }: { title: string; items: Array<{ id: number; content: string; tag: string }>; dotColor: string }) {
  return (
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <h4 className="text-xs font-medium text-text-secondary">{title} · {items.length}</h4>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="p-2.5 bg-background/50 rounded border border-border hover:bg-panel-hover transition-colors">
            <p className="text-xs text-text-primary">{item.content}</p>
            <span className="text-[11px] text-text-secondary mt-1 inline-block">{item.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard({ data }: KanbanBoardProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-primary">任务看板</h3>
      <div className="flex gap-3 h-full">
        <KanbanColumn title="待办" items={data.todo} dotColor="bg-danger" />
        <KanbanColumn title="进行中" items={data.processing} dotColor="bg-accent" />
        <KanbanColumn title="已完成" items={data.done} dotColor="bg-success" />
      </div>
    </div>
  )
}