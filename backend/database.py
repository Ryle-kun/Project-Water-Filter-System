import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base, engine, AsyncSessionLocal, User, Schedule
from passlib.context import CryptContext
from sqlalchemy import select # Idinagdag ito sa taas
import os

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_db():
    """Create all tables and seed default data."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created.")
    await seed_default_data()

async def seed_default_data():
    """Seed default users and schedules if they don't exist."""
    async with AsyncSessionLocal() as db:
        # ── Default users ──────────────────────────────────────────────────────
        # Note: Ginawa nating 'password123' para madali tandaan
        default_users = [
            {"username": "admin",    "password": "password123", "role": "admin"},
            {"username": "operator", "password": "password123", "role": "operator"},
            {"username": "official", "password": "password123", "role": "official"},
        ]

        for u in default_users:
            result = await db.execute(select(User).where(User.username == u["username"]))
            # FIX: .scalars().first() ang gamit para iwas MultipleResultsFound error
            user_exists = result.scalars().first() 
            
            if not user_exists:
                user = User(
                    username=u["username"],
                    hashed_password=pwd_context.hash(u["password"]),
                    role=u["role"],
                )
                db.add(user)

        # ── Default schedules ──────────────────────────────────────────────────
        default_schedules = [
            {"tap_stand": 1, "label": "Tap Stand 1", "start_time": "06:00", "end_time": "08:00"},
            {"tap_stand": 2, "label": "Tap Stand 2", "start_time": "06:00", "end_time": "08:00"},
            {"tap_stand": 3, "label": "Tap Stand 3", "start_time": "06:00", "end_time": "08:00"},
            {"tap_stand": 4, "label": "Tap Stand 4", "start_time": "06:00", "end_time": "08:00"},
            {"tap_stand": 5, "label": "Tap Stand 5", "start_time": "06:00", "end_time": "08:00"},
        ]

        for s in default_schedules:
            result = await db.execute(select(Schedule).where(Schedule.tap_stand == s["tap_stand"]))
            # FIX: .scalars().first() rin dito
            sched_exists = result.scalars().first()
            
            if not sched_exists:
                sched = Schedule(**s)
                db.add(sched)

        await db.commit()

async def get_db():
    """Dependency for FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session