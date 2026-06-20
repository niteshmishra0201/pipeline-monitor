from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.pipeline import AIAnalysis, Pipeline, PipelineRun, PipelineStatus
from app.services.ai_analyzer import ai_analyzer
from app.services.slack_service import slack_service

logger = get_task_logger(__name__)


async def broadcast_event(event_type: str, data: dict):
    try:
        from app.core.websocket_manager import manager

        await manager.broadcast(event_type, data)
    except Exception as e:
        logger.error(f"Failed to broadcast: {e}")


async def send_slack_if_needed(
    db: Session, pipeline: Pipeline, run: PipelineRun, analysis_data: dict
):
    """
    Checks failure threshold and sends Slack alert if crossed.
    Runs after AI analysis completes.
    """
    try:
        failure_count = slack_service.check_failure_threshold(db=db, pipeline_id=str(pipeline.id))

        logger.info(
            f"Pipeline {pipeline.name} has failed "
            f"{failure_count} times in the last hour "
            f"(threshold: {settings.FAILURE_ALERT_THRESHOLD})"
        )

        if failure_count >= settings.FAILURE_ALERT_THRESHOLD:
            await slack_service.send_alert(
                pipeline_name=pipeline.name,
                run_number=run.run_number,
                branch=run.branch or "unknown",
                triggered_by=run.triggered_by or "unknown",
                failure_count=failure_count,
                root_cause=analysis_data.get("root_cause"),
                severity=analysis_data.get("severity"),
                run_id=str(run.id),
            )
    except Exception as e:
        logger.error(f"Slack alert failed: {e}")


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="app.tasks.analysis_tasks.analyze_pipeline_run",
)
def analyze_pipeline_run(self, run_id: str) -> dict:
    """
    Background task — analyzes failed run, broadcasts WebSocket
    event, and sends Slack alert if failure threshold crossed.
    """
    logger.info(f"Starting AI analysis for run {run_id}")

    db: Session = SessionLocal()

    try:
        from uuid import UUID

        run_uuid = UUID(run_id)

        run = db.query(PipelineRun).filter(PipelineRun.id == run_uuid).first()

        if not run:
            logger.error(f"Run {run_id} not found")
            return {"success": False, "error": "Run not found"}

        if run.status != PipelineStatus.failed:
            logger.warning(f"Run {run_id} is not failed")
            return {"success": False, "error": "Run is not failed"}

        existing = db.query(AIAnalysis).filter(AIAnalysis.run_id == run_uuid).first()

        if existing:
            logger.info(f"Analysis already exists for run {run_id}")
            return {"success": True, "analysis_id": str(existing.id), "cached": True}

        pipeline = db.query(Pipeline).filter(Pipeline.id == run.pipeline_id).first()

        logger.info(f"Calling AI analyzer for run {run_id}")

        result = ai_analyzer.analyze_failure(
            logs=run.logs or "No logs available",
            pipeline_name=pipeline.name if pipeline else "Unknown",
            branch=run.branch or "main",
            triggered_by=run.triggered_by or "unknown",
        )

        if not result["success"]:
            logger.error(f"AI analysis failed: {result.get('error')}")
            raise self.retry(exc=Exception(result.get("error", "AI failed")), countdown=30)

        analysis_data = result["analysis"]

        analysis = AIAnalysis(
            run_id=run_uuid,
            root_cause=analysis_data.get("root_cause", "Unknown"),
            fix_suggestion=analysis_data.get("fix_suggestion", "Unknown"),
            severity=analysis_data.get("severity", "medium"),
            error_category=analysis_data.get("error_category", "unknown"),
            confidence=analysis_data.get("confidence", "low"),
            summary=analysis_data.get("summary", ""),
            model_used=settings.LLM_MODEL,
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        logger.info(f"Analysis saved for run {run_id}")

        import asyncio

        async def post_analysis_tasks():
            await broadcast_event(
                "analysis_completed",
                {
                    "run_id": run_id,
                    "pipeline_id": str(run.pipeline_id),
                    "severity": analysis_data.get("severity", "medium"),
                    "summary": analysis_data.get("summary", ""),
                    "error_category": analysis_data.get("error_category", "unknown"),
                },
            )

            if pipeline:
                await send_slack_if_needed(db, pipeline, run, analysis_data)

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(post_analysis_tasks())
            loop.close()
        except Exception as async_err:
            logger.warning(f"Post-analysis tasks failed: {async_err}")

        return {"success": True, "analysis_id": str(analysis.id), "cached": False}

    except Exception as exc:
        db.rollback()
        logger.error(f"Task failed for run {run_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)

    finally:
        db.close()
