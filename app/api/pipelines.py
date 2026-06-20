from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.database import get_db
from app.models.pipeline import PipelineStatus
from app.schemas.pipeline import (
    AIAnalysisResponse,
    AnalysisTaskResponse,
    PipelineCreate,
    PipelineResponse,
    PipelineRunResponse,
    PipelineRunWithAnalysis,
    TaskStatusResponse,
)
from app.services.pipeline_service import (
    AIAnalysisService,
    PipelineRunService,
    PipelineService,
)
from app.tasks.analysis_tasks import analyze_pipeline_run

router = APIRouter(prefix="/pipelines", tags=["Pipelines"])


@router.post("/", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
def create_pipeline(data: PipelineCreate, db: Session = Depends(get_db)):
    """Register a new pipeline to monitor."""
    return PipelineService.create_pipeline(db, data)


@router.get("/", response_model=List[PipelineResponse])
def get_all_pipelines(db: Session = Depends(get_db)):
    """Get all active monitored pipelines."""
    return PipelineService.get_all_pipelines(db)


@router.get("/runs/failed", response_model=List[PipelineRunResponse])
def get_failed_runs(limit: int = 10, db: Session = Depends(get_db)):
    """Get recent failed pipeline runs across all pipelines."""
    return PipelineRunService.get_recent_failed_runs(db, limit)


@router.get("/runs/{run_id}", response_model=PipelineRunWithAnalysis)
def get_run_with_analysis(run_id: UUID, db: Session = Depends(get_db)):
    """Get a single run with its AI analysis if available."""
    run = PipelineRunService.get_run_by_id(db, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Run {run_id} not found")
    return run


@router.post(
    "/runs/{run_id}/analyze",
    response_model=AnalysisTaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def analyze_run(run_id: UUID, db: Session = Depends(get_db)):
    """
    Queue AI analysis for a failed pipeline run.
    Returns immediately with a task_id.
    Client should poll GET /tasks/{task_id} for result.
    """
    run = PipelineRunService.get_run_by_id(db, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Run {run_id} not found")

    if run.status != PipelineStatus.failed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only analyze failed runs",
        )

    existing = AIAnalysisService.get_analysis_for_run(db, run_id)
    if existing:
        return AnalysisTaskResponse(
            task_id="already-analyzed",
            run_id=str(run_id),
            status="completed",
            message="Analysis already exists. Call GET /analysis to fetch it.",
        )

    task = analyze_pipeline_run.delay(str(run_id))

    return AnalysisTaskResponse(
        task_id=task.id,
        run_id=str(run_id),
        status="queued",
        message="Analysis queued. Poll GET /tasks/{task_id} for status.",
    )


@router.get("/tasks/{task_id}", response_model=TaskStatusResponse)
def get_task_status(task_id: str):
    """
    Check the status of a background analysis task.
    States: PENDING → STARTED → SUCCESS / FAILURE
    """
    task_result = celery_app.AsyncResult(task_id)

    if task_result.state == "PENDING":
        return TaskStatusResponse(
            task_id=task_id,
            status="pending",
        )

    if task_result.state == "STARTED":
        return TaskStatusResponse(
            task_id=task_id,
            status="running",
        )

    if task_result.state == "SUCCESS":
        return TaskStatusResponse(task_id=task_id, status="completed", result=task_result.result)

    if task_result.state == "FAILURE":
        return TaskStatusResponse(task_id=task_id, status="failed", error=str(task_result.result))

    return TaskStatusResponse(task_id=task_id, status=task_result.state.lower())


@router.get("/runs/{run_id}/analysis", response_model=AIAnalysisResponse)
def get_analysis(run_id: UUID, db: Session = Depends(get_db)):
    """Fetch existing AI analysis for a run without triggering a new one."""
    analysis = AIAnalysisService.get_analysis_for_run(db, run_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found for this run. Call POST /analyze first.",
        )
    return analysis


@router.get("/{pipeline_id}", response_model=PipelineResponse)
def get_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    """Get a single pipeline by ID."""
    pipeline = PipelineService.get_pipeline_by_id(db, pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline {pipeline_id} not found",
        )
    return pipeline


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    """Soft delete a pipeline."""
    deleted = PipelineService.delete_pipeline(db, pipeline_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline {pipeline_id} not found",
        )


@router.get("/{pipeline_id}/runs", response_model=List[PipelineRunResponse])
def get_pipeline_runs(pipeline_id: UUID, limit: int = 20, db: Session = Depends(get_db)):
    """Get all runs for a specific pipeline."""
    pipeline = PipelineService.get_pipeline_by_id(db, pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline {pipeline_id} not found",
        )
    return PipelineRunService.get_runs_for_pipeline(db, pipeline_id, limit)
