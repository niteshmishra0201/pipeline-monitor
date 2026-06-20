import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class SlackService:

    @staticmethod
    async def send_alert(
        pipeline_name: str,
        run_number: int,
        branch: str,
        triggered_by: str,
        failure_count: int,
        root_cause: str = None,
        severity: str = None,
        run_id: str = None,
    ) -> bool:
        """
        Sends a failure alert to Slack.
        Returns True if successful, False if failed or disabled.
        """
        if not settings.SLACK_ENABLED or not settings.SLACK_WEBHOOK_URL:
            logger.info("Slack alerts disabled or no webhook URL configured")
            return False

        severity_emoji = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🟢",
        }.get(severity or "high", "🟠")

        message = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"{severity_emoji} Pipeline Failure Alert",
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Pipeline:*\n{pipeline_name}"},
                        {"type": "mrkdwn", "text": f"*Run:*\n#{run_number}"},
                        {"type": "mrkdwn", "text": f"*Branch:*\n{branch}"},
                        {"type": "mrkdwn", "text": f"*Triggered by:*\n{triggered_by}"},
                    ],
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Failed {failure_count} times in the last hour*",
                    },
                },
            ]
        }

        if root_cause:
            message["blocks"].append(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*AI Root Cause:*\n{root_cause}",
                    },
                }
            )

        message["blocks"].append({"type": "divider"})

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(settings.SLACK_WEBHOOK_URL, json=message, timeout=10.0)
                if response.status_code == 200:
                    logger.info(f"Slack alert sent for pipeline {pipeline_name}")
                    return True
                else:
                    logger.error(f"Slack alert failed: {response.status_code}")
                    return False
        except Exception as e:
            logger.error(f"Slack alert error: {e}")
            return False

    @staticmethod
    def check_failure_threshold(db, pipeline_id: str, threshold: int = None) -> int:
        """
        Counts how many times a pipeline failed in the last hour.
        Returns the count — caller decides whether to alert.
        """
        from datetime import datetime, timedelta, timezone
        from uuid import UUID

        from app.models.pipeline import PipelineRun, PipelineStatus

        threshold = threshold or settings.FAILURE_ALERT_THRESHOLD
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

        count = (
            db.query(PipelineRun)
            .filter(
                PipelineRun.pipeline_id == UUID(pipeline_id),
                PipelineRun.status == PipelineStatus.failed,
                PipelineRun.created_at >= one_hour_ago,
            )
            .count()
        )

        return count


slack_service = SlackService()
