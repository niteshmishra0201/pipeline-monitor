from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineResponse,
    PipelineRunResponse
)
from app.services.pipeline_service import PipelineService, PipelineRunService

router = APIRouter(
    prefix="/pipelines",
    tags=["Pipelines"]
)


@router.post(
    "/",
    response_model=PipelineResponse,
    status_code=status.HTTP_201_CREATED
)
def create_pipeline(
    data: PipelineCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new pipeline to monitor.
    """
    pipeline = PipelineService.create_pipeline(db, data)
    return pipeline


@router.get(
    "/",
    response_model=List[PipelineResponse]
)
def get_all_pipelines(
    db: Session = Depends(get_db)
):
    """
    Get all active monitored pipelines.
    """
    return PipelineService.get_all_pipelines(db)


@router.get(
    "/{pipeline_id}",
    response_model=PipelineResponse
)
def get_pipeline(
    pipeline_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get a single pipeline by ID.
    """
    pipeline = PipelineService.get_pipeline_by_id(db, pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline with id {pipeline_id} not found"
        )
    return pipeline


@router.delete(
    "/{pipeline_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_pipeline(
    pipeline_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Soft delete a pipeline.
    """
    deleted = PipelineService.delete_pipeline(db, pipeline_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline with id {pipeline_id} not found"
        )


@router.get(
    "/{pipeline_id}/runs",
    response_model=List[PipelineRunResponse]
)
def get_pipeline_runs(
    pipeline_id: UUID,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get all runs for a specific pipeline.
    """
    pipeline = PipelineService.get_pipeline_by_id(db, pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline with id {pipeline_id} not found"
        )
    return PipelineRunService.get_runs_for_pipeline(db, pipeline_id, limit)


@router.get(
    "/runs/failed",
    response_model=List[PipelineRunResponse]
)
def get_failed_runs(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get recent failed pipeline runs across all pipelines.
    """
    return PipelineRunService.get_recent_failed_runs(db, limit)