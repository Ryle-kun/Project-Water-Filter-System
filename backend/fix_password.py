import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal
from passlib.context import CryptContext

# Eto dapat ang saktong gamit sa sensor_service.py mo
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def fix():
    async with AsyncSessionLocal() as db:
        print("Re-hashing password for 'admin'...")
        
        # 1. I-hash ang password gamit ang tamang algorithm
        new_hashed_password = pwd_context.hash("password123")
        
        # 2. I-update ang XAMPP database
        query = text("UPDATE users SET hashed_password = :hp WHERE username = 'admin'")
        await db.execute(query, {"hp": new_hashed_password})
        await db.commit()
        
        print(f"✅ SUCCESS: Password for 'admin' is now 'password123'")
        print(f"New Hash: {new_hashed_password}")

if __name__ == "__main__":
    asyncio.run(fix())