"""
Async database connection for FastAPI ingestion service.

Uses SQLAlchemy async engine — handles hundreds of concurrent
device connections without blocking.

Both FastAPI and Django connect to the same PostgreSQL database.
FastAPI writes raw events; Django reads aggregated data.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# asyncpg is the async PostgreSQL driver
# Note: DATABASE_URL uses postgresql+asyncpg:// scheme
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://fi_user:fi_password@localhost:5433/facility_intelligence"
).replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # Set True to log all SQL (noisy in prod)
    pool_size=20,        # Max connections in pool
    max_overflow=10,     # Extra connections under heavy load
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """
    FastAPI dependency — provides a database session per request.
    Automatically closes the session when the request is done.

    Usage in endpoint:
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise