from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime,
    Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from datetime import datetime
import enum
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./data/water_system.db"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class ValveAction(str, enum.Enum):
    OPEN = "OPEN"
    CLOSE = "CLOSE"
    AUTO = "AUTO"


class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AlertType(str, enum.Enum):
    TANK2_OVERFLOW_RISK = "TANK2_OVERFLOW_RISK"
    TANK3_LOW = "TANK3_LOW"
    TANK3_CRITICAL = "TANK3_CRITICAL"
    TANK1_EMPTY = "TANK1_EMPTY"
    SENSOR_FAULT = "SENSOR_FAULT"
    VALVE_FAULT = "VALVE_FAULT"
    LOW_BATTERY = "LOW_BATTERY"


def dt_str(dt):
    """Safely convert datetime to ISO string."""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id             = Column(Integer, primary_key=True, index=True)
    timestamp      = Column(DateTime, default=datetime.utcnow, index=True)
    tank1_level    = Column(Float, nullable=False)
    tank2_level    = Column(Float, nullable=False)
    tank3_level    = Column(Float, nullable=False)
    tank1_capacity = Column(Float, default=2000.0)
    tank2_capacity = Column(Float, default=2000.0)
    tank3_capacity = Column(Float, default=4000.0)
    inflow_rate    = Column(Float, default=0.0)
    filter_rate    = Column(Float, default=0.0)
    sv0_open       = Column(Boolean, default=False)
    sv1_open       = Column(Boolean, default=False)
    sv2_open       = Column(Boolean, default=False)
    sv3_open       = Column(Boolean, default=False)
    sv4_open       = Column(Boolean, default=False)
    sv5_open       = Column(Boolean, default=False)
    battery_voltage = Column(Float, nullable=True)
    solar_charging  = Column(Boolean, default=False)
    source         = Column(String, default="arduino")

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": dt_str(self.timestamp),
            "tank1": {
                "level": self.tank1_level,
                "capacity": self.tank1_capacity,
                "pct": round(self.tank1_level / self.tank1_capacity * 100, 1)
            },
            "tank2": {
                "level": self.tank2_level,
                "capacity": self.tank2_capacity,
                "pct": round(self.tank2_level / self.tank2_capacity * 100, 1)
            },
            "tank3": {
                "level": self.tank3_level,
                "capacity": self.tank3_capacity,
                "pct": round(self.tank3_level / self.tank3_capacity * 100, 1)
            },
            "inflow_rate": self.inflow_rate,
            "filter_rate": self.filter_rate,
            "valves": {
                "sv0": self.sv0_open,
                "sv1": self.sv1_open,
                "sv2": self.sv2_open,
                "sv3": self.sv3_open,
                "sv4": self.sv4_open,
                "sv5": self.sv5_open,
            },
            "battery_voltage": self.battery_voltage,
            "solar_charging": self.solar_charging,
            "tier": self._get_tier(),
            "tier_max_taps": self._get_tier_max(),
        }

    def _get_tier(self):
        p = self.tank3_level
        if p >= 2000: return "NORMAL"
        if p >= 1000: return "MODERATE"
        if p >= 400:  return "LOW"
        return "CRITICAL"

    def _get_tier_max(self):
        p = self.tank3_level
        if p >= 2000: return 5
        if p >= 1000: return 3
        if p >= 400:  return 1
        return 0


class ValveCommand(Base):
    __tablename__ = "valve_commands"

    id               = Column(Integer, primary_key=True, index=True)
    timestamp        = Column(DateTime, default=datetime.utcnow, index=True)
    valve_id         = Column(Integer, nullable=False)
    action           = Column(SAEnum(ValveAction), nullable=False)
    issued_by        = Column(String, default="system")
    duration_minutes = Column(Integer, nullable=True)
    expires_at       = Column(DateTime, nullable=True)
    executed         = Column(Boolean, default=False)
    executed_at      = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": dt_str(self.timestamp),
            "valve_id": self.valve_id,
            "action": self.action,
            "issued_by": self.issued_by,
            "duration_minutes": self.duration_minutes,
            "expires_at": dt_str(self.expires_at),
            "executed": self.executed,
        }


class Alert(Base):
    __tablename__ = "alerts"

    id              = Column(Integer, primary_key=True, index=True)
    timestamp       = Column(DateTime, default=datetime.utcnow, index=True)
    alert_type      = Column(SAEnum(AlertType), nullable=False)
    severity        = Column(SAEnum(AlertSeverity), nullable=False)
    message         = Column(String, nullable=False)
    details         = Column(String, nullable=True)
    active          = Column(Boolean, default=True)
    acknowledged    = Column(Boolean, default=False)
    acknowledged_by = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    note            = Column(String, nullable=True)
    resolved_at     = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": dt_str(self.timestamp),
            "alert_type": self.alert_type,
            "severity": self.severity,
            "message": self.message,
            "active": self.active,
            "acknowledged": self.acknowledged,
            "acknowledged_by": self.acknowledged_by,
        }


class Schedule(Base):
    __tablename__ = "schedules"

    id         = Column(Integer, primary_key=True, index=True)
    tap_stand  = Column(Integer, nullable=False)
    label      = Column(String, nullable=True)
    start_time = Column(String, nullable=False)
    end_time   = Column(String, nullable=False)
    enabled    = Column(Boolean, default=True)
    created_by = Column(String, default="operator")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "tap_stand": self.tap_stand,
            "label": self.label,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "enabled": self.enabled,
        }


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role            = Column(String, default="operator")
    email           = Column(String, nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    last_login      = Column(DateTime, nullable=True)