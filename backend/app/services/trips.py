"""Trip persistence and a clearly labeled, deterministic planning preview."""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auth import AuthUser
from app.models.trip import TripRecord, UserRecord
from app.models.trip_schemas import TripCreate


def _remember_user(db: Session, user: AuthUser) -> None:
    record = db.get(UserRecord, user.id)
    if record is None:
        db.add(UserRecord(id=user.id, email=user.email, name=user.name, picture=user.picture))
    else:
        record.email = user.email
        record.name = user.name
        record.picture = user.picture


def create_trip(db: Session, user: AuthUser, body: TripCreate) -> TripRecord:
    _remember_user(db, user)
    data = body.model_dump(exclude={"budget", "budget_currency", "budget_range", "budget_min", "budget_max", "booking_requires_approval"})
    budget = body.budget
    trip = TripRecord(
        user_id=user.id,
        **data,
        budget_currency=(budget.currency if budget else body.budget_currency or "INR"),
        budget_amount=(budget.amount if budget else None),
        budget_range=body.budget_range,
        budget_min=body.budget_min,
        budget_max=body.budget_max,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def list_trips(db: Session, user_id: str) -> list[TripRecord]:
    return list(db.scalars(select(TripRecord).where(TripRecord.user_id == user_id).order_by(TripRecord.created_at.desc())))


def get_owned_trip(db: Session, user_id: str, trip_id: str) -> TripRecord:
    trip = db.scalar(select(TripRecord).where(TripRecord.id == trip_id, TripRecord.user_id == user_id))
    if trip is None:
        # 404 avoids disclosing whether another user's trip exists.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    return trip


def build_mock_proposal(trip: TripRecord) -> TripRecord:
    """Create an illustrative planning outline without inventing live travel facts."""
    if not trip.start_date or not trip.end_date:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Add both travel dates before generating a plan")

    day_count = max(1, (trip.end_date - trip.start_date).days + 1)
    if day_count > 30:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Mock planning preview is limited to 30 days")
    days = []
    for offset in range(day_count):
        current_date = trip.start_date + timedelta(days=offset)
        if offset == 0:
            focus = "Arrival and settle in"
            ideas = ["Keep the first day flexible", "Choose a nearby meal after arrival"]
        elif offset == day_count - 1:
            focus = "A relaxed final day"
            ideas = ["Leave room for a favorite repeat", "Allow time to prepare for departure"]
        else:
            focus = "Explore at your own pace"
            ideas = ["Pick one neighborhood or area to explore", "Balance one planned activity with free time"]
        days.append({"date": current_date.isoformat(), "title": focus, "ideas": ideas})

    trip.proposal_version += 1
    trip.proposal = {
        "version": trip.proposal_version,
        "source": "illustrative_mock",
        "label": "Planning preview · not live travel data",
        "destination": trip.destination,
        "days": days,
        "budget": {
            "currency": trip.budget_currency,
            "amount": str(trip.budget_amount) if trip.budget_amount is not None else None,
            "range": trip.budget_range,
            "minimum": str(trip.budget_min) if trip.budget_min is not None else None,
            "maximum": str(trip.budget_max) if trip.budget_max is not None else None,
            "estimated_total": None,
            "note": "No provider prices or availability have been checked.",
        },
        "approval_required": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    trip.status = "awaiting_approval"
    trip.approval_decision = None
    trip.approval_decided_at = None
    trip.updated_at = datetime.now(timezone.utc)
    return trip


def decide_proposal(trip: TripRecord, *, decision: str, proposal_version: int) -> TripRecord:
    if not trip.proposal or proposal_version != trip.proposal_version:
        raise HTTPException(status.HTTP_409_CONFLICT, "Proposal changed; review the latest version")
    if trip.status != "awaiting_approval":
        raise HTTPException(status.HTTP_409_CONFLICT, "This trip is not waiting for a proposal decision")
    trip.approval_decision = decision
    trip.approval_decided_at = datetime.now(timezone.utc)
    trip.status = "approved" if decision == "approve" else "rejected"
    trip.updated_at = datetime.now(timezone.utc)
    return trip
