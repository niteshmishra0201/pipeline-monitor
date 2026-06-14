export type PipelineStatus = 'success' | 'failed' | 'running' | 'cancelled'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface Pipeline {
  id: string
  name: string
  repo_url: string
  branch: string
  is_active: boolean
  created_at: string
}

export interface AIAnalysis {
  id: string
  run_id: string
  root_cause: string
  fix_suggestion: string
  severity: Severity
  error_category: string
  confidence: string
  summary: string
  model_used: string
  created_at: string
}

export interface PipelineRun {
  id: string
  pipeline_id: string
  run_number: number
  status: PipelineStatus
  branch: string | null
  commit_sha: string | null
  commit_message: string | null
  triggered_by: string | null
  duration_seconds: number | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  logs: string | null
  ai_analysis: AIAnalysis | null
}

export interface AnalysisTask {
  task_id: string
  run_id: string
  status: string
  message: string
}

export interface TaskStatus {
  task_id: string
  status: string
  result: Record<string, unknown> | null
  error: string | null
}