import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useRouterState } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { Box } from 'lucide-react'
import { getModelThumbnailKey, resolveModelPath } from '../Forge/Model3DRenderer'
import { Model3DViewerFrame } from '../Forge/Model3DViewerFrame'
import 'highlight.js/styles/github-dark.css'
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
import {
  fetchStargazingGroups,
  createStargazingGroup,
  setStargazingAssignment as setAssignment,
} from '@/lib/stargazingApi'

// Rehype plugin: convert ==text== to <mark> elements in HAST
function rehypeMark() {
  return (tree: any) => {
    function walk(node: any, parent: any, index: number) {
      if (node.type === 'text' && typeof node.value === 'string' && node.value.includes('==')) {
        const parts = node.value.split(/(==(?:[^=\n])+==)/)
        if (parts.length > 1) {
          const newNodes = parts
            .filter((p: string) => p !== '')
            .map((p: string) =>
              p.startsWith('==') && p.endsWith('==')
                ? { type: 'element', tagName: 'mark', properties: {}, children: [{ type: 'text', value: p.slice(2, -2) }] }
                : { type: 'text', value: p }
            )
          parent.children.splice(index, 1, ...newNodes)
          return newNodes.length
        }
      }
      if (node.children) {
        let i = 0
        while (i < node.children.length) {
          const prev = node.children.length
          walk(node.children[i], node, i)
          i += 1 + (node.children.length - prev)
        }
      }
      return 1
    }
    walk(tree, null, 0)
  }
}

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
  is_following?: boolean
}

interface CommunityPostsResponse {
  data: CommunityPost[]
  count: number
}

interface FollowingUser {
  user_id: string
  full_name: string | null
  email: string
  post_count: number
  followed_at: string
}

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

function contentSnippet(content: string | null, len = 200): string {
  if (!content) return ''
  const stripped = content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/<model[^>]*>.*?<\/model>/gs, '')
    .replace(/```.*?```/gs, '')
    .replace(/`[^`]+`/g, '')
    .replace(/[#*_~>|`\[\]!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped.length > len ? `${stripped.slice(0, len)}…` : stripped
}

function extractFirstImage(content: string | null): string | null {
  if (!content) return null
  const mdImg = content.match(/!\[.*?\]\(([^)]+)\)/)
  if (mdImg) return mdImg[1]
  const htmlImg = content.match(/<img[^>]+src="([^"]+)"/)
  return htmlImg ? htmlImg[1] : null
}

function extractFirstModelSrc(content: string | null): string | null {
  if (!content) return null
  const m =
    content.match(/<model\s+src="([^"]+)"/) ??
    content.match(/data-src="([^"]+)"/)
  return m ? m[1] : null
}

function resolveImageUrl(src: string): string {
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')) return src
  return src
}

const LIMIT = 20

function MasonryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
      {children}
    </div>
  )
}

interface PostCardProps {
  post: CommunityPost
  onClick: () => void
}

function PostCard({ post, onClick }: PostCardProps) {
  const imageUrl = post.thumbnail
    ? resolveImageUrl(post.thumbnail)
    : extractFirstImage(post.content)
  const modelSrc = !imageUrl ? extractFirstModelSrc(post.content) : null
  const localThumb = useMemo(() => modelSrc
    ? (localStorage.getItem(getModelThumbnailKey(resolveModelPath(modelSrc)))
        ?? localStorage.getItem(getModelThumbnailKey(modelSrc)))
    : null
  , [modelSrc])
  const displayImage = imageUrl ?? localThumb
  const snippet = contentSnippet(post.content)

  return (
    <div
      className="break-inside-avoid mb-4 cursor-pointer group"
      onClick={onClick}
    >
      <div className="rounded-lg border bg-card text-card-foreground overflow-hidden transition-colors hover:border-border/80 hover:bg-accent/40">
        {displayImage && (
          <div className="w-full overflow-hidden bg-muted">
            <img
              src={displayImage}
              alt=""
              className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              style={{ display: 'block' }}
              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
            />
          </div>
        )}
        {!displayImage && modelSrc && (
          <div className="w-full h-32 bg-slate-800/60 flex flex-col items-center justify-center gap-2 border-b border-border/40">
            <Box className="h-8 w-8 text-primary/60" />
            <span className="text-xs text-muted-foreground">3D 模型</span>
          </div>
        )}

        <div className="p-4 space-y-2">
          <h3 className="font-medium text-sm leading-snug text-foreground">
            {post.title ?? 'Untitled'}
          </h3>

          {snippet && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {snippet}
            </p>
          )}

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

function SkeletonCards() {
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

function UserCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

interface DetailDialogProps {
  post: CommunityPost | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
  onFollowToggle: (post: CommunityPost) => Promise<void>
  canDelete: (post: CommunityPost) => boolean
  deleting: boolean
  following: boolean
}

function DetailDialog({ post, onClose, onDelete, onFollowToggle, canDelete, deleting, following }: DetailDialogProps) {
  const { user: currentUser } = useAuth()
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [pickerGroups, setPickerGroups] = useState<{ id: string; name: string; color: string }[]>([])
  const [newGroupInput, setNewGroupInput] = useState('')

  const openPicker = async () => {
    const gs = await fetchStargazingGroups()
    setPickerGroups(gs)
    setNewGroupInput('')
    setShowGroupPicker(true)
  }

  const createAndPick = async () => {
    const name = newGroupInput.trim()
    if (!name) return
    const GROUP_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#facc15']
    const color = GROUP_COLORS[pickerGroups.length % GROUP_COLORS.length]
    const newGroup = await createStargazingGroup(name, color)
    await handlePickGroup(newGroup.id)
  }

  const handleFollowClick = () => {
    if (!post) return
    if (post.is_following) {
      onFollowToggle(post)
    } else {
      openPicker()
    }
  }

  const handlePickGroup = async (groupId: string | null) => {
    if (!post) return
    setShowGroupPicker(false)
    await onFollowToggle(post)
    await setAssignment(post.owner_id, groupId)
  }

  // Only show a header image if it's a real image from content (not a model screenshot thumbnail)
  const hasModel = !!extractFirstModelSrc(post?.content ?? null)
  const imageUrl = hasModel
    ? extractFirstImage(post?.content ?? null)
    : (post?.thumbnail ? resolveImageUrl(post.thumbnail) : extractFirstImage(post?.content ?? null))

  return (
    <Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
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

        <div className="flex flex-col flex-1 overflow-hidden min-h-0 p-6 pt-5 gap-4">
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
              {post && currentUser?.id !== post.owner_id && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 gap-1 ${
                      post.is_following
                        ? 'text-primary hover:text-destructive hover:bg-destructive/10'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                    disabled={following}
                    onClick={handleFollowClick}
                  >
                    {following ? '…' : post.is_following ? 'Following' : 'Follow'}
                  </Button>

                  {showGroupPicker && (
                    <div
                      className="absolute top-full left-0 mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-[160px]"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                    >
                      <button
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent/30"
                        onClick={() => handlePickGroup(null)}
                      >
                        不分组
                      </button>
                      {pickerGroups.map((g) => (
                        <button
                          key={g.id}
                          className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-accent/30"
                          onClick={() => handlePickGroup(g.id)}
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
                          {g.name}
                        </button>
                      ))}
                      <div
                        className="flex items-center border-t px-2 pt-1 pb-1 gap-1"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <input
                          autoFocus
                          value={newGroupInput}
                          onChange={(e) => setNewGroupInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') createAndPick() }}
                          placeholder="新建分组…"
                          className="min-w-0 flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                        />
                        <button
                          className="text-xs text-primary hover:opacity-80 shrink-0"
                          onClick={createAndPick}
                        >
                          确定
                        </button>
                      </div>
                      <button
                        className="w-full text-left px-3 py-1 text-xs text-muted-foreground hover:bg-accent/30"
                        onClick={() => setShowGroupPicker(false)}
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              )}
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeMark, rehypeHighlight]}
                skipHtml={false}
                components={{
                  mark: ({ children }) => (
                    <mark className="bg-yellow-200 dark:bg-yellow-600/50 text-current rounded-sm px-0.5">
                      {children}
                    </mark>
                  ),
                  // @ts-expect-error custom HTML element not in react-markdown's type
                  model: ({ src }: any) => {
                    if (!src) return null
                    return (
                      <div className="my-4 not-prose">
                        <div className="border rounded-lg overflow-hidden bg-slate-800/50">
                          <Model3DViewerFrame modelPath={src} />
                        </div>
                      </div>
                    )
                  },
                  div: ({ node: _n, className, children, ...props }: any) => {
                    if (props['data-src'] && className?.includes('model-container')) {
                      return (
                        <div className="my-4 not-prose">
                          <div className="border rounded-lg overflow-hidden bg-slate-800/50">
                            <Model3DViewerFrame modelPath={props['data-src']} />
                          </div>
                          {children && (
                            <div className="px-4 py-2 bg-muted/30 border-t text-sm text-muted-foreground">
                              {children}
                            </div>
                          )}
                        </div>
                      )
                    }
                    return <div className={className} {...props}>{children}</div>
                  },
                }}
              >
                {post?.content ?? ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CommunityFeed() {
  const { user: currentUser } = useAuth()
  const location = useRouterState({ select: (s) => s.location })
  const activeTab = (new URLSearchParams(location.search).get('tab')) ?? 'feed'

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([])
  const [count, setCount] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CommunityPost | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [following, setFollowing] = useState(false)
  const skipRef = useRef(skip)
  skipRef.current = skip

  const fetchData = useCallback(async (skipVal: number, tab: string) => {
    setLoading(true)
    setError(null)
    try {
      let url: string
      if (tab === 'my-posts') {
        url = `/api/v1/community/my-posts?skip=${skipVal}&limit=${LIMIT}`
      } else if (tab === 'my-favorites') {
        url = `/api/v1/community/my-favorites`
      } else if (tab === 'following') {
        url = `/api/v1/community/following`
      } else {
        url = `/api/v1/community/?skip=${skipVal}&limit=${LIMIT}`
      }

      const res = await fetch(url, { headers: authHeaders() })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

      if (tab === 'following') {
        const data = (await res.json()) as FollowingUser[]
        setFollowingUsers(data)
        setCount(data.length)
        setPosts([])
      } else {
        const data = (await res.json()) as CommunityPostsResponse
        setPosts(data.data)
        setCount(data.count)
        setFollowingUsers([])
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setSkip(0)
    fetchData(0, activeTab)
  }, [fetchData, activeTab])

  useEffect(() => {
    if (activeTab !== 'following') {
      fetchData(skip, activeTab)
    }
  }, [fetchData, skip, activeTab])

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    const sourceForgeId = selected?.source_forge_id
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/community/${postId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      setSelected(null)
      fetchData(skipRef.current, activeTab)
      if (sourceForgeId) {
        window.dispatchEvent(new CustomEvent('community-post-deleted', { detail: { forgeId: sourceForgeId } }))
      }
    } catch (e) {
      alert(String(e))
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = (post: CommunityPost) =>
    !!(currentUser?.is_superuser || currentUser?.id === post.owner_id)

  const handleFollowToggle = async (post: CommunityPost) => {
    if (!currentUser) return
    setFollowing(true)
    try {
      const url = `/api/v1/community/follow/${post.owner_id}`
      const res = await fetch(url, {
        method: post.is_following ? 'DELETE' : 'POST',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

      const nextFollowing = !post.is_following
      setPosts((prev) =>
        prev.map((p) =>
          p.owner_id === post.owner_id ? { ...p, is_following: nextFollowing } : p
        )
      )
      setSelected((prev) =>
        prev && prev.owner_id === post.owner_id
          ? { ...prev, is_following: nextFollowing }
          : prev
      )
    } catch (e) {
      alert(String(e))
    } finally {
      setFollowing(false)
    }
  }

  const handleUnfollowUser = async (userId: string) => {
    if (!currentUser) return
    if (!confirm('取消关注该用户？')) return
    try {
      const res = await fetch(`/api/v1/community/follow/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      setFollowingUsers((prev) => prev.filter((u) => u.user_id !== userId))
    } catch (e) {
      alert(String(e))
    }
  }

  const totalPages = Math.ceil(count / LIMIT)
  const currentPage = Math.floor(skip / LIMIT)

  const tabTitle: Record<string, string> = {
    feed: 'Community',
    'my-posts': 'My Posts',
    'my-favorites': 'My Favorites',
    following: 'Following',
  }

  const tabDesc: Record<string, string> = {
    feed: 'Notes shared by the community',
    'my-posts': 'Posts you have published',
    'my-favorites': 'Posts you have favorited',
    following: 'People you are following',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GalaxyIcon size={26} className="text-primary shrink-0" strokeWidth={1.4} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tabTitle[activeTab] ?? 'Community'}</h1>
          <p className="text-sm text-muted-foreground">{tabDesc[activeTab] ?? 'Notes shared by the community'}</p>
        </div>
        {count > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {count}
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && activeTab !== 'following' && <SkeletonCards />}
      {loading && activeTab === 'following' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <UserCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && !error && activeTab !== 'following' && posts.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <GalaxyIcon size={52} className="text-muted-foreground/30" strokeWidth={1} />
          <p className="text-muted-foreground">No posts yet.</p>
          <p className="text-sm text-muted-foreground/50">
            {activeTab === 'feed' && 'Publish a note from Forge to get started.'}
            {activeTab === 'my-posts' && 'You have not published any posts yet.'}
            {activeTab === 'my-favorites' && 'You have not favorited any posts yet.'}
          </p>
        </div>
      )}
      {!loading && !error && activeTab === 'following' && followingUsers.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <GalaxyIcon size={52} className="text-muted-foreground/30" strokeWidth={1} />
          <p className="text-muted-foreground">Not following anyone yet.</p>
          <p className="text-sm text-muted-foreground/50">
            Follow users from their posts to see them here.
          </p>
        </div>
      )}

      {!loading && !error && activeTab !== 'following' && posts.length > 0 && (
        <MasonryGrid>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => setSelected(post)} />
          ))}
        </MasonryGrid>
      )}

      {!loading && !error && activeTab === 'following' && followingUsers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {followingUsers.map((user) => (
            <div
              key={user.user_id}
              className="rounded-lg border bg-card text-card-foreground p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm bg-primary/10 text-primary">
                    {authorInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.full_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {user.post_count} 帖子 · 关注于 {formatRelativeTime(user.followed_at)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleUnfollowUser(user.user_id)}
                >
                  取消关注
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && activeTab !== 'following' && totalPages > 1 && (
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

      <DetailDialog
        post={selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        onFollowToggle={handleFollowToggle}
        canDelete={canDelete}
        deleting={deleting}
        following={following}
      />
    </div>
  )
}
