from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
import hmac
import hashlib

from app.core.database import get_db
from app.core.config import settings
from app.schemas.pipeline import PipelineRunCreate
from app.services.pipeline_service import PipelineRunService, PipelineService
from app.models.pipeline import PipelineStatus

router = APIRouter(
    prefix="/webhooks",
    tags=["Webhooks"]
)

def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify that the webhook actually came from GitHub.
    GitHub signs every webhook payload with HMAC-SHA256.
    """
    expected = "sha256=" + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def github_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_github_event: Optional[str] = Header(None),
    x_hub_signature_256: Optional[str] = Header(None),
):
    """
    Receives webhook events from GitHub Actions.
    Listens for workflow_run events and stores them as pipeline runs.
    """
    payload = await request.body()
    data = await request.json()

    if x_github_event == "ping":
        return {"message": "Webhook connected successfully"}

    if x_github_event != "workflow_run":
        return {"message": f"Ignoring event: {x_github_event}"}

    workflow_run = data.get("workflow_run", {})
    repo = data.get("repository", {})

    status_map = {
        "success": PipelineStatus.success,
        "failure": PipelineStatus.failed,
        "in_progress": PipelineStatus.running,
        "cancelled": PipelineStatus.cancelled,
    }

    run_status = status_map.get(
        workflow_run.get("conclusion") or workflow_run.get("status"),
        PipelineStatus.running
    )

    pipeline = db.query(
        __import__('app.models.pipeline', fromlist=['Pipeline']).Pipeline
    ).filter_by(repo_url=repo.get("html_url")).first()

    if not pipeline:
        from app.models.pipeline import Pipeline
        pipeline = Pipeline(
            name=repo.get("name", "Unknown"),
            repo_url=repo.get("html_url", ""),
            branch=workflow_run.get("head_branch", "main")
        )
        db.add(pipeline)
        db.commit()
        db.refresh(pipeline)

    from datetime import datetime

    def parse_dt(val):
        if not val:
            return None
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None

    run_data = PipelineRunCreate(
        pipeline_id=pipeline.id,
        run_number=workflow_run.get("run_number", 0),
        status=run_status,
        branch=workflow_run.get("head_branch"),
        commit_sha=workflow_run.get("head_sha", "")[:40],
        commit_message=workflow_run.get("head_commit", {}).get("message"),
        triggered_by=workflow_run.get("triggering_actor", {}).get("login"),
        started_at=parse_dt(workflow_run.get("run_started_at")),
        finished_at=parse_dt(workflow_run.get("updated_at")),
        duration_seconds=None,
        logs=None
    )

    run = PipelineRunService.create_run(db, run_data)

    return {
        "message": "Pipeline run recorded",
        "run_id": str(run.id),
        "status": run_status.value
    }