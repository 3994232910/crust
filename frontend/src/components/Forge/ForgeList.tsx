import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  Plus,
  Search,
  Telescope,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { type ForgePublic, ForgeService, type ForgesPublic } from "@/client"
import { Button } from "@/components/ui/button"
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
import StarGazingView from "./StarGazingView"

interface Forge extends Omit<ForgePublic, "content" | "is_folder"> {
  content?: string
  is_folder?: boolean
}

export function ForgeList() {
  const [forges, setForges] = useState<Forge[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedForge, setSelectedForge] = useState<Forge | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isResizing, setIsResizing] = useState(false)
  const [showStarGazing, setShowStarGazing] = useState(false)

  const toast = useToast()

  const autoSave = async () => {
    if (!selectedForge) return

    try {
      await ForgeService.updateForge({
        id: selectedForge.id,
        requestBody: {
          title: editTitle || selectedForge.title,
          content:
            editContent !== selectedForge.content ? editContent : undefined,
        },
      })

      const updatedForge = {
        ...selectedForge,
        title: editTitle || selectedForge.title,
        content: editContent || "",
        updated_at: new Date().toISOString(),
      } as Forge

      setForges((prev) =>
        prev.map((f) => (f.id === selectedForge.id ? updatedForge : f)),
      )
      setSelectedForge(updatedForge)
    } catch (error) {
      console.error("Auto-save failed:", error)
    }
  }

  // Auto-save implementation
  useEffect(() => {
    if (!selectedForge) return

    const timer = setTimeout(() => {
      if (editTitle || editContent) {
        autoSave()
      }
    }, 2000) // 2 seconds debounce

    return () => clearTimeout(timer)
  }, [editTitle, editContent, selectedForge, autoSave])

  // Ctrl+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (selectedForge) {
          autoSave()
          toast.showSuccessToast("已保存")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedForge, autoSave, toast.showSuccessToast])

  const loadForges = async () => {
    try {
      console.log("Loading forges from API...")
      const response: ForgesPublic = await ForgeService.readForges()
      console.log("Loaded forges:", response)
      const forgesData = response.data as Forge[]
      setForges(forgesData)
      if (forgesData.length > 0 && !forgesData[0].is_folder) {
        setSelectedForge(forgesData[0])
        setEditTitle(forgesData[0].title || "")
        setEditContent(forgesData[0].content || "")
      }
    } catch (error: any) {
      console.error("Failed to load forges:", error)
      console.error(
        "Error details:",
        error?.response?.data || error?.message || error,
      )
    }
  }

  // Load forges on mount
  useEffect(() => {
    loadForges()
  }, [loadForges])

  const handleCreateNew = () => {
    setIsCreatingFolder(false)
    setNewTitle("")
    setNewContent("")
    setIsCreateDialogOpen(true)
  }

  const handleCreateFolder = () => {
    setIsCreatingFolder(true)
    setNewTitle("")
    setNewContent("")
    setIsCreateDialogOpen(true)
  }

  const handleSubmitCreate = async () => {
    try {
      const titleToUse =
        newTitle.trim() || (isCreatingFolder ? "nebula" : "nova")

      const requestData = {
        title: titleToUse,
        content: newContent || "",
        is_folder: isCreatingFolder,
      }

      console.log("Creating forge with data:", requestData)

      const response = await ForgeService.createForge({
        requestBody: requestData,
      })
      console.log("Created forge response:", response)
      const newForge = response as any as Forge

      setForges([...forges, newForge])
      if (!isCreatingFolder) {
        setSelectedForge(newForge)
        setEditTitle(newForge.title || "")
        setEditContent(newForge.content || "")
      }
      setIsCreateDialogOpen(false)
      setNewTitle("")
      setNewContent("")

      toast.showSuccessToast(`${isCreatingFolder ? "Folder" : "Note"} created`)
    } catch (error: any) {
      console.error("Failed to create forge:", error)
      console.error("Error response:", error?.response)
      console.error("Error data:", error?.response?.data)
      console.error("Error status:", error?.response?.status)

      let errorMessage = "创建失败"
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail
        if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => d.msg).join(", ")
        } else {
          errorMessage = JSON.stringify(detail)
        }
      } else if (error?.message) {
        errorMessage = error.message
      }

      toast.showErrorToast(errorMessage)
    }
  }

  const handleSelectForge = (forge: Forge) => {
    if (forge.is_folder) {
      setSelectedFolderId(forge.id)
    } else {
      setSelectedForge(forge)
      setEditTitle(forge.title || "")
      setEditContent(forge.content || "")
    }
  }

  const handleCreateFileInFolder = async (
    folderId: string,
    name: string,
    isFolder: boolean = false,
  ) => {
    try {
      // Check for duplicate names in the same parent folder
      const existingInFolder = forges.filter(
        (f) =>
          f.parent_id === folderId &&
          f.title.toLowerCase() === name.toLowerCase().trim(),
      )

      let finalName = name.trim()

      // If duplicate found, add number suffix with parentheses
      if (existingInFolder.length > 0) {
        const baseName = finalName
        let counter = 1

        // Keep incrementing until we find a unique name
        while (
          forges.some(
            (f) =>
              f.parent_id === folderId &&
              f.title.toLowerCase() ===
                `${baseName} (${counter})`.toLowerCase(),
          )
        ) {
          counter++
        }

        finalName = `${baseName} (${counter})`
      }

      const response = await ForgeService.createForge({
        requestBody: {
          title: finalName || (isFolder ? "nebula" : "nova"),
          content: "",
          is_folder: isFolder,
          parent_id: folderId,
        },
      })
      const newForge = response as any as Forge

      // Add to forges array
      setForges((prev) => [...prev, newForge])

      // Select the new item if it's a file
      if (!isFolder) {
        setSelectedForge(newForge)
        setEditTitle(newForge.title || "")
        setEditContent(newForge.content || "")
      }

      toast.showSuccessToast(isFolder ? "Folder created" : "File created")
    } catch (error: any) {
      console.error("Failed to create:", error)
      toast.showErrorToast(error?.message || "创建失败")
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditTitle(e.target.value || "")
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value || "")
  }

  const handleDeleteForge = async (id: string) => {
    try {
      await ForgeService.deleteForge({ id })

      setForges(forges.filter((f) => f.id !== id))
      if (selectedForge?.id === id) {
        setSelectedForge(null)
      }

      toast.showSuccessToast("Forge deleted")
    } catch (error) {
      console.error("Failed to delete forge:", error)
      toast.showErrorToast("Failed to delete forge")
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return

    const newWidth = e.clientX
    if (newWidth >= 200 && newWidth <= 600) {
      setSidebarWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const filteredForges = forges.filter((forge) =>
    forge.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const rootForges = filteredForges.filter((f) => !f.parent_id)

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowStarGazing(true)}
            title="Star Gazing View"
          >
            <Telescope className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateNew}
            title="New Note"
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateFolder}
            title="New Folder"
            className="h-8 w-8"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar - File Tree */}
      <div
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        className="pr-4"
      >
        <div className="mb-4">
          <div className="flex gap-1 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateNew}
              title="New Note"
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateFolder}
              title="New Folder"
              className="h-8 w-8"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-18rem)]">
          {rootForges.map((forge) => (
            <TreeItem
              key={forge.id}
              forge={forge}
              allForges={filteredForges}
              selectedFolderId={selectedFolderId}
              onSelect={handleSelectForge}
              onDelete={handleDeleteForge}
              onCreateFile={handleCreateFileInFolder}
            />
          ))}
        </div>
      </div>

      {/* Resizer - positioned on the border */}
      <div
        className={`w-px cursor-col-resize transition-colors ${
          isResizing ? "bg-primary" : "bg-border"
        }`}
        style={{ marginRight: "-1px" }}
        onMouseDown={handleMouseDown}
      />

      {/* Main Content - Editor */}
      <div className="flex-1 flex flex-col min-w-0 pl-4">
        {selectedForge ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editTitle}
                  onChange={handleTitleChange}
                  className="text-lg font-semibold border-none px-0 focus-visible:ring-0 w-full"
                  placeholder="Note title..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteForge(selectedForge.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 mt-4">
              <textarea
                value={editContent}
                onChange={handleContentChange}
                className="h-full w-full resize-none border-none bg-transparent px-0 py-2 text-sm focus:outline-none font-mono leading-relaxed"
                placeholder="Write your note in Markdown..."
              />
            </div>

            {/* Status Bar */}
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
              <span>
                {editContent.split(/\s+/).filter((w) => w.length > 0).length}{" "}
                words
              </span>
              <span>
                Last updated:{" "}
                {new Date(selectedForge.updated_at).toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Select a note to view</p>
              <p className="text-sm mt-2">or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              Create New {isCreatingFolder ? "Folder" : "Note"}
            </DialogTitle>
            <DialogDescription>
              Create a new {isCreatingFolder ? "folder" : "note"} in your Forge.
              Leave title empty to use default name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={isCreatingFolder ? "nebula" : "nova"}
              />
            </div>
            {!isCreatingFolder && (
              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown)</Label>
                <textarea
                  id="content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="# My Note\n\nStart writing..."
                  rows={12}
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 星球视图 */}
      {showStarGazing && (
        <StarGazingView onClose={() => setShowStarGazing(false)} />
      )}
    </div>
  )
}

// Tree Item Component
interface TreeItemProps {
  forge: Forge
  allForges: Forge[]
  selectedFolderId: string | null
  onSelect: (forge: Forge) => void
  onDelete: (id: string) => void
  onCreateFile: (folderId: string, name: string, isFolder: boolean) => void
  depth?: number
}

function TreeItem({
  forge,
  allForges,
  selectedFolderId,
  onSelect,
  onDelete,
  onCreateFile,
  depth = 0,
}: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const children = allForges.filter((f) => f.parent_id === forge.id)
  const hasChildren = children.length > 0

  const handleClick = () => {
    if (forge.is_folder) {
      setIsExpanded(!isExpanded)
      onSelect(forge)
    } else {
      onSelect(forge)
    }
  }

  const handleCreateFileClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (forge.is_folder) {
      setIsCreatingFile(true)
      setIsCreatingFolder(false)
      setNewFileName("")
    }
  }

  const handleCreateFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (forge.is_folder) {
      setIsCreatingFolder(true)
      setIsCreatingFile(false)
      setNewFolderName("")
    }
  }

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFileName.trim()) return

    await onCreateFile(forge.id, newFileName.trim(), false)
    setIsCreatingFile(false)
    setNewFileName("")
  }

  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    await onCreateFile(forge.id, newFolderName.trim(), true)
    setIsCreatingFolder(false)
    setNewFolderName("")
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group text-sm ${
          forge.is_folder && selectedFolderId === forge.id
            ? "bg-accent"
            : "hover:bg-accent"
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
        onClick={handleClick}
      >
        {forge.is_folder ? (
          hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )
        ) : (
          <div className="w-4" />
        )}

        {forge.is_folder ? (
          <Folder className="h-4 w-4 text-primary" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}

        <span className="flex-1 truncate">{forge.title}</span>

        {forge.is_folder && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={handleCreateFileClick}
              title="Create file in folder"
            >
              <FileText className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={handleCreateFolderClick}
              title="Create folder"
            >
              <FolderPlus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(forge.id)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>

      {forge.is_folder && isCreatingFile && (
        <form onSubmit={handleFileSubmit} className="ml-6 mt-1">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => {
              setIsCreatingFile(false)
              setNewFileName("")
            }}
            placeholder="File name..."
            className="w-full px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>
      )}

      {forge.is_folder && isCreatingFolder && (
        <form onSubmit={handleFolderSubmit} className="ml-6 mt-1">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => {
              setIsCreatingFolder(false)
              setNewFolderName("")
            }}
            placeholder="Folder name..."
            className="w-full px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>
      )}

      {forge.is_folder &&
        isExpanded &&
        children.map((child) => (
          <TreeItem
            key={child.id}
            forge={child}
            selectedFolderId={selectedFolderId}
            allForges={allForges}
            onSelect={onSelect}
            onDelete={onDelete}
            onCreateFile={onCreateFile}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}
