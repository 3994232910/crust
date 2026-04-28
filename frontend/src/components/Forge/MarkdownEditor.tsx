import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Box, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Model3DViewerFrame } from './Model3DViewerFrame'
import { ModelUploadDialog } from './ModelUploadDialog'

async function uploadImageFile(file: File): Promise<string> {
  const token = localStorage.getItem('access_token')
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/v1/forge/upload-image', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail ?? '图片上传失败')
  }
  const data = await res.json()
  return data.url as string
}

interface WikiForge {
  id: string
  title: string | null
}

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  viewMode: 'edit' | 'preview' | 'split'
  onModelBind?: (paragraphId: string, modelPath: string, viewParams?: any) => void
  autoScroll?: boolean
  forges?: WikiForge[]
  onNavigate?: (id: string) => void
}

/** Replace [[title]] with <span class="wikilink" ...> for ReactMarkdown to parse. */
function preprocessWikilinks(content: string, forges: WikiForge[]): string {
  return content.replace(/\[\[([^\[\]\n]+)\]\]/g, (_match, title) => {
    const target = forges.find(f => f.title === title)
    const safeTitle = title.replace(/"/g, '&quot;')
    if (target) {
      return `<span class="wikilink" data-id="${target.id}" data-title="${safeTitle}">${safeTitle}</span>`
    }
    return `<span class="wikilink wikilink-unresolved" data-title="${safeTitle}">${safeTitle}</span>`
  })
}

export function MarkdownEditor({
  content,
  onChange,
  viewMode,
  onModelBind,
  autoScroll,
  forges = [],
  onNavigate,
}: MarkdownEditorProps) {
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // [[autocomplete state
  const [suggestions, setSuggestions] = useState<WikiForge[]>([])
  const [suggestionAnchor, setSuggestionAnchor] = useState(-1)
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)

  useEffect(() => {
    if (!autoScroll) return
    if (editorRef.current) editorRef.current.scrollTop = editorRef.current.scrollHeight
    if (previewRef.current) previewRef.current.scrollTop = previewRef.current.scrollHeight
  }, [content, autoScroll])

  // Ctrl+M to open model dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        setIsModelDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const insertModel = (modelTag: string) => {
    if (editorRef.current) {
      const textarea = editorRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + modelTag + content.substring(end)
      onChange(newContent)
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + modelTag.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 100)
    } else {
      onChange(content + modelTag)
    }
  }

  // Detect [[ in the editor and show suggestions
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    onChange(value)

    const pos = e.target.selectionStart
    const before = value.slice(0, pos)
    const match = before.match(/\[\[([^\[\]\n]*)$/)

    if (match && forges.length > 0) {
      const query = match[1].toLowerCase()
      setSuggestionAnchor(pos - match[0].length)
      setSelectedSuggestion(0)
      const filtered = forges
        .filter(f => f.title && f.title.toLowerCase().includes(query))
        .slice(0, 8)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
      setSuggestionAnchor(-1)
    }
  }, [onChange, forges])

  const insertSuggestion = useCallback((forge: WikiForge) => {
    const textarea = editorRef.current
    if (!textarea || suggestionAnchor < 0 || !forge.title) return

    const pos = textarea.selectionStart
    const before = content.slice(0, suggestionAnchor)
    const after = content.slice(pos)
    const inserted = `[[${forge.title}]]`
    onChange(before + inserted + after)
    setSuggestions([])
    setSuggestionAnchor(-1)

    setTimeout(() => {
      const newPos = suggestionAnchor + inserted.length
      textarea.setSelectionRange(newPos, newPos)
      textarea.focus()
    }, 50)
  }, [content, onChange, suggestionAnchor])

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestion(s => Math.min(s + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestion(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertSuggestion(suggestions[selectedSuggestion])
    } else if (e.key === 'Escape') {
      setSuggestions([])
    }
  }, [suggestions, selectedSuggestion, insertSuggestion])

  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const insertTextAtCursor = useCallback((text: string) => {
    const textarea = editorRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = content.substring(0, start) + text + content.substring(end)
    onChange(newContent)
    setTimeout(() => {
      textarea.focus()
      const pos = start + text.length
      textarea.setSelectionRange(pos, pos)
    }, 50)
  }, [content, onChange])

  // 用 ref 持有最新 content，供异步上传回调替换占位符时使用
  const contentRef = useRef(content)
  contentRef.current = content

  const handleImageFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    setIsUploadingImage(true)
    try {
      for (const file of imageFiles) {
        const placeholder = `![上传中…]()`
        insertTextAtCursor(placeholder)
        try {
          const url = await uploadImageFile(file)
          const altText = file.name.replace(/\.[^.]+$/, '')
          onChange(contentRef.current.replace(placeholder, `![${altText}](${url})`))
        } catch (e) {
          onChange(contentRef.current.replace(placeholder, ''))
          console.error('图片上传失败:', e)
        }
      }
    } finally {
      setIsUploadingImage(false)
    }
  }, [insertTextAtCursor, onChange])

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    if (imageItems.length === 0) return
    e.preventDefault()
    const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[]
    await handleImageFiles(files)
  }, [handleImageFiles])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.dataTransfer.files)
    if (!files.some(f => f.type.startsWith('image/'))) return
    e.preventDefault()
    await handleImageFiles(files)
  }, [handleImageFiles])

  const processedContent = preprocessWikilinks(content, forges)

  // 用 ref 持有最新回调，避免 useMemo 依赖频繁变化
  const onNavigateRef = useRef(onNavigate)
  const onModelBindRef = useRef(onModelBind)
  onNavigateRef.current = onNavigate
  onModelBindRef.current = onModelBind

  // 稳定的 components 对象 —— 不依赖 content/forges，避免每次击键都 unmount Model3DRenderer
  const markdownComponents = useMemo(() => ({
    span: ({ node: _n, className, children, ...props }: any) => {
      if (className?.includes('wikilink')) {
        const id = props['data-id']
        const title = props['data-title']
        return (
          <button
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium not-prose transition-colors ${
              id
                ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
            }`}
            onClick={() => id && onNavigateRef.current?.(id)}
            title={id ? `跳转到：${title}` : `未找到笔记：${title}`}
            type="button"
          >
            <Link2 className="h-3 w-3" />
            {title || children}
          </button>
        )
      }
      return <span className={className} {...props}>{children}</span>
    },
    model: ({ src, 'bind-to': bindTo, children }: any) => {
      if (!src) return null
      const stableId = bindTo || src
      return (
        <div className="my-6 not-prose" data-paragraph-id={stableId}>
          <div className="border rounded-lg overflow-hidden bg-slate-800/50">
            <Model3DViewerFrame
              modelPath={src}
              onModelClick={(partName) => console.log(`Model clicked: ${partName}`)}
            />
            {children && (
              <div className="px-4 py-3 bg-muted/30 border-t text-sm text-muted-foreground">
                {children}
              </div>
            )}
          </div>
        </div>
      )
    },
    div: ({ node: _n, className, children, ...props }: any) => {
      if (props['data-src'] && className?.includes('model-container')) {
        const modelPath = props['data-src']
        // 用 data-bind 或 modelPath 作为稳定 ID，不用 Math.random()
        const bindTo = props['data-bind'] || modelPath
        return (
          <div className="my-6 not-prose" data-paragraph-id={bindTo}>
            <div className="border rounded-lg overflow-hidden bg-slate-800/50">
              <Model3DViewerFrame
                modelPath={modelPath}
                onModelClick={(partName) => {
                  console.log(`Model clicked: ${partName} for paragraph ${bindTo}`)
                  onModelBindRef.current?.(bindTo, modelPath)
                }}
              />
              {children && (
                <div className="px-4 py-3 bg-muted/30 border-t text-sm text-muted-foreground">
                  {children}
                </div>
              )}
            </div>
          </div>
        )
      }
      return <div className={className} {...props}>{children}</div>
    },
    h1: ({ children }: any) => (
      <h1
        id={children?.toString().toLowerCase().replace(/\s+/g, '-')}
        className="text-3xl font-bold mt-6 mb-4"
      >
        {children}
      </h1>
    ),
    p: ({ children }: any) => {
      const text = children?.toString() || ''
      const id = text.toLowerCase().replace(/\s+/g, '-').substring(0, 30)
      return (
        <p
          id={id}
          data-paragraph-id={id}
          className="my-3 cursor-pointer hover:bg-muted/30 transition-colors px-1 rounded"
        >
          {children}
        </p>
      )
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []) // 故意空依赖：所有外部回调通过 ref 访问，Model3DRenderer 永远不会因此 remount

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`overflow-hidden ${
            viewMode === 'split' ? 'flex-1 w-1/2 border-r' : 'flex-1 w-full'
          }`}>
            <div className="relative h-full">
              <textarea
                ref={editorRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleEditorKeyDown}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                placeholder={`# Start writing...

## 双向链接
输入 [[ 触发笔记引用，例如 [[笔记标题]]

## 插入 3D 模型
使用 HTML 标签嵌入 3D 模型：

&lt;div class="model-container" data-src="/models/example.glb" data-bind="paragraph-1"&gt;
  点击查看零件结构
&lt;/div&gt;

快捷键: Ctrl+M 打开模型面板`}
                className={`w-full h-full min-h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none overflow-y-auto ${isUploadingImage ? 'opacity-70' : ''}`}
                spellCheck={false}
                disabled={isUploadingImage}
              />

              {/* [[ autocomplete dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute bottom-12 left-4 z-50 w-64 bg-popover border rounded-md shadow-lg overflow-hidden">
                  {suggestions.map((forge, i) => (
                    <button
                      key={forge.id}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        i === selectedSuggestion
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                      onMouseDown={(e) => { e.preventDefault(); insertSuggestion(forge) }}
                    >
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{forge.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {isUploadingImage && (
                <div className="absolute bottom-16 right-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border">
                  图片上传中…
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsModelDialogOpen(true)}
                className="absolute bottom-4 right-4 gap-2"
                title="Ctrl+M"
              >
                <Box className="h-4 w-4" />
                插入模型
              </Button>
            </div>
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div ref={previewRef} className={`overflow-y-auto p-6 prose prose-invert max-w-none ${
            viewMode === 'split' ? 'flex-1 w-1/2' : 'flex-1 w-full'
          }`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
              skipHtml={false}
              components={markdownComponents as any}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <ModelUploadDialog
        open={isModelDialogOpen}
        onOpenChange={setIsModelDialogOpen}
        onModelSelect={insertModel}
      />
    </div>
  )
}
