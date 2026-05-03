import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Link2,
  Pen,
  Plus,
  Search,
  Share2,
  Sparkles,
  Split,
  Telescope,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { type ForgePublic, ForgeService, type ForgesPublic, OpenAPI } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useToast from "@/hooks/useCustomToast"
import { AISummaryDialog } from "./AISummaryDialog"
import { MarkdownEditor } from "./MarkdownEditor"
import { getModelThumbnailKey } from "./Model3DRenderer"
import StarGazingView from "./StarGazingView"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Forge extends Omit<ForgePublic, "content" | "is_folder"> {
  content?: string
  is_folder?: boolean
}

interface FlatItem {
  id: string
  forge: Forge
  depth: number
  parentId: string | null
}

// ─── Order persistence ────────────────────────────────────────────────────────

const ORDER_KEY = "forge_order_map"

function loadOrderMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistOrderMap(map: Record<string, string[]>) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(map))
}

// ─── ForgeList ─────────────────────────────────────────────────────────────────

export function ForgeList() {
  const [forges, setForges] = useState<Forge[]>([])
  const [orderMap, setOrderMap] = useState<Record<string, string[]>>(loadOrderMap)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

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
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split")
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [backlinks, setBacklinks] = useState<Forge[]>([])
  const [isPublishing, setIsPublishing] = useState(false)

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overFolderId, setOverFolderId] = useState<string | null>(null)
  const pointerYRef = useRef(0)

  const toast = useToast()

  // Track pointer for drop-into-folder detection
  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointerYRef.current = e.clientY }
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [])

  // ─── Auto-save ──────────────────────────────────────────────────────────────

  const autoSave = useCallback(async () => {
    if (!selectedForge) return
    try {
      await ForgeService.updateForge({
        id: selectedForge.id,
        requestBody: {
          title: editTitle || selectedForge.title,
          content: editContent !== selectedForge.content ? editContent : undefined,
        },
      })
      const updated: Forge = {
        ...selectedForge,
        title: editTitle || selectedForge.title,
        content: editContent || "",
        updated_at: new Date().toISOString(),
      }
      setForges((prev) => prev.map((f) => (f.id === selectedForge.id ? updated : f)))
      setSelectedForge(updated)
    } catch (err) {
      console.error("Auto-save failed:", err)
    }
  }, [selectedForge, editTitle, editContent])

  useEffect(() => {
    if (!selectedForge) return
    const t = setTimeout(() => { if (editTitle || editContent) autoSave() }, 2000)
    return () => clearTimeout(t)
  }, [editTitle, editContent, selectedForge, autoSave])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (selectedForge) { autoSave(); toast.showSuccessToast("已保存") }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedForge, autoSave, toast.showSuccessToast])

  // ─── Load ──────────────────────────────────────────────────────────────────

  const loadForges = async () => {
    try {
      const response: ForgesPublic = await ForgeService.readForges()
      const data = response.data as Forge[]
      setForges(data)
      if (data.length > 0 && !data[0].is_folder) {
        setSelectedForge(data[0])
        setEditTitle(data[0].title || "")
        setEditContent(data[0].content || "")
      }
    } catch (err) {
      console.error("Failed to load forges:", err)
    }
  }

  useEffect(() => { loadForges() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: Event) => {
      const { forgeId } = (e as CustomEvent).detail
      setForges((prev) => prev.map((f) => f.id === forgeId ? { ...f, published_to_community: false } : f))
      setSelectedForge((prev) => prev?.id === forgeId ? ({ ...prev, published_to_community: false } as typeof prev) : prev)
    }
    window.addEventListener('community-post-deleted', handler)
    return () => window.removeEventListener('community-post-deleted', handler)
  }, [])

  // ─── Backlinks ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedForge || selectedForge.is_folder) { setBacklinks([]); return }
    ForgeService.getBacklinks({ id: selectedForge.id })
      .then(res => setBacklinks(res.data as Forge[]))
      .catch(() => setBacklinks([]))
  }, [selectedForge?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Order helpers ─────────────────────────────────────────────────────────

  const updateOrderMap = useCallback((next: Record<string, string[]>) => {
    setOrderMap(next)
    persistOrderMap(next)
  }, [])

  const getOrderedChildren = useCallback(
    (parentId: string | null, items: Forge[]): Forge[] => {
      const key = parentId ?? "root"
      const children = items.filter((f) => (f.parent_id ?? null) === parentId)
      const ids = orderMap[key]
      if (!ids?.length) return children

      const map = new Map(children.map((f) => [f.id, f]))
      const ordered: Forge[] = []
      for (const id of ids) {
        const f = map.get(id)
        if (f) { ordered.push(f); map.delete(id) }
      }
      map.forEach((f) => ordered.push(f))
      return ordered
    },
    [orderMap],
  )

  // ─── Flat list for sortable ────────────────────────────────────────────────

  const filteredForges = useMemo(
    () => forges.filter((f) => f.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [forges, searchTerm],
  )

  const flatItems = useMemo((): FlatItem[] => {
    const result: FlatItem[] = []
    function flatten(parentId: string | null, depth: number) {
      for (const forge of getOrderedChildren(parentId, filteredForges)) {
        result.push({ id: forge.id, forge, depth, parentId })
        if (forge.is_folder && expandedFolders.has(forge.id)) {
          flatten(forge.id, depth + 1)
        }
      }
    }
    flatten(null, 0)
    return result
  }, [filteredForges, expandedFolders, getOrderedChildren])

  const flatItemIds = useMemo(() => flatItems.map((f) => f.id), [flatItems])

  // ─── DnD sensors & handlers ────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
    setOverFolderId(null)
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) { setOverFolderId(null); return }
    const overForge = forges.find((f) => f.id === over.id)
    if (overForge?.is_folder) {
      const el = document.querySelector(`[data-forge-id="${over.id}"]`) as HTMLElement | null
      if (el) {
        const rect = el.getBoundingClientRect()
        const pct = (pointerYRef.current - rect.top) / rect.height
        if (pct >= 0.2 && pct <= 0.8) { setOverFolderId(over.id as string); return }
      }
    }
    setOverFolderId(null)
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const prevActiveId = activeId
    const prevOverFolderId = overFolderId
    setActiveId(null)
    setOverFolderId(null)

    if (!over || active.id === over.id) return

    const activeItem = flatItems.find((f) => f.id === active.id)
    const overItem = flatItems.find((f) => f.id === over.id)
    if (!activeItem) return

    if (prevOverFolderId && prevOverFolderId !== activeItem.parentId) {
      // ── REPARENT into folder ─────────────────────────────────────────────
      const newParentId = prevOverFolderId
      const oldParentKey = activeItem.parentId ?? "root"
      const newParentKey = newParentId

      const next = { ...orderMap }

      // Remove from old level
      const oldSiblings = getOrderedChildren(activeItem.parentId, forges).map((f) => f.id)
      next[oldParentKey] = (next[oldParentKey] ?? oldSiblings).filter((id) => id !== active.id)

      // Append to new level
      const newSiblings = getOrderedChildren(newParentId, forges).map((f) => f.id)
      next[newParentKey] = [...(next[newParentKey] ?? newSiblings), active.id as string]

      updateOrderMap(next)
      setForges((prev) =>
        prev.map((f) => (f.id === active.id ? { ...f, parent_id: newParentId } : f)),
      )
      setExpandedFolders((prev) => new Set([...prev, newParentId]))

      try {
        await ForgeService.updateForge({
          id: active.id as string,
          requestBody: { parent_id: newParentId },
        })
      } catch {
        // rollback
        setForges((prev) =>
          prev.map((f) =>
            f.id === prevActiveId ? { ...f, parent_id: activeItem.parentId ?? undefined } : f,
          ),
        )
        updateOrderMap(orderMap)
        toast.showErrorToast("移动失败")
      }
    } else if (overItem && activeItem.parentId === overItem.parentId) {
      // ── REORDER within same level ─────────────────────────────────────────
      const key = activeItem.parentId ?? "root"
      const current =
        orderMap[key] ?? getOrderedChildren(activeItem.parentId, forges).map((f) => f.id)
      const oldIdx = current.indexOf(active.id as string)
      const newIdx = current.indexOf(over.id as string)
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        updateOrderMap({ ...orderMap, [key]: arrayMove(current, oldIdx, newIdx) })
      }
    } else if (overItem) {
      // ── CROSS-LEVEL MOVE (drag between folders via reorder UI) ────────────
      const newParentId = overItem.parentId
      const oldKey = activeItem.parentId ?? "root"
      const newKey = newParentId ?? "root"

      const next = { ...orderMap }
      const oldSiblings = getOrderedChildren(activeItem.parentId, forges).map((f) => f.id)
      next[oldKey] = (next[oldKey] ?? oldSiblings).filter((id) => id !== active.id)

      const newSiblings = getOrderedChildren(newParentId, forges).map((f) => f.id)
      const baseOrder = next[newKey] ?? newSiblings
      const overIdx = baseOrder.indexOf(over.id as string)
      const insertAt = overIdx >= 0 ? overIdx + 1 : baseOrder.length
      next[newKey] = [
        ...baseOrder.slice(0, insertAt),
        active.id as string,
        ...baseOrder.slice(insertAt),
      ]

      updateOrderMap(next)
      setForges((prev) =>
        prev.map((f) =>
          f.id === active.id ? { ...f, parent_id: newParentId ?? undefined } : f,
        ),
      )

      try {
        await ForgeService.updateForge({
          id: active.id as string,
          requestBody: { parent_id: newParentId ?? null },
        })
      } catch {
        setForges((prev) =>
          prev.map((f) =>
            f.id === prevActiveId ? { ...f, parent_id: activeItem.parentId ?? undefined } : f,
          ),
        )
        updateOrderMap(orderMap)
        toast.showErrorToast("移动失败")
      }
    }
  }

  const handleDragCancel = () => { setActiveId(null); setOverFolderId(null) }

  // ─── CRUD handlers ─────────────────────────────────────────────────────────

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
    isFolder = false,
  ) => {
    try {
      const existing = forges.filter(
        (f) => f.parent_id === folderId && f.title.toLowerCase() === name.toLowerCase().trim(),
      )
      let finalName = name.trim()
      if (existing.length > 0) {
        const base = finalName
        let counter = 1
        while (
          forges.some(
            (f) =>
              f.parent_id === folderId &&
              f.title.toLowerCase() === `${base} (${counter})`.toLowerCase(),
          )
        ) counter++
        finalName = `${base} (${counter})`
      }

      const res = await ForgeService.createForge({
        requestBody: {
          title: finalName || (isFolder ? "nebula" : "nova"),
          content: "",
          is_folder: isFolder,
          parent_id: folderId,
        },
      })
      const newForge = res as unknown as Forge
      setForges((prev) => [...prev, newForge])
      if (!isFolder) {
        setSelectedForge(newForge)
        setEditTitle(newForge.title || "")
        setEditContent(newForge.content || "")
      }
      toast.showSuccessToast(isFolder ? "Folder created" : "File created")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "创建失败"
      toast.showErrorToast(msg)
    }
  }

  const handleDeleteForge = async (id: string) => {
    try {
      await ForgeService.deleteForge({ id })
      setForges((prev) => prev.filter((f) => f.id !== id))
      if (selectedForge?.id === id) setSelectedForge(null)
      toast.showSuccessToast("Forge deleted")
    } catch {
      toast.showErrorToast("Failed to delete forge")
    }
  }

  const startSummaryStream = async (forgeIds: string[], focus: string) => {
    const token = localStorage.getItem("access_token")
    let response: Response
    try {
      response = await fetch("/api/v1/forge/summarize-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ forge_ids: forgeIds, focus: focus || "" }),
      })
    } catch {
      toast.showErrorToast("连接失败，请重试")
      return
    }
    if (!response.ok) {
      toast.showErrorToast("AI 服务暂不可用")
      return
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const raw = line.slice(6).trim()
        if (!raw || raw === "[DONE]") continue
        let data: Record<string, string>
        try { data = JSON.parse(raw) } catch { continue }

        if (data.type === "init") {
          const now = new Date().toISOString()
          const newForge: Forge = {
            id: data.forge_id,
            title: data.title,
            is_folder: false,
            owner_id: "",
            parent_id: null,
            created_at: now,
            updated_at: now,
          } as unknown as Forge
          setForges((prev) => [newForge, ...prev])
          setSelectedForge(newForge)
          setEditTitle(data.title)
          setEditContent(data.header)
          setIsStreaming(true)
        } else if (data.type === "chunk") {
          setEditContent((prev) => prev + data.content)
        } else if (data.type === "done") {
          setIsStreaming(false)
        } else if (data.type === "error") {
          toast.showErrorToast(data.message || "AI 生成失败")
          setIsStreaming(false)
        }
      }
    }
    setIsStreaming(false)
  }

  const handleSubmitCreate = async () => {
    try {
      const titleToUse = newTitle.trim() || (isCreatingFolder ? "nebula" : "nova")
      const res = await ForgeService.createForge({
        requestBody: { title: titleToUse, content: newContent || "", is_folder: isCreatingFolder },
      })
      const newForge = res as unknown as Forge
      setForges((prev) => [...prev, newForge])
      if (!isCreatingFolder) {
        setSelectedForge(newForge)
        setEditTitle(newForge.title || "")
        setEditContent(newForge.content || "")
      }
      setIsCreateDialogOpen(false)
      setNewTitle("")
      setNewContent("")
      toast.showSuccessToast(`${isCreatingFolder ? "Folder" : "Note"} created`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "创建失败"
      toast.showErrorToast(msg)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setIsImporting(true)
    try {
      const token = localStorage.getItem("access_token")
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/v1/forge/import-file", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = err?.detail
        const msg = Array.isArray(detail)
          ? detail.map((d: { loc?: string[]; msg: string }) => `${d.loc?.join(".")}: ${d.msg}`).join("; ")
          : typeof detail === "string"
            ? detail
            : `导入失败 (${res.status})`
        throw new Error(msg)
      }
      const newForge = (await res.json()) as Forge
      setForges((prev) => [...prev, newForge])
      setSelectedForge(newForge)
      setEditTitle(newForge.title || "")
      setEditContent(newForge.content || "")
      toast.showSuccessToast(`已导入：${newForge.title}`)
    } catch (err) {
      toast.showErrorToast(err instanceof Error ? err.message : "导入失败")
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = async (format: string) => {
    if (!selectedForge || selectedForge.is_folder) return
    const token = localStorage.getItem("access_token")
    const content = editContent || selectedForge.content || ""

    // 检测是否含有 3D 模型标签，若有则走 zip 导出流程
    const modelSrcs = [
      ...[...content.matchAll(/<model\s+src="([^"]+)"/g)].map((m) => m[1]),
      ...[...content.matchAll(/class="model-container"[^>]*data-src="([^"]+)"/g)].map((m) => m[1]),
    ]
    if (format === "md" && modelSrcs.length > 0) {
      // 解析 3D Renderer 实际存储截图时用的 key：
      // resolveModelPath 在跨域时会把 /models/... 变成 http://host/models/...
      // 所以要同时尝试短路径 key 和完整 URL key
      function resolveForThumbnailKey(src: string): string {
        if (!src.startsWith("/") || !OpenAPI.BASE) return src
        try {
          const base = new URL(OpenAPI.BASE, window.location.origin)
          if (base.origin !== window.location.origin) return `${base.origin}${src}`
        } catch {}
        return src
      }

      const thumbnails: Record<string, string> = {}
      for (const src of modelSrcs) {
        const resolvedSrc = resolveForThumbnailKey(src)
        const saved =
          localStorage.getItem(getModelThumbnailKey(resolvedSrc)) ??
          localStorage.getItem(getModelThumbnailKey(src))
        if (saved) thumbnails[src] = saved
      }
      const missingSrcs = modelSrcs.filter((src) => !thumbnails[src])
      if (missingSrcs.length > 0) {
        toast.showErrorToast(
          `请先在预览模式中打开笔记，等待 3D 模型加载完成后再导出（${missingSrcs.length} 个模型尚无截图）`
        )
        return
      }
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (token) headers["Authorization"] = `Bearer ${token}`
        const res = await fetch(`/api/v1/forge/${selectedForge.id}/export-zip`, {
          method: "POST",
          headers,
          body: JSON.stringify({ thumbnails }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.detail ?? `导出失败 (${res.status})`)
        }
        const blob = await res.blob()
        const disposition = res.headers.get("Content-Disposition") ?? ""
        const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i)
        const filename = match ? decodeURIComponent(match[1]) : `${selectedForge.title || "untitled"}.zip`
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        toast.showErrorToast(err instanceof Error ? err.message : "导出失败")
      }
      return
    }

    try {
      const res = await fetch(`/api/v1/forge/${selectedForge.id}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail ?? `导出失败 (${res.status})`)
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i)
      const filename = match ? decodeURIComponent(match[1]) : `${selectedForge.title || "untitled"}.${format}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.showErrorToast(err instanceof Error ? err.message : "导出失败")
    }
  }

  // ─── Publish to Community ─────────────────────────────────────────────────

  const handlePublishToCommunity = async () => {
    if (!selectedForge || isPublishing) return

    // Extract <model src="..."> tags to find thumbnails
    const content = editContent || selectedForge.content || ""
    const modelMatches = [...content.matchAll(/<model\s+src="([^"]+)"/g)]
    let thumbnail: string | undefined
    for (const m of modelMatches) {
      const src = m[1]
      let resolved = src
      if (src.startsWith("/") && OpenAPI.BASE) {
        try {
          const base = new URL(OpenAPI.BASE, window.location.origin)
          if (base.origin !== window.location.origin) resolved = `${base.origin}${src}`
        } catch {}
      }
      const saved =
        localStorage.getItem(getModelThumbnailKey(resolved)) ??
        localStorage.getItem(getModelThumbnailKey(src))
      if (saved) { thumbnail = saved; break }
    }

    setIsPublishing(true)
    try {
      const token = localStorage.getItem("access_token")
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`/api/v1/forge/${selectedForge.id}/publish-to-community`, {
        method: "POST",
        headers,
        body: JSON.stringify({ thumbnail: thumbnail ?? null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? res.statusText)
      }
      setForges((prev) =>
        prev.map((f) => f.id === selectedForge.id ? { ...f, published_to_community: true } : f)
      )
      setSelectedForge((prev) => prev ? ({ ...prev, published_to_community: true } as typeof prev) : prev)
      toast.showSuccessToast("已发布到 Community")
    } catch (err) {
      toast.showErrorToast(err instanceof Error ? err.message : "发布失败")
    } finally {
      setIsPublishing(false)
    }
  }

  // ─── Sidebar resize ────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true) }
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return
      const w = e.clientX
      if (w >= 200 && w <= 600) setSidebarWidth(w)
    },
    [isResizing],
  )
  const handleMouseUp = useCallback(() => setIsResizing(false), [])

  useEffect(() => {
    if (!isResizing) return
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // ─── Render ────────────────────────────────────────────────────────────────

  const activeItem = flatItems.find((f) => f.id === activeId)

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <div
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        className="flex flex-col border-r pr-4 h-full"
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowStarGazing(true)}
              title="Star Gazing View"
            >
              <Telescope className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => { setIsCreatingFolder(false); setNewTitle(""); setNewContent(""); setIsCreateDialogOpen(true) }}
              title="New Note"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => { setIsCreatingFolder(true); setNewTitle(""); setNewContent(""); setIsCreateDialogOpen(true) }}
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => importInputRef.current?.click()}
              title="Import File"
              disabled={isImporting}
            >
              <Upload className={`h-4 w-4 ${isImporting ? "animate-pulse" : ""}`} />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setIsAISummaryOpen(true)}
              title="AI 知识梳理"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <input
              ref={importInputRef} type="file"
              accept=".pdf,.docx,.pptx,.xlsx,.xls,.html,.htm,.csv,.json,.xml,.epub,.txt,.md"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {/* Search + Tree */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 shrink-0">
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

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            >
              <SortableContext items={flatItemIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5 py-1">
                  {flatItems.map((item) => (
                    <SortableTreeItem
                      key={item.id}
                      item={item}
                      isSelected={
                        (item.forge.is_folder && selectedFolderId === item.id) ||
                        (!item.forge.is_folder && selectedForge?.id === item.id)
                      }
                      isDraggingThis={activeId === item.id}
                      isDropTarget={overFolderId === item.id}
                      isExpanded={expandedFolders.has(item.id)}
                      onToggleExpand={() =>
                        setExpandedFolders((prev) => {
                          const next = new Set(prev)
                          if (next.has(item.id)) next.delete(item.id)
                          else next.add(item.id)
                          return next
                        })
                      }
                      onSelect={handleSelectForge}
                      onDelete={handleDeleteForge}
                      onCreateFile={handleCreateFileInFolder}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Ghost during drag */}
              <DragOverlay dropAnimation={null}>
                {activeItem ? (
                  <div
                    style={{ paddingLeft: `${activeItem.depth * 16 + 8}px` }}
                    className="flex items-center gap-2 py-1.5 pr-2 rounded-md text-sm bg-background/95 shadow-xl ring-1 ring-border backdrop-blur-sm opacity-90"
                    // subtle rotation for "picked up" feel
                    // biome-ignore lint/suspicious/noExplicitAny: inline style
                    data-dnd-ghost="true"
                  >
                    {activeItem.forge.is_folder ? (
                      <Folder className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate font-medium">{activeItem.forge.title}</span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className={`w-px cursor-col-resize transition-colors ${isResizing ? "bg-primary" : "bg-border"}`}
        style={{ marginRight: "-1px" }}
        onMouseDown={handleMouseDown}
      />

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0 pl-4 pr-4 h-full overflow-hidden">
        {selectedForge ? (
          <>
            <div className="flex items-center justify-between pb-4 border-b shrink-0">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value || "")}
                  className="text-lg font-semibold border-none px-0 focus-visible:ring-0 w-full"
                  placeholder="Note title..."
                />
              </div>
              <div className="flex items-center gap-1">
                {(["edit", "preview", "split"] as const).map((mode) => {
                  const Icon = mode === "edit" ? Pen : mode === "preview" ? Eye : Split
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`p-1.5 rounded transition-colors ${
                        viewMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-muted-foreground"
                      }`}
                      title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  )
                })}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="导出笔记">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["md", "txt", "html", "docx", "pdf"] as const).map((fmt) => (
                      <DropdownMenuItem key={fmt} onClick={() => handleExport(fmt)}>
                        导出为 .{fmt}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {(selectedForge as any).published_to_community ? (
                  <button
                    className="p-1.5 rounded text-primary cursor-default"
                    title="已发布到 Community"
                    disabled
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    className={`p-1.5 rounded transition-colors hover:bg-accent text-muted-foreground ${isPublishing ? "opacity-50 cursor-wait" : ""}`}
                    title="发布到 Community"
                    onClick={handlePublishToCommunity}
                    disabled={isPublishing}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
                <Button
                  variant="ghost" size="icon"
                  onClick={() => handleDeleteForge(selectedForge.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden mt-4">
              <MarkdownEditor
                content={editContent}
                onChange={setEditContent}
                viewMode={viewMode}
                autoScroll={isStreaming}
                forges={forges.filter(f => !f.is_folder)}
                onNavigate={(id) => {
                  const target = forges.find(f => f.id === id)
                  if (target) handleSelectForge(target)
                }}
              />
            </div>

            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
              <span>
                {editContent.split(/\s+/).filter((w) => w.length > 0).length} words
              </span>
              <span>Last updated: {new Date(selectedForge.updated_at).toLocaleString()}</span>
            </div>

            {backlinks.length > 0 && (
              <div className="mt-2 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  被以下笔记引用
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {backlinks.map(bl => (
                    <button
                      key={bl.id}
                      type="button"
                      onClick={() => handleSelectForge(bl)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Link2 className="h-3 w-3" />
                      {bl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a note to start editing</p>
              <p className="text-sm mt-2">or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New {isCreatingFolder ? "Folder" : "Note"}</DialogTitle>
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showStarGazing && <StarGazingView onClose={() => setShowStarGazing(false)} />}

      <AISummaryDialog
        open={isAISummaryOpen}
        onOpenChange={setIsAISummaryOpen}
        forges={forges}
        onGenerate={startSummaryStream}
      />
    </div>
  )
}

// ─── SortableTreeItem ──────────────────────────────────────────────────────────

interface SortableTreeItemProps {
  item: FlatItem
  isSelected: boolean
  isDraggingThis: boolean
  isDropTarget: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onSelect: (forge: Forge) => void
  onDelete: (id: string) => void
  onCreateFile: (folderId: string, name: string, isFolder: boolean) => void
}

function SortableTreeItem({
  item,
  isSelected,
  isDraggingThis,
  isDropTarget,
  isExpanded,
  onToggleExpand,
  onSelect,
  onDelete,
  onCreateFile,
}: SortableTreeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
    // GPU acceleration during any active sort
    willChange: isDragging ? "transform" : "auto",
    opacity: isDraggingThis ? 0.35 : 1,
  }

  const indentPx = item.depth * 16

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Row */}
      <div
        data-forge-id={item.id}
        style={{ paddingLeft: `${indentPx}px` }}
        className={[
          "flex items-center gap-1.5 pr-1 py-1.5 rounded-md cursor-pointer group text-sm select-none",
          "transition-all duration-150",
          isDropTarget
            ? "bg-primary/15 ring-1 ring-primary/50 shadow-sm"
            : isSelected
              ? "bg-muted text-foreground hover:bg-muted"
              : "hover:bg-muted/60",
        ].join(" ")}
        onClick={() => {
          if (item.forge.is_folder) {
            onToggleExpand()
            onSelect(item.forge)
          } else {
            onSelect(item.forge)
          }
        }}
        // spread drag listeners on the whole row; 6px activation constraint prevents mis-fires
        {...listeners}
      >
        {/* Chevron */}
        {item.forge.is_folder ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {/* Icon */}
        {item.forge.is_folder ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-primary shrink-0" />
          )
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        {/* Title */}
        <span className="flex-1 truncate leading-tight">{item.forge.title}</span>

        {/* Folder actions */}
        {item.forge.is_folder && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 shrink-0">
            <Button
              variant="ghost" size="icon" className="h-5 w-5"
              title="新建文件"
              onClick={(e) => {
                e.stopPropagation()
                setIsCreatingFile(true)
                setIsCreatingFolder(false)
                setNewFileName("")
              }}
            >
              <FileText className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-5 w-5"
              title="新建文件夹"
              onClick={(e) => {
                e.stopPropagation()
                setIsCreatingFolder(true)
                setIsCreatingFile(false)
                setNewFolderName("")
              }}
            >
              <FolderPlus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.id)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Inline "new file" input */}
      {item.forge.is_folder && isCreatingFile && (
        <form
          style={{ paddingLeft: `${indentPx + 24}px` }}
          className="mt-1 pr-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newFileName.trim()) return
            onCreateFile(item.id, newFileName.trim(), false)
            setIsCreatingFile(false)
            setNewFileName("")
          }}
        >
          <input
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => { setIsCreatingFile(false); setNewFileName("") }}
            placeholder="文件名…"
            className="w-full px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>
      )}

      {/* Inline "new folder" input */}
      {item.forge.is_folder && isCreatingFolder && (
        <form
          style={{ paddingLeft: `${indentPx + 24}px` }}
          className="mt-1 pr-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newFolderName.trim()) return
            onCreateFile(item.id, newFolderName.trim(), true)
            setIsCreatingFolder(false)
            setNewFolderName("")
          }}
        >
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => { setIsCreatingFolder(false); setNewFolderName("") }}
            placeholder="文件夹名…"
            className="w-full px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>
      )}
    </div>
  )
}
