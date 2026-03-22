import asyncio
import sys
from sqlalchemy import text
sys.path.append(".")
from database import AsyncSessionLocal

async def seed():
    async with AsyncSessionLocal() as db:
        print("Inserting initial sensor data to XAMPP...")
        # Mag-insert tayo ng isang row para may mabasa ang Dashboard
        query = text("""
            INSERT INTO sensor_readings 
            (timestamp, tank1_level, tank2_level, tank3_level, tank1_capacity, tank2_capacity, tank3_capacity, inflow_rate, filter_rate, source)
            VALUES (NOW(), 1500.0, 450.0, 3200.0, 2000.0, 2000.0, 4000.0, 5.2, 0.8, 'manual_seed')
        """)
        await db.execute(query)
        await db.commit()
        print("✅ SUCCESS: Initial data inserted! I-check ang phone mo.")

if __name__ == "__main__":
    asyncio.run(seed())