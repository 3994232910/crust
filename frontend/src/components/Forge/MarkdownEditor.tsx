import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { Pen, Eye, Split } from 'lucide-react'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
}

export function MarkdownEditor({ content, onChange }: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')

  return (
    <div className="flex flex-col h-full">
      {/* 视图切换工具栏 */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <button
          onClick={() => setViewMode('edit')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'edit'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground'
          }`}
          title="Edit Mode"
        >
          <Pen className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode('preview')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'preview'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground'
          }`}
          title="Preview Mode"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode('split')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'split'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground'
          }`}
          title="Split View"
        >
          <Split className="h-4 w-4" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑区 */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`overflow-hidden ${
            viewMode === 'split' ? 'flex-1 w-1/2 border-r' : 'flex-1 w-full'
          }`}>
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder="# Start writing...

## Features
- **Bold** and *italic* text
- Code blocks with syntax highlighting
- Math formulas: $E = mc^2$
- Tables, task lists, and more..."
              className="w-full h-full min-h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none overflow-y-auto"
              spellCheck={false}
            />
          </div>
        )}

        {/* 预览区 */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`overflow-y-auto p-6 prose prose-invert max-w-none dark:prose-invert prose-headings:mt-6 prose-headings:mb-4 prose-p:my-3 prose-code:text-sm prose-pre:bg-muted/50 ${
            viewMode === 'split' ? 'flex-1 w-1/2' : 'flex-1 w-full'
          }`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-semibold mt-5 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-medium mt-4 mb-2">{children}</h3>
                ),
                code: ({ inline, className, children, ...props }: any) => {
                  if (inline) {
                    return (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                        {children}
                      </code>
                    )
                  }
                  return (
                    <pre className="p-4 rounded-lg overflow-x-auto my-4">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  )
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-border">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-4 py-2 bg-muted font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-4 py-2">
                    {children}
                  </td>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside my-3 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside my-3 space-y-1">{children}</ol>
                ),
                a: ({ children, href }) => (
                  <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
