from fastapi import WebSocket
from typing import List
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages all active WebSocket connections.
    When a browser connects, it gets added here.
    When it disconnects, it gets removed.
    When something happens in the app, we broadcast to all connections.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: dict):
        """
        Send a message to ALL connected browsers at once.
        If a connection is broken, remove it silently.
        """
        message = json.dumps({
            "event": event_type,
            "data": data
        })

        broken_connections = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                broken_connections.append(connection)

        for broken in broken_connections:
            self.disconnect(broken)

    async def send_personal(self, websocket: WebSocket, event_type: str, data: dict):
        """
        Send a message to ONE specific browser connection.
        Used for sending the initial state when a browser first connects.
        """
        message = json.dumps({
            "event": event_type,
            "data": data
        })
        await websocket.send_text(message)


manager = ConnectionManager()