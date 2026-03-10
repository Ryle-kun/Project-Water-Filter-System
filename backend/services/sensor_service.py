from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from models import SensorReading, ValveCommand, Alert, Schedule, User, ValveAction, AlertType, AlertSeverity
from datetime import datetime, timedelta
from typing import Optional, List
import logging, os
from passlib.context import CryptContext
import jwt

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production-barangay-water-2026")
ALGORITHM = "HS256"

TIERS = [
    {"min": 2000, "max_taps": 5, "label": "NORMAL"},
    {"min": 1000, "max_taps": 3, "label": "MODERATE"},
    {"min": 400,  "max_taps": 1, "label": "LOW"},
    {"min": 0,    "max_taps": 0, "label": "CRITICAL"},
]

def get_tier(level):
    for t in TIERS:
        if level >= t["min"]:
            return t
    return TIERS[-1]

def dt_str(dt):
    """Convert datetime to ISO string safely."""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


# ─── Sensor Service ─────────────────────────────────────────────────────────────
class SensorService:
    def __init__(self, db): self.db = db

    async def save_reading(self, payload):
        reading = SensorReading(**payload.model_dump())
        self.db.add(reading)
        await self.db.commit()
        await self.db.refresh(reading)
        return reading

    async def get_latest(self):
        r = await self.db.execute(
            select(SensorReading).order_by(desc(SensorReading.timestamp)).limit(1)
        )
        return r.scalar_one_or_none()

    async def get_latest_status(self):
        reading = await self.get_latest()
        if not reading:
            return None  # Return None instead of {} so callers can handle it
        tier = get_tier(reading.tank3_level)
        return {
            "timestamp": dt_str(reading.timestamp),  # ← fixed: convert to string
            "tank1": {
                "level": reading.tank1_level,
                "capacity": reading.tank1_capacity,
                "pct": round(reading.tank1_level / reading.tank1_capacity * 100, 1)
            },
            "tank2": {
                "level": reading.tank2_level,
                "capacity": reading.tank2_capacity,
                "pct": round(reading.tank2_level / reading.tank2_capacity * 100, 1)
            },
            "tank3": {
                "level": reading.tank3_level,
                "capacity": reading.tank3_capacity,
                "pct": round(reading.tank3_level / reading.tank3_capacity * 100, 1)
            },
            "inflow_rate": reading.inflow_rate,
            "filter_rate": reading.filter_rate,
            "valves": {
                "sv0": reading.sv0_open,
                "sv1": reading.sv1_open,
                "sv2": reading.sv2_open,
                "sv3": reading.sv3_open,
                "sv4": reading.sv4_open,
                "sv5": reading.sv5_open,
            },
            "battery_voltage": reading.battery_voltage,
            "solar_charging": reading.solar_charging,
            "tier": tier["label"],
            "tier_max_taps": tier["max_taps"],
        }

    async def get_history(self, tank_id=None, hours=24):
        since = datetime.utcnow() - timedelta(hours=hours)
        r = await self.db.execute(
            select(SensorReading)
            .where(SensorReading.timestamp >= since)
            .order_by(SensorReading.timestamp)
        )
        return [x.to_dict() for x in r.scalars().all()]

    async def get_24h_stats(self):
        from sqlalchemy import func
        since = datetime.utcnow() - timedelta(hours=24)
        r = await self.db.execute(
            select(
                func.min(SensorReading.tank3_level),
                func.max(SensorReading.tank3_level),
                func.avg(SensorReading.tank3_level),
            ).where(SensorReading.timestamp >= since)
        )
        row = r.one()
        return {
            "min_tank3": row[0] or 0,
            "max_tank3": row[1] or 0,
            "avg_tank3": round(row[2] or 0, 1),
            "total_alerts": 0,
            "overflow_events": 0,
        }


# ─── Valve Service ──────────────────────────────────────────────────────────────
class ValveService:
    def __init__(self, db, ws_manager):
        self.db = db
        self.ws = ws_manager

    async def send_command(self, valve_id, action, issued_by="system", duration_minutes=None):
        expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes) if duration_minutes else None
        cmd = ValveCommand(
            valve_id=valve_id,
            action=action,
            issued_by=issued_by,
            duration_minutes=duration_minutes,
            expires_at=expires_at
        )
        self.db.add(cmd)
        await self.db.commit()
        await self.db.refresh(cmd)
        return cmd

    async def auto_evaluate(self, reading):
        """Auto close/open SV0 based on Tank 2 hysteresis."""
        t2_pct = reading.tank2_level / reading.tank2_capacity * 100
        if t2_pct >= 90 and reading.sv0_open:
            await self.send_command(0, ValveAction.CLOSE, issued_by="system")
        elif t2_pct <= 70 and not reading.sv0_open:
            await self.send_command(0, ValveAction.OPEN, issued_by="system")

    async def get_all_states(self):
        reading = await SensorService(self.db).get_latest()
        if not reading:
            return {"sv0": False, "sv1": False, "sv2": False, "sv3": False, "sv4": False, "sv5": False}
        return {
            "sv0": reading.sv0_open,
            "sv1": reading.sv1_open,
            "sv2": reading.sv2_open,
            "sv3": reading.sv3_open,
            "sv4": reading.sv4_open,
            "sv5": reading.sv5_open,
        }


# ─── Alert Service ──────────────────────────────────────────────────────────────
class AlertService:
    def __init__(self, db, ws_manager):
        self.db = db
        self.ws = ws_manager

    async def evaluate(self, reading):
        t2_pct = reading.tank2_level / reading.tank2_capacity * 100
        t3_pct = reading.tank3_level / reading.tank3_capacity * 100
        t1_pct = reading.tank1_level / reading.tank1_capacity * 100

        checks = [
            (t2_pct >= 88,  AlertType.TANK2_OVERFLOW_RISK, AlertSeverity.WARNING,  f"Tank 2 at {t2_pct:.0f}% — overflow risk."),
            (t3_pct < 10,   AlertType.TANK3_CRITICAL,      AlertSeverity.CRITICAL, f"Tank 3 CRITICAL at {t3_pct:.0f}%. All taps closed."),
            (10 <= t3_pct < 25, AlertType.TANK3_LOW,       AlertSeverity.WARNING,  f"Tank 3 LOW at {t3_pct:.0f}%. Max 1 tap active."),
            (t1_pct < 5,    AlertType.TANK1_EMPTY,         AlertSeverity.WARNING,  f"Tank 1 nearly empty at {t1_pct:.0f}%."),
            (reading.battery_voltage and reading.battery_voltage < 11.5,
             AlertType.LOW_BATTERY, AlertSeverity.WARNING, f"Battery low: {reading.battery_voltage}V"),
        ]

        for condition, atype, severity, message in checks:
            if condition:
                existing = await self.db.execute(
                    select(Alert).where(Alert.alert_type == atype, Alert.active == True)
                )
                if not existing.scalar_one_or_none():
                    alert = Alert(alert_type=atype, severity=severity, message=message)
                    self.db.add(alert)
                    await self.db.commit()
                    await self.ws.broadcast({"type": "alert_new", "data": alert.to_dict()})

    async def get_active(self):
        r = await self.db.execute(
            select(Alert).where(Alert.active == True).order_by(desc(Alert.timestamp))
        )
        return r.scalars().all()

    async def get_all(self, active_only=False, limit=50):
        q = select(Alert).order_by(desc(Alert.timestamp)).limit(limit)
        if active_only:
            q = q.where(Alert.active == True)
        r = await self.db.execute(q)
        return r.scalars().all()

    async def acknowledge(self, alert_id, acknowledged_by, note=None):
        r = await self.db.execute(select(Alert).where(Alert.id == alert_id))
        alert = r.scalar_one_or_none()
        if alert:
            alert.acknowledged = True
            alert.acknowledged_by = acknowledged_by
            alert.acknowledged_at = datetime.utcnow()
            alert.active = False
            if note:
                alert.note = note
            await self.db.commit()


# ─── Schedule Service ───────────────────────────────────────────────────────────
class ScheduleService:
    def __init__(self, db): self.db = db

    async def get_all(self):
        r = await self.db.execute(select(Schedule).order_by(Schedule.tap_stand))
        return r.scalars().all()

    async def upsert(self, payload, created_by="operator"):
        r = await self.db.execute(
            select(Schedule).where(Schedule.tap_stand == payload.tap_stand)
        )
        sched = r.scalar_one_or_none()
        if sched:
            sched.start_time = payload.start_time
            sched.end_time   = payload.end_time
            sched.enabled    = payload.enabled
            sched.updated_at = datetime.utcnow()
            if payload.label:
                sched.label = payload.label
        else:
            sched = Schedule(**payload.model_dump(), created_by=created_by)
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


# ─── Auth Service ───────────────────────────────────────────────────────────────
class AuthService:
    def __init__(self, db): self.db = db

    async def authenticate(self, username, password):
        r = await self.db.execute(select(User).where(User.username == username))
        user = r.scalar_one_or_none()
        if not user or not pwd_context.verify(password, user.hashed_password):
            return None
        user.last_login = datetime.utcnow()
        await self.db.commit()
        token = jwt.encode(
            {"sub": user.username, "role": user.role,
             "exp": datetime.utcnow() + timedelta(hours=24)},
            SECRET_KEY, algorithm=ALGORITHM
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role,
            "username": user.username
        }

    async def verify_token(self, token):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            r = await self.db.execute(select(User).where(User.username == payload["sub"]))
            return r.scalar_one_or_none()
        except Exception:
            return None