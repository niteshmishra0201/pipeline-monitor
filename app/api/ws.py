from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import manager
from app.core.database import SessionLocal
from app.models.pipeline import PipelineRun, PipelineStatus
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint.
    Browser connects here and receives real-time events.
    
    Events the server sends:
    - pipeline_run_created: a new run was detected
    - pipeline_run_failed: a run just failed
    - analysis_completed: AI analysis finished for a run
    - ping: keepalive every 30s
    """
    await manager.connect(websocket)

    try:
        await manager.send_personal(websocket, "connected", {
            "message": "Connected to Pipeline Monitor real-time feed"
        })

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await manager.send_personal(websocket, "pong", {})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)