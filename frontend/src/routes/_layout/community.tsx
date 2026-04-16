import { createFileRoute } from '@tanstack/react-router'
import { CommunityFeed } from '@/components/Community/CommunityFeed'

export const Route = createFileRoute('/_layout/community')({
  component: CommunityFeed,
})

export default CommunityFeed
