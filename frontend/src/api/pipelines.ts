import client from './client'
import type {
  Pipeline,
  PipelineRun,
  AIAnalysis,
  AnalysisTask,
  TaskStatus,
} from '../types'

export const getPipelines = async (): Promise<Pipeline[]> => {
  const res = await client.get('/pipelines/')
  return res.data
}

export const getPipeline = async (id: string): Promise<Pipeline> => {
  const res = await client.get(`/pipelines/${id}`)
  return res.data
}

export const createPipeline = async (data: {
  name: string
  repo_url: string
  branch: string
}): Promise<Pipeline> => {
  const res = await client.post('/pipelines/', data)
  return res.data
}

export const getFailedRuns = async (limit = 20): Promise<PipelineRun[]> => {
  const res = await client.get(`/pipelines/runs/failed?limit=${limit}`)
  return res.data
}

export const getRunWithAnalysis = async (
  runId: string
): Promise<PipelineRun> => {
  const res = await client.get(`/pipelines/runs/${runId}`)
  return res.data
}

export const getPipelineRuns = async (
  pipelineId: string
): Promise<PipelineRun[]> => {
  const res = await client.get(`/pipelines/${pipelineId}/runs`)
  return res.data
}

export const triggerAnalysis = async (
  runId: string
): Promise<AnalysisTask> => {
  const res = await client.post(`/pipelines/runs/${runId}/analyze`)
  return res.data
}

export const getTaskStatus = async (taskId: string): Promise<TaskStatus> => {
  const res = await client.get(`/pipelines/tasks/${taskId}`)
  return res.data
}

export const getAnalysis = async (runId: string): Promise<AIAnalysis> => {
  const res = await client.get(`/pipelines/runs/${runId}/analysis`)
  return res.data
}