from app.core.config import settings
from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.pipeline import PipelineRun, PipelineStatus, AIAnalysis
from app.services.ai_analyzer import ai_analyzer
from app.services.pipeline_service import AIAnalysisService

logger = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="app.tasks.analysis_tasks.analyze_pipeline_run"
)
def analyze_pipeline_run(self, run_id: str) -> dict:
    """
    Background task that analyzes a failed pipeline run using AI.
    This runs in a Celery worker — completely separate from FastAPI.
    """
    logger.info(f"Starting AI analysis for run {run_id}")

    db: Session = SessionLocal()

    try:
        from uuid import UUID
        run_uuid = UUID(run_id)

        run = db.query(PipelineRun).filter(
            PipelineRun.id == run_uuid
        ).first()

        if not run:
            logger.error(f"Run {run_id} not found in database")
            return {"success": False, "error": "Run not found"}

        if run.status != PipelineStatus.failed:
            logger.warning(f"Run {run_id} is not failed, skipping analysis")
            return {"success": False, "error": "Run is not failed"}

        existing = db.query(AIAnalysis).filter(
            AIAnalysis.run_id == run_uuid
        ).first()

        if existing:
            logger.info(f"Analysis already exists for run {run_id}")
            return {
                "success": True,
                "analysis_id": str(existing.id),
                "cached": True
            }

        logger.info(f"Calling AI analyzer for run {run_id}")

        from app.models.pipeline import Pipeline
        pipeline = db.query(Pipeline).filter(
            Pipeline.id == run.pipeline_id
        ).first()

        result = ai_analyzer.analyze_failure(
            logs=run.logs or "No logs available",
            pipeline_name=pipeline.name if pipeline else "Unknown",
            branch=run.branch or "main",
            triggered_by=run.triggered_by or "unknown"
        )

        if not result["success"]:
            logger.error(f"AI analysis failed: {result.get('error')}")
            raise self.retry(
                exc=Exception(result.get("error", "AI failed")),
                countdown=30
            )

        analysis_data = result["analysis"]

        analysis = AIAnalysis(
            run_id=run_uuid,
            root_cause=analysis_data.get("root_cause", "Unknown"),
            fix_suggestion=analysis_data.get("fix_suggestion", "Unknown"),
            severity=analysis_data.get("severity", "medium"),
            error_category=analysis_data.get("error_category", "unknown"),
            confidence=analysis_data.get("confidence", "low"),
            summary=analysis_data.get("summary", ""),
            model_used=settings.LLM_MODEL
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        logger.info(f"Analysis saved successfully for run {run_id}")

        return {
            "success": True,
            "analysis_id": str(analysis.id),
            "cached": False
        }

    except Exception as exc:
        db.rollback()
        logger.error(f"Task failed for run {run_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)

    finally:
        db.close()