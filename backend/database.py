from sqlalchemy.ext.asyncio import AsyncSession
from models import Base, engine, AsyncSessionLocal, User, Schedule
from passlib.context import CryptContext
import logging

logger = logging.getLogger(_name_)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def init_db():
    """Create all tables and seed default users/schedules on first run."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created.")
    await seed_defaults()


async def seed_defaults():
    """Seed default admin user and tap stand schedules if not present."""
    async with AsyncSessionLocal() as db:
        # Check if admin user exists
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == "admin"))
        if not result.scalar_one_or_none():
            admin = User(
                username="admin",
                hashed_password=pwd_context.hash("admin123"),  # Change in production!
                role="admin",
                email="admin@barangay.local"
            )
            operator = User(
                username="operator",
                hashed_password=pwd_context.hash("operator123"),
                role="operator",
            )
            official = User(
                username="official",
                hashed_password=pwd_context.hash("official123"),
                role="official",
            )
            db.add_all([admin, operator, official])
            logger.info("Default users seeded.")

        # Seed default schedules for 5 tap stands
        result = await db.execute(select(Schedule))
        if not result.scalars().all():
            labels = ["Sitio A", "Sitio B", "Sitio C", "Sitio D", "Sitio E"]
            defaults = [
                Schedule(tap_stand=i+1, label=labels[i],
                         start_time="05:30", end_time="07:00", enabled=True)
                for i in range(5)
            ]
            db.add_all(defaults)
            logger.info("Default schedules seeded.")

        await db.commit()


async def get_db():
    """FastAPI dependency for DB session."""
    async with AsyncSessionLocal() as session:
        yield session