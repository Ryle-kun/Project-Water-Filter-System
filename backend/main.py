"""
IoT Water Filter Monitoring System — FastAPI Backend (Fixed WebSocket)
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import asyncio
import logging
from datetime import datetime

from database import init_db, get_db, AsyncSessionLocal
from models import SensorReading, ValveCommand, Alert, User, Schedule
from schemas import (
    SensorReadingCreate, ValveCommandCreate,
    AlertAcknowledge, ScheduleCreate,
    LoginRequest,
)
from services.sensor_service import (
    SensorService, ValveService, AlertService, AuthService, ScheduleService
)
from websocket_manager import ConnectionManager
from serial_bridge import SerialBridge

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ws_manager = ConnectionManager()
serial_bridge = SerialBridge(ws_manager=ws_manager)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Water System API...")
    await init_db()
    asyncio.create_task(serial_bridge.start())
    yield
    logger.info("Shutting down...")
    serial_bridge.stop()


app = FastAPI(title="Barangay Water System API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    auth_service = AuthService(db)
    user = await auth_service.verify_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


# Login
@app.post("/api/auth/login")
async def login(request: LoginRequest, db=Depends(get_db)):
    auth_service = AuthService(db)
    token = await auth_service.authenticate(request.username, request.password)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return token


# WebSocket — use AsyncSessionLocal directly, NOT Depends(get_db)
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket, client_id)
    logger.info(f"WS connected: {client_id} | Total: {ws_manager.active_count}")
    try:
        async with AsyncSessionLocal() as db:
            status_data = await SensorService(db).get_latest_status()
            if status_data:
                await websocket.send_json({"type": "init", "data": status_data})
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        logger.info(f"WS disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WS error [{client_id}]: {e}")
        ws_manager.disconnect(client_id)


# Sensor reading
@app.post("/api/sensors/reading", status_code=201)
async def post_sensor_reading(payload: SensorReadingCreate, db=Depends(get_db)):
    reading = await SensorService(db).save_reading(payload)
    await AlertService(db, ws_manager).evaluate(reading)
    await ValveService(db, ws_manager).auto_evaluate(reading)
    data = reading.to_dict()
    await ws_manager.broadcast({"type": "sensor_update", "data": data})
    return data


@app.get("/api/sensors/latest")
async def get_latest(current_user=Depends(get_current_user), db=Depends(get_db)):
    return await SensorService(db).get_latest_status()


@app.get("/api/sensors/history")
async def get_history(hours: int = 6, current_user=Depends(get_current_user), db=Depends(get_db)):
    return await SensorService(db).get_history(hours=hours)


# Dashboard
@app.get("/api/dashboard")
async def get_dashboard(current_user=Depends(get_current_user), db=Depends(get_db)):
    status    = await SensorService(db).get_latest_status()
    alerts    = await AlertService(db, ws_manager).get_active()
    valves    = await ValveService(db, ws_manager).get_all_states()
    schedules = await ScheduleService(db).get_all()
    stats     = await SensorService(db).get_24h_stats()
    return {
        "status":        status,
        "active_alerts": [a.to_dict() for a in alerts],
        "valve_states":  valves,
        "schedules":     [s.to_dict() for s in schedules],
        "stats_24h":     stats,
    }


# Valve control
@app.post("/api/valves/command")
async def send_valve_command(
    payload: ValveCommandCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    cmd = await ValveService(db, ws_manager).send_command(
        valve_id=payload.valve_id,
        action=payload.action,
        issued_by=current_user.username,
        duration_minutes=payload.duration_minutes
    )
    await serial_bridge.send_command(cmd)
    await ws_manager.broadcast({"type": "valve_update", "data": cmd.to_dict()})

    # Push updated status so UI updates valve indicators immediately
    async with AsyncSessionLocal() as db2:
        latest = await SensorService(db2).get_latest_status()
        if latest and latest.get("valves"):
            latest["valves"][f"sv{payload.valve_id}"] = (payload.action == "OPEN")
            await ws_manager.broadcast({"type": "sensor_update", "data": latest})

    return cmd.to_dict()


@app.get("/api/valves/states")
async def get_valve_states(current_user=Depends(get_current_user), db=Depends(get_db)):
    return await ValveService(db, ws_manager).get_all_states()


# Schedules
@app.get("/api/schedules")
async def get_schedules(current_user=Depends(get_current_user), db=Depends(get_db)):
    return [s.to_dict() for s in await ScheduleService(db).get_all()]


@app.post("/api/schedules", status_code=201)
async def create_schedule(payload: ScheduleCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    sched = await ScheduleService(db).upsert(payload, created_by=current_user.username)
    all_schedules = await ScheduleService(db).get_all()
    await serial_bridge.send_schedules(all_schedules)
    await ws_manager.broadcast({"type": "schedule_update", "data": sched.to_dict()})
    return sched.to_dict()


@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: int, current_user=Depends(get_current_user), db=Depends(get_db)):
    await ScheduleService(db).delete(schedule_id)
    return {"deleted": True}


# Alerts
@app.get("/api/alerts")
async def get_alerts(active_only: bool = False, limit: int = 50, current_user=Depends(get_current_user), db=Depends(get_db)):
    alerts = await AlertService(db, ws_manager).get_all(active_only=active_only, limit=limit)
    return [a.to_dict() for a in alerts]


@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, payload: AlertAcknowledge, current_user=Depends(get_current_user), db=Depends(get_db)):
    await AlertService(db, ws_manager).acknowledge(alert_id, acknowledged_by=current_user.username, note=payload.note)
    await ws_manager.broadcast({"type": "alert_acknowledged", "alert_id": alert_id})
    return {"acknowledged": True}


# Health
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "arduino_connected": serial_bridge.is_connected,
        "ws_clients": ws_manager.active_count,
    }
