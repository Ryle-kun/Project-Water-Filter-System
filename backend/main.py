"""
IoT Water Filter Monitoring System — FastAPI Backend
Lab 7: Interactive Valves & Real-time Simulation
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import asyncio
import logging
import random
from datetime import datetime

# Database & Models
from database import init_db, get_db, AsyncSessionLocal
from models import SensorReading, ValveCommand, Alert, User, Schedule, ValveAction
from schemas import (
    SensorReadingCreate, ValveCommandCreate,
    AlertAcknowledge, ScheduleCreate, ScheduleUpdate,
    LoginRequest,
)

# Services
from services.sensor_service import SensorService, ValveService, AlertService, AuthService
from services.schedule_service import ScheduleService 
from websocket_manager import ConnectionManager
from serial_bridge import SerialBridge
from models import ValveCommand # <--- IMPORTANT!

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Managers
ws_manager = ConnectionManager()
serial_bridge = SerialBridge(ws_manager=ws_manager)

# ── 💡 GLOBAL VALVE STATE (Ang memory ng valves) ──
current_valve_states = {f"sv{i}": False for i in range(6)}

async def schedule_checker():
    """
    Check schedules every 30 seconds and update valves automatically.
    """
    logger.info("📅 Schedule Checker Task Started: Monitoring tap stand windows...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                from sqlalchemy import select
                from models import Schedule
                import datetime

                # 1. Kunin lahat ng active schedules
                now = datetime.datetime.now().time()
                stmt = select(Schedule).where(Schedule.enabled == True)
                result = await db.execute(stmt)
                schedules = result.scalars().all()

                updated_any = False
                for s in schedules:
                    # Convert string times (HH:MM) to time objects
                    start = datetime.datetime.strptime(s.start_time, "%H:%M").time()
                    end = datetime.datetime.strptime(s.end_time, "%H:%M").time()
                    
                    valve_key = f"sv{s.tap_stand}"
                    
                    # Logic: Kung nasa loob ng oras, dapat OPEN.
                    # Note: Simple logic lang ito (hindi pa handle ang overnight schedules)
                    is_active = False
                    if start <= end:
                        is_active = start <= now <= end
                    else: # Overnight logic (e.g., 10PM to 2AM)
                        is_active = now >= start or now <= end

                    # 2. Kung nagbago ang state, i-update ang memory at i-broadcast
                    if current_valve_states[valve_key] != is_active:
                        current_valve_states[valve_key] = is_active
                        updated_any = True
                        logger.info(f"⏰ SCHEDULE TRIGGER: {s.label} (Valve {s.tap_stand}) set to {is_active}")

                # 3. Kung may nagbago, sabihan ang Web at Mobile agad!
                if updated_any:
                    await ws_manager.broadcast({
                        "type": "sensor_update",
                        "data": {"valves": current_valve_states}
                    })

        except Exception as e:
            logger.error(f"❌ Schedule Checker Error: {e}")
        
        await asyncio.sleep(30) # Check every 30 seconds


async def system_data_simulator():
    logger.info("🚀 Simulation Task Started: Injecting dynamic data every 10 seconds...")
    
    while True:
        try:
            # ── 💡 DYNAMIC RANGES PARA SA MAGANDANG GRAPH ──
            # Inflow: Ginawa nating 2.5 to 7.5 para mas kita ang taas-baba sa graph
            inflow = round(random.uniform(2.5, 7.5), 1)
            # Filter: Ginawa nating 0.5 to 3.0 para ramdam ang pagbabago
            filt = round(random.uniform(0.5, 3.0), 1)
            
            t1_val = random.randint(1300, 1950)
            t2_val = random.randint(300, 1800) # (Gawin mong 100, 400 para sa demo ng history)
            t3_val = random.randint(400, 3800)

            async with AsyncSessionLocal() as db:
                # 1. SAVE SENSOR READING (Ito ang nagpapadami ng records sa DB)
                new_reading = SensorReading(
                    tank1_level=float(t1_val), tank2_level=float(t2_val), tank3_level=float(t3_val),
                    inflow_rate=inflow, filter_rate=filt,
                    sv0_open=current_valve_states["sv0"], sv1_open=current_valve_states["sv1"],
                    sv2_open=current_valve_states["sv2"], sv3_open=current_valve_states["sv3"],
                    sv4_open=current_valve_states["sv4"], sv5_open=current_valve_states["sv5"],
                    source="simulator", timestamp=datetime.utcnow()
                )
                db.add(new_reading)

                # 2. LOGIC FOR ALERT (Existing)
                t2_pct = round(t2_val / 2000 * 100, 1)
                is_critical = t2_pct < 25
                alert_msg = f"CRITICAL: Tank 2 is very low ({t2_pct}%)" if is_critical else "System Nominal"

                if is_critical:
                    from sqlalchemy import select
                    from models import AlertType, AlertSeverity
                    stmt = select(Alert).where(Alert.message == alert_msg, Alert.active == True)
                    existing = await db.execute(stmt)
                    if not existing.scalar_one_or_none():
                        new_alert = Alert(alert_type=AlertType.TANK3_LOW, severity=AlertSeverity.CRITICAL,
                                        message=alert_msg, active=True, timestamp=datetime.utcnow())
                        db.add(new_alert)
                        logger.info(f"🚨 ALERT LOGGED: {alert_msg}")

                await db.commit()
                
                # ── 💡 DAGDAG ITO: Para alam mong nag-save sa DB ──
                logger.info(f"📈 Database Updated: Inflow {inflow}L/m | Filter {filt}L/m")

                # 3. BROADCAST TO MOBILE (WebSocket)
                payload = {
                    "type": "sensor_update", 
                    "data": {
                        "tank1": {"level": t1_val, "capacity": 2000, "pct": round(t1_val/2000*100, 1)},
                        "tank2": {"level": t2_val, "capacity": 2000, "pct": t2_pct},
                        "tank3": {"level": t3_val, "capacity": 4000, "pct": round(t3_val/4000*100, 1)},
                        "inflow_rate": inflow, "filter_rate": filt,
                        "valves": current_valve_states,
                        "status": { "message": alert_msg, "type": "critical" if is_critical else "stable" }
                    }
                }
                await ws_manager.broadcast(payload)
                
        except Exception as e:
            logger.error(f"❌ Simulator Error: {e}")
            
        await asyncio.sleep(10)

        

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Water System API...")
    await init_db()
    
    async with AsyncSessionLocal() as db:
        from models import User
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.id == 1))
        if not result.scalar_one_or_none():
            admin = User(id=1, username="admin", hashed_password="hashed_password_here", role="admin")
            db.add(admin)
            await db.commit()
            logger.info("Default Admin User created for Schedules.")

    asyncio.create_task(serial_bridge.start())
    asyncio.create_task(system_data_simulator())
    #asyncio.create_task(schedule_checker())#
    yield
    logger.info("Shutting down...")
    serial_bridge.stop()

app = FastAPI(title="Water Monitoring System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db=Depends(get_db)):
    if not credentials: raise HTTPException(status_code=401, detail="Not authenticated")
    auth_service = AuthService(db)
    user = await auth_service.verify_token(credentials.credentials)
    if not user: raise HTTPException(status_code=401, detail="Invalid token")
    return user

# ── 1. AUTHENTICATION ──
@app.post("/api/auth/login")
async def login(request: LoginRequest, db=Depends(get_db)):
    auth_service = AuthService(db)
    token = await auth_service.authenticate(request.username, request.password)
    if not token: raise HTTPException(status_code=401, detail="Invalid credentials")
    return token

# ── 2. WEBSOCKET ──
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket, client_id)
    try:
        async with AsyncSessionLocal() as db:
            status_data = await SensorService(db).get_latest_status()
            if status_data:
                await websocket.send_json({"type": "init", "data": status_data})
        while True:
            msg = await websocket.receive_text()
            if msg == "ping": await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
    except Exception as e:
        ws_manager.disconnect(client_id)

# ── 3. DASHBOARD ──
@app.get("/api/dashboard")
async def get_dashboard(current_user=Depends(get_current_user), db=Depends(get_db)):
    status    = await SensorService(db).get_latest_status()
    alerts    = await AlertService(db, ws_manager).get_active()
    valves    = await ValveService(db, ws_manager).get_all_states()
    schedules = await ScheduleService(db).get_all()
    stats     = await SensorService(db).get_24h_stats()
    return {
        "status": status,
        "active_alerts": [a.to_dict() for a in alerts],
        "valve_states": valves,
        "schedules": [s.to_dict() for s in schedules],
        "stats_24h": stats,
    }

# ── 4. SCHEDULES ──
@app.get("/api/schedules")
async def get_schedules(db=Depends(get_db)):
    service = ScheduleService(db)
    return [s.to_dict() for s in await service.get_all()]

@app.post("/api/schedules", status_code=201)
async def create_schedule(payload: ScheduleCreate, db=Depends(get_db)):
    try:
        service = ScheduleService(db)
        sched = await service.upsert(payload, created_by_id=1) 
        await ws_manager.broadcast({"type": "schedule_update", "data": sched.to_dict()})
        return sched.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/schedules/{schedule_id}")
async def update_schedule(schedule_id: int, payload: ScheduleUpdate, db=Depends(get_db)):
    try:
        service = ScheduleService(db)
        updated = await service.update(schedule_id, payload)
        if not updated: raise HTTPException(status_code=404, detail="Not found")
        await ws_manager.broadcast({"type": "schedule_update", "data": updated.to_dict()})
        return updated.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: int, db=Depends(get_db)):
    service = ScheduleService(db)
    if not await service.delete(schedule_id): raise HTTPException(status_code=404)
    await ws_manager.broadcast({"type": "schedule_delete", "data": {"id": schedule_id}})
    return {"deleted": True}

    # ── 4.5 TREND ANALYTICS (History para sa Graph) ──
@app.get("/api/stats/history")
async def get_stats_history(db=Depends(get_db)):
    """Kukuha ng last 15 records para sa graph sa mobile."""
    from sqlalchemy import select
    try:
        stmt = select(SensorReading).order_by(SensorReading.timestamp.desc()).limit(15)
        result = await db.execute(stmt)
        readings = result.scalars().all()
        
        # I-reverse para chronological order
        readings.reverse()
        
        return {
            "labels": [r.timestamp.strftime("%H:%M") for r in readings],
            "inflow": [round(r.inflow_rate, 1) for r in readings],
            "filter": [round(r.filter_rate, 1) for r in readings]
        }
    except Exception as e:
        logger.error(f"History Fetch Error: {e}")
        return {"labels": [], "inflow": [], "filter": []}
    
    # ── 4.6 CLEAR HISTORY (History Management) ──
@app.delete("/api/alerts/clear")
async def clear_alerts(db=Depends(get_db)):
    """Buburahin lahat ng logs sa alerts table."""
    # IMPORTANTE: Kailangan ang 'delete' mula sa sqlalchemy
    from sqlalchemy import delete
    from models import Alert # Siguraduhin na imported ang Alert model
    
    try:
        # 1. I-execute ang delete statement
        stmt = delete(Alert)
        await db.execute(stmt)
        
        # 2. I-commit ang changes sa MySQL
        await db.commit()
        
        logger.info("🧹 System Activity Log has been cleared via Mobile App.")
        
        # 3. I-broadcast sa phone na wala na talagang laman (optional pero maganda)
        await ws_manager.broadcast({"type": "alert_clear", "data": []})
        
        return {"status": "success", "message": "History cleared"}
        
    except Exception as e:
        # Kapag may error, i-rollback ang DB
        await db.rollback()
        logger.error(f"Clear History Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    

# ── 5. VALVE CONTROL (Interactive Fixed & Instant Broadcast) ──
@app.post("/api/valves/command")
async def send_valve_command(payload: ValveCommandCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    try:
        valve_key = f"sv{payload.valve_id}"
        
        # Gawing mas robust ang pag-check ng status (handle strings or enums)
        action_str = str(payload.action).upper()
        new_status = "OPEN" in action_str
        
        # 1. Update Global Memory agad
        current_valve_states[valve_key] = new_status
        
        # 2. Save Command sa DB
        service = ValveService(db, ws_manager)
        await service.send_command(payload.valve_id, payload.action, current_user.username)
        
        # 3. ── DITO ANG FIX ── 
        # Mag-broadcast agad sa phone para hindi maghintay ng 10 seconds simulator
        await ws_manager.broadcast({
            "type": "sensor_update",
            "data": {
                "valves": current_valve_states
            }
        })
        
        logger.info(f"Valve {payload.valve_id} set to {action_str} - Instant broadcast sent.")
        return {"status": "success", "valve_id": payload.valve_id, "is_open": new_status}
    
    except Exception as e:
        logger.error(f"Valve Command Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "online", "timestamp": datetime.utcnow().isoformat()}

# ── 5.1 CLEAR VALVE COMMAND HISTORY (BULLETPROOF VERSION) ──
@app.delete("/api/valves/clear-history")
async def clear_valve_history(db=Depends(get_db)):
    # 💡 Import natin sa LOOB para sigurado (Fix for NameError)
    from sqlalchemy import delete
    from models import ValveCommand 
    
    try:
        logger.info("🧹 Attempting to wipe ValveCommand table...")
        
        # 1. Create the delete statement
        stmt = delete(ValveCommand)
        
        # 2. Execute the command
        await db.execute(stmt)
        
        # 3. Save changes to MySQL
        await db.commit()
        
        logger.info("✅ DATABASE CLEANED: Valve history wiped successfully.")
        
        # 4. Sabihan ang Web at Mobile na wala na talagang laman
        await ws_manager.broadcast({"type": "valve_history_clear", "data": []})
        
        return {"status": "success", "message": "Valve logs cleared."}
        
    except Exception as e:
        # Kung nag-fail, i-undo ang ginawa para hindi ma-corrupt ang DB
        await db.rollback()
        logger.error(f"❌ 500 ERROR IN DELETE: {str(e)}")
        # I-return natin ang totoong error para mabasa mo sa Mobile
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")