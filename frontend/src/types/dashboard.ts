export type EvolutionStage = 'hadean' | 'archean' | 'phanerozoic'

export interface EvolutionLevel {
  stage: EvolutionStage
  progress: number
  total_score: number
  ready_for_upgrade: boolean
}

export interface UserEvolutionStats {
  total_usage_hours: number
  total_files: number
  total_storage_mb: number
  recent_activity_score: number
  related_items_count: number
}

export interface DashboardData {
  user_id: string
  evolution_level: EvolutionLevel
  stats: UserEvolutionStats
  last_updated: string
}

export interface DashboardTask {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  energy: number
  created_at: string
  updated_at: string
}

export interface DashboardLog {
  id: string
  content: string
  impact: number
  created_at: string
}

export interface TaskUpdateRequest {
  completed: boolean
}

export interface LogCreateRequest {
  content: string
}
