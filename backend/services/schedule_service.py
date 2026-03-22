from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from models import Schedule
from schemas import ScheduleCreate, ScheduleUpdate
import logging

logger = logging.getLogger(__name__)

class ScheduleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── CREATE (Dating Upsert) ──
    async def upsert(self, payload: ScheduleCreate, created_by_id: int):
        """
        Gumagawa ng bagong schedule. 
        Nilagyan ng rollback para hindi ma-stuck ang DB sa error.
        """
        try:
            db_schedule = Schedule(
                tap_stand=payload.tap_stand,
                label=payload.label,
                start_time=payload.start_time,
                end_time=payload.end_time,
                # Siguraduhin na may default True kung walang pinasa
                enabled=payload.enabled if payload.enabled is not None else True,
                created_by_id=created_by_id
            )
            self.db.add(db_schedule)
            await self.db.commit()
            await self.db.refresh(db_schedule)
            return db_schedule
        except Exception as e:
            await self.db.rollback() # <--- ITO ANG FIX: Binibitawan ang DB error
            logger.error(f"Error in Schedule Create: {e}")
            raise e

    # ── UPDATE ──
    async def update(self, schedule_id: int, payload: ScheduleUpdate):
        """
        Ina-update ang existing schedule base sa ID.
        """
        try:
            stmt = select(Schedule).where(Schedule.id == schedule_id)
            result = await self.db.execute(stmt)
            db_schedule = result.scalar_one_or_none()

            if not db_schedule:
                return None

            # Update fields only if they are provided
            update_data = payload.dict(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_schedule, key, value)

            await self.db.commit()
            await self.db.refresh(db_schedule)
            return db_schedule
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in Schedule Update: {e}")
            raise e

    # ── READ ──
    async def get_all(self):
        stmt = select(Schedule).order_by(Schedule.start_time)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ── DELETE ──
    async def delete(self, schedule_id: int):
        try:
            stmt = delete(Schedule).where(Schedule.id == schedule_id)
            result = await self.db.execute(stmt)
            await self.db.commit()
            return result.rowcount > 0
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in Schedule Delete: {e}")
            raise e