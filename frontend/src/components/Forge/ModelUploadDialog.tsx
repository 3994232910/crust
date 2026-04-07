import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState, useRef, useEffect, useCallback } from "react"
import { Upload, Box, Command } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ModelUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onModelSelect: (modelTag: string) => void
}

type ActionMode = "upload" | "select" | "command"

interface ModelFile {
  url: string
  filename: string
  size: number
}

export function ModelUploadDialog({ 
  open, 
  onOpenChange, 
  onModelSelect
}: ModelUploadDialogProps) {
  const [mode, setMode] = useState<ActionMode>("command")
  const [command, setCommand] = useState("")
  const [models, setModels] = useState<ModelFile[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setMode("command")
      setCommand("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const loadModels = async () => {
    try {
      const response = await fetch("/api/v1/forge/models")
      if (!response.ok) {
        console.error("Failed to load models:", response.status)
        return
      }
      const data = await response.json()
      setModels(data)
      setMode("select")
      setSelectedIndex(0)
    } catch (error) {
      console.error("Failed to load models:", error)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const token = localStorage.getItem("access_token")
      const headers: Record<string, string> = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch("/api/v1/forge/upload-model", {
        method: "POST",
        headers,
        body: formData,
      })
      if (!response.ok) throw new Error("Upload failed")
      const data = await response.json()
      insertModelAtCursor(data.url)
      onOpenChange(false)
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const insertModelAtCursor = useCallback((modelUrl: string) => {
    const modelTag = `<model src="${modelUrl}" bind-to="paragraph-${Date.now()}">\n  模型说明\n</model>\n`
    onModelSelect(modelTag)
  }, [onModelSelect])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === "command") {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter") {
        if (selectedIndex === 0 || command.toLowerCase() === "upload") {
          inputRef.current?.click()
        } else if (selectedIndex === 1 || command.toLowerCase() === "select") {
          loadModels()
        }
      } else if (e.key === "Escape") {
        onOpenChange(false)
      }
    } else if (mode === "select") {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % models.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + models.length) % models.length)
      } else if (e.key === "Enter" && models[selectedIndex]) {
        insertModelAtCursor(models[selectedIndex].url)
        onOpenChange(false)
      } else if (e.key === "Escape") {
        setMode("command")
        setCommand("")
        setSelectedIndex(0)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hidden">Open</Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogTitle className="sr-only">3D Models</DialogTitle>
        <DialogDescription className="sr-only">Upload or select a 3D model to insert into your note</DialogDescription>
        
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Command className="h-4 w-4" />
            <Input
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "command" ? "输入命令 (upload/select)..." : "按 Esc 返回命令模式"}
              className="border-0 p-0 focus-visible:ring-0 shadow-none"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {mode === "command" && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">可用命令</div>
              <div 
                className={`flex items-center justify-between px-2 py-2 rounded-md cursor-pointer ${selectedIndex === 0 ? "bg-accent" : ""}`}
                onClick={() => inputRef.current?.click()}
              >
                <div className="flex items-center gap-3">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span>上传新模型</span>
                </div>
                <kbd className="px-2 py-0.5 text-xs bg-muted rounded">Ctrl+U</kbd>
              </div>
              <div 
                className={`flex items-center justify-between px-2 py-2 rounded-md cursor-pointer ${selectedIndex === 1 ? "bg-accent" : ""}`}
                onClick={() => {
                  loadModels()
                }}
              >
                <div className="flex items-center gap-3">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  <span>插入已有模型</span>
                </div>
                <kbd className="px-2 py-0.5 text-xs bg-muted rounded">Enter</kbd>
              </div>
            </div>
          )}

          {mode === "select" && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">选择模型</div>
              {models.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">暂无模型</div>
              ) : (
                models.map((model, index) => (
                  <div
                    key={model.filename}
                    className={`flex items-center justify-between px-2 py-2 rounded-md cursor-pointer ${index === selectedIndex ? "bg-accent" : ""}`}
                    onClick={() => {
                      insertModelAtCursor(model.url)
                      onOpenChange(false)
                    }}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{model.filename}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {(model.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-2 border-t flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd> 导航
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd> 选择
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> 关闭
          </div>
        </div>

        <input type="file" accept=".glb,.gltf" className="hidden" ref={inputRef} onChange={handleUpload} disabled={isUploading} />
      </DialogContent>
    </Dialog>
  )
}
