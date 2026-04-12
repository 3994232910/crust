import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/components/Dashboard/index'

export const Route = createFileRoute('/_layout/')({
  component: DashboardPage,
})