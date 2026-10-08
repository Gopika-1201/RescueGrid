from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import logging
from datetime import datetime
from typing import List

logger = logging.getLogger("rescuegrid.websocket")
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                disconnected.append(connection)
                
        for dead_conn in disconnected:
            self.disconnect(dead_conn)

manager = ConnectionManager()

# Background telemetry generator for ambient simulation, clearly labeled as SIMULATION
_telemetry_task = None

async def ambient_telemetry_loop():
    while True:
        try:
            await asyncio.sleep(8)
            if manager.active_connections:
                await manager.broadcast({
                    "type": "TELEMETRY_UPDATE",
                    "mode": "SIMULATION",
                    "timestamp": datetime.utcnow().isoformat(),
                    "data": {
                        "drone_battery": 87.5,
                        "altitude_m": 45.2,
                        "wind_speed_kmh": 12.4,
                        "signal_strength": "OPTIMAL"
                    }
                })
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.debug(f"Telemetry loop error: {e}")
            await asyncio.sleep(5)

@router.on_event("startup")
async def start_telemetry():
    global _telemetry_task
    if _telemetry_task is None:
        _telemetry_task = asyncio.create_task(ambient_telemetry_loop())

@router.on_event("shutdown")
async def stop_telemetry():
    global _telemetry_task
    if _telemetry_task:
        _telemetry_task.cancel()

@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive client ping or messages
            data = await websocket.receive_text()
            # Respond to client ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"Websocket error: {e}")
        manager.disconnect(websocket)
