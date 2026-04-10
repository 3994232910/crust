/**
 * 仪表盘状态管理 Store (Zustand)
 */
import { create } from 'zustand'

export interface DashboardState {
  // 演化数据
  evolutionStage: 'hadean' | 'archean' | 'phanerozoic'
  stageProgress: number // 0-100
  totalScore: number

  // 用户统计
  totalFiles: number
  totalStorageMB: number
  totalUsageHours: number
  recentActivityScore: number // 0-100
  relatedItemsCount: number

  // UI状态
  isLoading: boolean
  error: string | null
  selectedDataPoint: 'time' | 'space' | 'activity' | 'links' | null

  // 获取演化数据
  fetchEvolutionData: () => Promise<void>
  setSelectedDataPoint: (point: 'time' | 'space' | 'activity' | 'links' | null) => void
  reset: () => void
}

const initialState = {
  evolutionStage: 'hadean' as const,
  stageProgress: 0,
  totalScore: 0,
  totalFiles: 0,
  totalStorageMB: 0,
  totalUsageHours: 0,
  recentActivityScore: 0,
  relatedItemsCount: 0,
  isLoading: false,
  error: null,
  selectedDataPoint: null as 'time' | 'space' | 'activity' | 'links' | null,
}

export const useDashboardStore = create<DashboardState>((set) => ({
  ...initialState,

  fetchEvolutionData: async () => {
    set({ isLoading: true, error: null })
    try {
      // 调用后端API获取演化数据
      const response = await fetch('/api/dashboard/evolution')
      if (!response.ok) {
        throw new Error(`Failed to fetch evolution data: ${response.statusText}`)
      }
      const data = await response.json() as any

      set({
        evolutionStage: data.evolution_level.stage as any,
        stageProgress: data.evolution_level.progress,
        totalScore: data.evolution_level.total_score,
        totalFiles: data.stats.total_files,
        totalStorageMB: data.stats.total_storage_mb,
        totalUsageHours: data.stats.total_usage_hours,
        recentActivityScore: data.stats.recent_activity_score,
        relatedItemsCount: data.stats.related_items_count,
        isLoading: false,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      set({ error: errorMessage, isLoading: false })
    }
  },

  setSelectedDataPoint: (point) => set({ selectedDataPoint: point }),

  reset: () => set(initialState),
}))

/**
 * 获取演化阶段的人类可读描述
 */
export function getStageDescription(stage: string): string {
  const descriptions = {
    hadean: '冥古宙 - 熔岩地球',
    archean: '太古宙 - 原始地球',
    phanerozoic: '显生宙 - 生命地球',
  }
  return descriptions[stage as keyof typeof descriptions] || '未知'
}

/**
 * 获取演化阶段的详细描述
 */
export function getStageDetailedDescription(stage: string): string {
  const descriptions = {
    hadean:
      '初始化阶段。你的账户刚刚创建，就像原始地球的熔岩阶段。开始创建和组织你的内容，地球才能逐步演化。',
    archean:
      '发展阶段。流动的岩浆逐渐冷却，原始的海洋开始形成。你的内容在不断积累，活动日益频繁。',
    phanerozoic:
      '繁荣阶段。生命已经在地球上蓬勃发展，我们看到了文明的繁荣。你的数据生态已经非常丰富和活跃。',
  }
  return descriptions[stage as keyof typeof descriptions] || '未知阶段'
}
