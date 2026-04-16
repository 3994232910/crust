import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import useAuth from '@/hooks/useAuth'
import { GalaxyIcon } from './GalaxyIcon'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CommunityPost {
  id: string
  title: string | null
  content: string | null
  source_forge_id: string | null
  thumbnail: string | null
  owner_id: string
  owner_full_name: string | null
  created_at: string
  updated_at: string
}

interface CommunityPostsResponse {
  data: CommunityPost[]
  count: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function authorInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Strip markdown syntax for preview text. */
function contentSnippet(content: string | null, len = 200): string {
  if (!content) return ''
  const stripped = content
    .replace(/!\[.*?\]\(.*?\)/g, '')      // images
    .replace(/<model[^>]*>.*?<\/model>/gs, '') // model tags
    .replace(/```[\s\S]*?```/g, '')        // code blocks
    .replace(/`[^`]+`/g, '')
    .replace(/[#*_~>|`\[\]!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped.length > len ? `${stripped.slice(0, len)}…` : stripped
}

/** Extract first markdown image URL from content. */
function extractFirstImage(content: string | null): string | null {
  if (!content) return null
  const m = content.match(/!\[.*?\]\(([^)]+)\)/)
  return m ? m[1] : null
}

/** Resolve relative image URLs to include backend origin if needed. */
function resolveImageUrl(src: string): string {
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')) return src
  return src
}

const LIMIT = 20

// ─── Masonry grid (CSS columns) ────────────────────────────────────────────────

function MasonryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
      {children}
    </div>
  )
}

// ─── Post card ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: CommunityPost
  onClick: () => void
}

function PostCard({ post, onClick }: PostCardProps) {
  const imageUrl = post.thumbnail
    ? resolveImageUrl(post.thumbnail)
    : extractFirstImage(post.content)
  const snippet = contentSnippet(post.content)

  return (
    // break-inside-avoid keeps the card from splitting across columns
    <div
      className="break-inside-avoid mb-4 cursor-pointer group"
      onClick={onClick}
    >
      <div className="rounded-lg border bg-card text-card-foreground overflow-hidden transition-colors hover:border-border/80 hover:bg-accent/40">
        {/* Thumbnail */}
        {imageUrl && (
          <div className="w-full overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt=""
              className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              style={{ display: 'block' }}
              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
            />
          </div>
        )}

        <div className="p-4 space-y-2">
          {/* Title */}
          <h3 className="font-medium text-sm leading-snug text-foreground">
            {post.title ?? 'Untitled'}
          </h3>

          {/* Snippet — only if there's text beyond a title */}
          {snippet && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {snippet}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 pt-1">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                {authorInitials(post.owner_full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
              {post.owner_full_name ?? 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground/60 shrink-0">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Loading skeletons (masonry-aware) ─────────────────────────────────────────

function SkeletonCards() {
  // Vary heights to approximate masonry feel
  const heights = [120, 200, 160, 180, 140, 220, 150, 170, 130, 190, 160, 140]
  return (
    <MasonryGrid>
      {heights.map((h, i) => (
        <div key={i} className="break-inside-avoid mb-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton style={{ height: h - 80 }} className="w-full rounded" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </MasonryGrid>
  )
}

// ─── Detail dialog ─────────────────────────────────────────────────────────────

interface DetailDialogProps {
  post: CommunityPost | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
  canDelete: (post: CommunityPost) => boolean
  deleting: boolean
}

function DetailDialog({ post, onClose, onDelete, canDelete, deleting }: DetailDialogProps) {
  const imageUrl = post?.thumbnail
    ? resolveImageUrl(post.thumbnail)
    : extractFirstImage(post?.content ?? null)

  return (
    <Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Thumbnail banner */}
        {imageUrl && (
          <div className="w-full max-h-56 overflow-hidden bg-muted shrink-0">
            <img
              src={imageUrl}
              alt=""
              className="w-full object-cover"
              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
            />
          </div>
        )}

        <div className="flex flex-col flex-1 overflow-hidden p-6 pt-5 gap-4">
          <DialogHeader className="shrink-0 gap-1">
            <DialogTitle className="text-xl leading-tight pr-8">
              {post?.title ?? 'Untitled'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {authorInitials(post?.owner_full_name ?? null)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {post?.owner_full_name ?? 'Unknown'}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">
                {post ? formatRelativeTime(post.created_at) : ''}
              </span>
              {post && canDelete(post) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={deleting}
                  onClick={() => onDelete(post.id)}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post?.content ?? ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main feed ─────────────────────────────────────────────────────────────────

export function CommunityFeed() {
  const { user: currentUser } = useAuth()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [count, setCount] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CommunityPost | null>(null)
  const [deleting, setDeleting] = useState(false)
  const skipRef = useRef(skip)
  skipRef.current = skip

  const fetchPosts = useCallback(async (skipVal: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/v1/community/?skip=${skipVal}&limit=${LIMIT}`,
        { headers: authHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = (await res.json()) as CommunityPostsResponse
      setPosts(data.data)
      setCount(data.count)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts(skip)
  }, [fetchPosts, skip])

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/community/${postId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      setSelected(null)
      fetchPosts(skipRef.current)
    } catch (e) {
      alert(String(e))
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = (post: CommunityPost) =>
    !!(currentUser?.is_superuser || currentUser?.id === post.owner_id)

  const totalPages = Math.ceil(count / LIMIT)
  const currentPage = Math.floor(skip / LIMIT)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GalaxyIcon size={26} className="text-primary shrink-0" strokeWidth={1.4} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
          <p className="text-sm text-muted-foreground">Notes shared by the community</p>
        </div>
        {count > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {count}
          </Badge>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <SkeletonCards />}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <GalaxyIcon size={52} className="text-muted-foreground/30" strokeWidth={1} />
          <p className="text-muted-foreground">No posts yet.</p>
          <p className="text-sm text-muted-foreground/50">
            Publish a note from Forge to get started.
          </p>
        </div>
      )}

      {/* Masonry waterfall */}
      {!loading && posts.length > 0 && (
        <MasonryGrid>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => setSelected(post)} />
          ))}
        </MasonryGrid>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setSkip(Math.max(0, skip - LIMIT))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setSkip(skip + LIMIT)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail dialog */}
      <DetailDialog
        post={selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        canDelete={canDelete}
        deleting={deleting}
      />
    </div>
  )
}
