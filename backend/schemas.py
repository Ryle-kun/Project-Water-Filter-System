from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from models import ValveAction, AlertSeverity, AlertType

# ── 1. SENSOR & HARDWARE SCHEMAS (Stayed mostly the same) ──
class SensorReadingCreate(BaseModel):
    tank1_level: float = Field(..., ge=0, le=2000)
    tank2_level: float = Field(..., ge=0, le=2000)
    tank3_level: float = Field(..., ge=0, le=4000)
    inflow_rate: float = Field(default=0.0, ge=0)
    filter_rate: float = Field(default=0.0, ge=0)
    sv0_open: bool = False
    sv1_open: bool = False
    sv2_open: bool = False
    sv3_open: bool = False
    sv4_open: bool = False
    sv5_open: bool = False
    battery_voltage: Optional[float] = None
    solar_charging: bool = False
    source: str = "arduino"

class SensorReadingOut(BaseModel):
    id: int
    timestamp: Optional[datetime] = None
    tank1_level: float
    tank2_level: float
    tank3_level: float
    inflow_rate: float
    filter_rate: float
    battery_voltage: Optional[float] = None
    
    class Config:
        from_attributes = True

class ValveCommandCreate(BaseModel):
    valve_id: int = Field(..., ge=0, le=5)
    action: ValveAction
    duration_minutes: Optional[int] = Field(default=30, ge=1, le=480)

class ValveCommandOut(BaseModel):
    id: int
    valve_id: int
    action: ValveAction
    issued_by: str
    duration_minutes: Optional[int] = None
    timestamp: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ── 2. ALERT SCHEMAS ──
class AlertOut(BaseModel):
    id: int
    timestamp: Optional[datetime] = None
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    active: bool
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    
    class Config:
        from_attributes = True

class AlertAcknowledge(BaseModel):
    note: Optional[str] = None


# ── 3. SCHEDULE SCHEMAS (UPDATED FOR FULL CRUD & STRICT VALIDATION) ──
class ScheduleCreate(BaseModel):
    tap_stand: int = Field(..., ge=1, le=5, description="Tap stand must be 1 to 5")
    label: Optional[str] = Field(None, min_length=2, max_length=50)
    # STRICT VALIDATION: Dapat HH:MM format (e.g., 08:00, 14:30)
    start_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    enabled: bool = True

# Dinagdag natin ito para sa "UPDATE" na part ng CRUD
class ScheduleUpdate(BaseModel):
    tap_stand: Optional[int] = Field(None, ge=1, le=5)
    label: Optional[str] = Field(None, min_length=2, max_length=50)
    start_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    enabled: Optional[bool] = None

class ScheduleOut(BaseModel):
    id: int
    tap_stand: int
    label: Optional[str] = None
    start_time: str
    end_time: str
    enabled: bool
    created_by_id: Optional[int] = None # Added Foreign Key trace
    
    class Config:
        from_attributes = True


# ── 4. USER & AUTH SCHEMAS (FOR LOGIN/LOGOUT) ──
class UserCreate(BaseModel):
    username: str = Field(..., min_length=4)
    password: str = Field(..., min_length=6)
    email: Optional[EmailStr] = None

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str