from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from models import SensorReading, ValveCommand, Alert, Schedule, User, ValveAction, AlertType, AlertSeverity
from datetime import datetime, timedelta
import logging, os
from passlib.context import CryptContext
import jwt

logger = logging.getLogger(__name__)

# Security Config
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production-barangay-water-2026")
ALGORITHM = "HS256"

# Water Tiers
TIERS = [
    {"min": 2000, "max_taps": 5, "label": "NORMAL"},
    {"min": 1000, "max_taps": 3, "label": "MODERATE"},
    {"min": 400,  "max_taps": 1, "label": "LOW"},
    {"min": 0,    "max_taps": 0, "label": "CRITICAL"},
]

def get_tier(level):
    for t in TIERS:
        if level >= t["min"]: return t
    return TIERS[-1]

def dt_str(dt):
    if dt is None: return None
    if isinstance(dt, datetime): return dt.isoformat()
    return str(dt)

# ─── 1. SENSOR SERVICE ────────────────────────────────────────────────────────
class SensorService:
    def __init__(self, db): self.db = db

    async def save_reading(self, payload):
        reading = SensorReading(**payload.model_dump())
        self.db.add(reading)
        await self.db.commit()
        await self.db.refresh(reading)
        return reading

    async def get_latest(self):
        r = await self.db.execute(select(SensorReading).order_by(desc(SensorReading.timestamp)).limit(1))
        return r.scalar_one_or_none()

    async def get_latest_status(self):
        reading = await self.get_latest()
        if not reading: return None
        tier = get_tier(reading.tank3_level)
        return {
            "timestamp": dt_str(reading.timestamp),
            "tank1": {"level": reading.tank1_level, "capacity": reading.tank1_capacity, "pct": round(reading.tank1_level/(reading.tank1_capacity or 1)*100, 1)},
            "tank2": {"level": reading.tank2_level, "capacity": reading.tank2_capacity, "pct": round(reading.tank2_level/(reading.tank2_capacity or 1)*100, 1)},
            "tank3": {"level": reading.tank3_level, "capacity": reading.tank3_capacity, "pct": round(reading.tank3_level/(reading.tank3_capacity or 1)*100, 1)},
            "inflow_rate": reading.inflow_rate, "filter_rate": reading.filter_rate,
            "valves": {"sv0": reading.sv0_open, "sv1": reading.sv1_open, "sv2": reading.sv2_open, "sv3": reading.sv3_open, "sv4": reading.sv4_open, "sv5": reading.sv5_open},
            "tier": tier["label"], "tier_max_taps": tier["max_taps"],
        }
    
    async def get_24h_stats(self):
        return {"min_tank3": 0, "max_tank3": 0, "avg_tank3": 0, "total_alerts": 0, "overflow_events": 0}

# ─── 2. VALVE SERVICE ──────────────────────────────────────────────────────────
class ValveService:
    def __init__(self, db, ws_manager):
        self.db = db
        self.ws = ws_manager

    async def send_command(self, valve_id, action, issued_by="system", duration_minutes=None):
        expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes) if duration_minutes else None
        cmd = ValveCommand(valve_id=valve_id, action=action, duration_minutes=duration_minutes, expires_at=expires_at)
        self.db.add(cmd)
        await self.db.commit()
        await self.db.refresh(cmd)
        return cmd

    async def auto_evaluate(self, reading):
        pass 

    async def get_all_states(self):
        reading = await SensorService(self.db).get_latest()
        if not reading: return {"sv0":False,"sv1":False,"sv2":False,"sv3":False,"sv4":False,"sv5":False}
        return {"sv0":reading.sv0_open,"sv1":reading.sv1_open,"sv2":reading.sv2_open,"sv3":reading.sv3_open,"sv4":reading.sv4_open,"sv5":reading.sv5_open}

# ─── 3. ALERT SERVICE ──────────────────────────────────────────────────────────
class AlertService:
    def __init__(self, db, ws_manager):
        self.db = db
        self.ws = ws_manager

    async def evaluate(self, reading):
        pass 

    async def get_active(self):
        r = await self.db.execute(select(Alert).where(Alert.active == True))
        return r.scalars().all()

# ─── 4. SCHEDULE SERVICE (CRUD) ─────────────────────────────────────────────────
class ScheduleService:
    def __init__(self, db): self.db = db

    async def get_all(self):
        r = await self.db.execute(select(Schedule).order_by(Schedule.tap_stand))
        return r.scalars().all()

    async def upsert(self, payload, created_by_id: int):
        r = await self.db.execute(select(Schedule).where(Schedule.tap_stand == payload.tap_stand))
        sched = r.scalar_one_or_none()
        if sched:
            sched.start_time, sched.end_time, sched.enabled = payload.start_time, payload.end_time, payload.enabled
            if payload.label: sched.label = payload.label
        else:
            sched = Schedule(**payload.model_dump(), created_by_id=created_by_id)
            self.db.add(sched)
        await self.db.commit()
        await self.db.refresh(sched)
        return sched

    async def delete(self, schedule_id):
        r = await self.db.execute(select(Schedule).where(Schedule.id == schedule_id))
        sched = r.scalar_one_or_none()
        if sched:
            await self.db.delete(sched)
            await self.db.commit()
            return True
        return False

# ─── 5. AUTH SERVICE (DEBUG ENABLED) ───────────────────────────────────────────
class AuthService:
    def __init__(self, db): self.db = db

    async def authenticate(self, username, password):
        # ── DEBUG LOGS ──
        print(f"\n[DEBUG] Login Attempt: {username}")
        
        r = await self.db.execute(select(User).where(User.username == username))
        user = r.scalar_one_or_none()
        
        if not user:
            print(f"[DEBUG] User '{username}' not found in database.")
            return None
            
        is_valid = pwd_context.verify(password, user.hashed_password)
        print(f"[DEBUG] Password verify result: {is_valid}")
        
        if not is_valid:
            return None

        user.last_login = datetime.utcnow()
        await self.db.commit()

        token = jwt.encode(
            {"sub":user.username, "id":user.id, "exp":datetime.utcnow()+timedelta(hours=24)}, 
            SECRET_KEY, 
            algorithm=ALGORITHM
        )
        print(f"[DEBUG] Token generated for {username}. Access granted.")
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "username": user.username
        }

    async def verify_token(self, token):
        try:
            p = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            r = await self.db.execute(select(User).where(User.username == p["sub"]))
            return r.scalar_one_or_none()
        except Exception as e:
            print(f"[DEBUG] Token verification failed: {e}")
            return None