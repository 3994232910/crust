import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useToast from "@/hooks/useCustomToast"

interface Forge {
  id: string
  title: string
  is_folder?: boolean
}

interface AISummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  forges: Forge[]
  onGenerate: (forgeIds: string[], focus: string) => void
}

export function AISummaryDialog({ open, onOpenChange, forges, onGenerate }: AISummaryDialogProps) {
  const notes = forges.filter((f) => !f.is_folder)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [focus, setFocus] = useState("")
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notes.map((n) => n.id)))
    }
  }

  const handleGenerate = () => {
    if (selectedIds.size === 0) {
      toast.showErrorToast("请至少选择一篇笔记")
      return
    }
    setLoading(true)
    onGenerate(Array.from(selectedIds), focus.trim())
    // Reset and close — parent handles the actual streaming
    setSelectedIds(new Set())
    setFocus("")
    setLoading(false)
    onOpenChange(false)
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    setFocus("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 知识梳理
          </DialogTitle>
          <DialogDescription>
            选择笔记，AI 将自动创建总结文件并实时写入内容。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">选择笔记</Label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedIds.size === notes.length ? "取消全选" : "全选"}
              </button>
            </div>
            <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 text-center">暂无笔记</p>
              ) : (
                notes.map((note) => (
                  <label
                    key={note.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(note.id)}
                      onCheckedChange={() => toggleId(note.id)}
                    />
                    <span className="text-sm truncate">{note.title || "（无标题）"}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">已选 {selectedIds.size} / {notes.length} 篇</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus" className="text-sm font-medium">
              梳理方向（可选）
            </Label>
            <Input
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="例如：重点关注技术实现细节、提炼行动计划..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleGenerate} disabled={loading || selectedIds.size === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                准备中…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                开始梳理
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
