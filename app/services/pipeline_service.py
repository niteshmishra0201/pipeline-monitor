from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from typing import List, Optional

from app.models.pipeline import Pipeline, PipelineRun, AIAnalysis, PipelineStatus
from app.schemas.pipeline import PipelineCreate, PipelineRunCreate


class PipelineService:

    @staticmethod
    def create_pipeline(db: Session, data: PipelineCreate) -> Pipeline:
        pipeline = Pipeline(
            name=data.name,
            repo_url=data.repo_url,
            branch=data.branch
        )
        db.add(pipeline)
        db.commit()
        db.refresh(pipeline)
        return pipeline

    @staticmethod
    def get_all_pipelines(db: Session) -> List[Pipeline]:
        return db.query(Pipeline).filter(
            Pipeline.is_active == True
        ).order_by(desc(Pipeline.created_at)).all()

    @staticmethod
    def get_pipeline_by_id(db: Session, pipeline_id: UUID) -> Optional[Pipeline]:
        return db.query(Pipeline).filter(
            Pipeline.id == pipeline_id
        ).first()

    @staticmethod
    def delete_pipeline(db: Session, pipeline_id: UUID) -> bool:
        pipeline = db.query(Pipeline).filter(
            Pipeline.id == pipeline_id
        ).first()
        if not pipeline:
            return False
        pipeline.is_active = False
        db.commit()
        return True


class PipelineRunService:

    @staticmethod
    def create_run(db: Session, data: PipelineRunCreate) -> PipelineRun:
        run = PipelineRun(
            pipeline_id=data.pipeline_id,
            run_number=data.run_number,
            status=data.status,
            branch=data.branch,
            commit_sha=data.commit_sha,
            commit_message=data.commit_message,
            triggered_by=data.triggered_by,
            started_at=data.started_at,
            finished_at=data.finished_at,
            duration_seconds=data.duration_seconds,
            logs=data.logs
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def get_runs_for_pipeline(
        db: Session,
        pipeline_id: UUID,
        limit: int = 20
    ) -> List[PipelineRun]:
        return db.query(PipelineRun).filter(
            PipelineRun.pipeline_id == pipeline_id
        ).order_by(desc(PipelineRun.created_at)).limit(limit).all()

    @staticmethod
    def get_recent_failed_runs(
        db: Session,
        limit: int = 10
    ) -> List[PipelineRun]:
        return db.query(PipelineRun).filter(
            PipelineRun.status == PipelineStatus.failed
        ).order_by(desc(PipelineRun.created_at)).limit(limit).all()

    @staticmethod
    def get_run_by_id(
        db: Session,
        run_id: UUID
    ) -> Optional[PipelineRun]:
        return db.query(PipelineRun).filter(
            PipelineRun.id == run_id
        ).first()


class AIAnalysisService:

    @staticmethod
    def analyze_run(db: Session, run_id: UUID) -> Optional[AIAnalysis]:
        """
        Main method — fetches a failed run, calls AI analyzer,
        stores and returns the result.
        """
        from app.services.ai_analyzer import ai_analyzer

        run = db.query(PipelineRun).filter(
            PipelineRun.id == run_id
        ).first()

        if not run:
            return None

        if run.status != PipelineStatus.failed:
            return None

        existing = db.query(AIAnalysis).filter(
            AIAnalysis.run_id == run_id
        ).first()
        if existing:
            return existing

        pipeline = db.query(Pipeline).filter(
            Pipeline.id == run.pipeline_id
        ).first()

        logs = run.logs or "No logs available for this run."

        result = ai_analyzer.analyze_failure(
            logs=logs,
            pipeline_name=pipeline.name if pipeline else "Unknown",
            branch=run.branch or "main",
            triggered_by=run.triggered_by or "unknown"
        )

        if not result["success"]:
            return None

        analysis_data = result["analysis"]

        analysis = AIAnalysis(
            run_id=run_id,
            root_cause=analysis_data.get("root_cause", "Unknown"),
            fix_suggestion=analysis_data.get("fix_suggestion", "Unknown"),
            severity=analysis_data.get("severity", "medium"),
            error_category=analysis_data.get("error_category", "unknown"),
            confidence=analysis_data.get("confidence", "low"),
            summary=analysis_data.get("summary", ""),
            model_used=analysis_data.get("model_used", "gpt-4o-mini")
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return analysis

    @staticmethod
    def get_analysis_for_run(
        db: Session,
        run_id: UUID
    ) -> Optional[AIAnalysis]:
        """
        Fetch existing analysis for a run — no AI call.
        """
        return db.query(AIAnalysis).filter(
            AIAnalysis.run_id == run_id
        ).first()