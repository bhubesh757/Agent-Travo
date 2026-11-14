"""SQLAlchemy records for travelers and trips."""

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

JSONType = JSON().with_variant(JSONB, "postgresql")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)  # Google `sub`, never email.
    email: Mapped[str] = mapped_column(String(320), index=True)
    name: Mapped[str] = mapped_column(String(200))
    picture: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class TripRecord(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    origin: Mapped[str | None] = mapped_column(String(160), nullable=True)
    destination: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    travelers: Mapped[int] = mapped_column(Integer, default=1)
    budget_currency: Mapped[str] = mapped_column(String(3), default="INR")
    budget_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    budget_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget_min: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    budget_max: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    interests: Mapped[list[str]] = mapped_column(JSONType, default=list)
    status: Mapped[str] = mapped_column(String(32), default="requested", index=True)
    proposal_version: Mapped[int] = mapped_column(Integer, default=0)
    proposal: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    approval_decision: Mapped[str | None] = mapped_column(String(16), nullable=True)
    approval_decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
