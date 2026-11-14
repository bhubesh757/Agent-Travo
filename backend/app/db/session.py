"""SQLAlchemy engine and request-scoped sessions."""

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        if os.environ.get("APP_ENV", "development").strip().lower() == "production":
            raise RuntimeError("DATABASE_URL must point to durable PostgreSQL in production")
        url = "sqlite:///./travelforge.db"
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


DATABASE_URL = _database_url()
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
