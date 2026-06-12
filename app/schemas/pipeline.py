from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.pipeline import PipelineStatus


class PipelineBase(BaseModel):
    name: str
    repo_url: str
    branch: str = "main"


class PipelineCreate(PipelineBase):
    pass


class PipelineResponse(PipelineBase):
    id: UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PipelineRunBase(BaseModel):
    run_number: int
    status: PipelineStatus
    branch: Optional[str] = None
    commit_sha: Optional[str] = None
    commit_message: Optional[str] = None
    triggered_by: Optional[str] = None
    duration_seconds: Optional[int] = None
    logs: Optional[str] = None


class PipelineRunCreate(PipelineRunBase):
    pipeline_id: UUID
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class PipelineRunResponse(PipelineRunBase):
    id: UUID
    pipeline_id: UUID
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AIAnalysisResponse(BaseModel):
    id: UUID
    run_id: UUID
    root_cause: str
    fix_suggestion: str
    severity: Optional[str] = None
    error_category: Optional[str] = None
    confidence: Optional[str] = None
    summary: Optional[str] = None
    model_used: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PipelineRunWithAnalysis(PipelineRunResponse):
    """
    Extended run response that includes AI analysis if available.
    Used when frontend needs the full picture of a failed run.
    """
    ai_analysis: Optional[AIAnalysisResponse] = None

    model_config = {"from_attributes": True}