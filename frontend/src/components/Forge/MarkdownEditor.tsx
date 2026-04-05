import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import { useState, useRef, useEffect } from 'react'
import { Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Model3DRenderer } from './Model3DRenderer'
import { ModelUploadDialog } from './ModelUploadDialog'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  viewMode: 'edit' | 'preview' | 'split'
  onModelBind?: (paragraphId: string, modelPath: string, viewParams?: any) => void
}

export function MarkdownEditor({ content, onChange, viewMode, onModelBind }: MarkdownEditorProps) {
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)

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
      const newContent = content + modelTag
      onChange(newContent)
    }
  }

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
                onChange={(e) => onChange(e.target.value)}
                placeholder={`# Start writing...

## 插入 3D 模型
使用 HTML 标签嵌入 3D 模型：

&lt;div class="model-container" data-src="/models/example.glb" data-bind="paragraph-1"&gt;
  点击查看零件结构
&lt;/div&gt;

## Features
- Bold and italic text
- 3D 模型与文本双向绑定...

快捷键: Ctrl+M 打开模型面板`}
                className="w-full h-full min-h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none overflow-y-auto"
                spellCheck={false}
              />
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
          <div className={`overflow-y-auto p-6 prose prose-invert max-w-none ${
            viewMode === 'split' ? 'flex-1 w-1/2' : 'flex-1 w-full'
          }`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
              skipHtml={false}
              components={{
                model: ({ src, 'bind-to': bindTo, children }: any) => {
                  if (!src) return null
                  return (
                    <div className="my-6 not-prose" data-paragraph-id={bindTo || `model-${Math.random().toString(36).substr(2, 9)}`}>
                      <div className="border rounded-lg overflow-hidden bg-slate-800/50">
                        <Model3DRenderer 
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
                div: ({ node, className, children, ...props }: any) => {
                  if (props['data-src'] && className?.includes('model-container')) {
                    const modelPath = props['data-src']
                    const bindTo = props['data-bind'] || `model-${Math.random().toString(36).substr(2, 9)}`
                    return (
                      <div className="my-6 not-prose" data-paragraph-id={bindTo}>
                        <div className="border rounded-lg overflow-hidden bg-slate-800/50">
                          <Model3DRenderer 
                            modelPath={modelPath}
                            onModelClick={(partName) => {
                              console.log(`Model clicked: ${partName} for paragraph ${bindTo}`)
                              onModelBind?.(bindTo, modelPath)
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
              } as any}
            >
              {content}
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
