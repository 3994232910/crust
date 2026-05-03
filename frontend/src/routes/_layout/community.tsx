import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CommunityFeed } from '@/components/Community/CommunityFeed'

const communitySearchSchema = z.object({
  tab: z.enum(['feed', 'my-posts', 'my-favorites', 'following']).optional(),
})

export const Route = createFileRoute('/_layout/community')({
  validateSearch: communitySearchSchema,
  component: CommunityFeed,
})

export default CommunityFeed
