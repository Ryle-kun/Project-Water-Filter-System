import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base, engine, AsyncSessionLocal, User, Schedule
from passlib.context import CryptContext
import os

logger = logging.getLogger(__name__)  # ← fixed: was _name_

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
        from sqlalchemy import select

        # ── Default users ──────────────────────────────────────────────────────
        default_users = [
            {"username": "admin",    "password": "admin123",    "role": "admin"},
            {"username": "operator", "password": "operator123", "role": "operator"},
            {"username": "official", "password": "official123", "role": "official"},
        ]

        for u in default_users:
            result = await db.execute(select(User).where(User.username == u["username"]))
            if not result.scalar_one_or_none():
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
            if not result.scalar_one_or_none():
                sched = Schedule(**s)
                db.add(sched)

        await db.commit()


async def get_db():
    """Dependency for FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session