"""Authenticated trip requests and planning preview routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_trusted_origin
from app.db.session import get_db
from app.models.trip_schemas import ApprovalRequest, TripCreate, TripRead
from app.services import trips as trip_service

router = APIRouter(prefix="/trips", tags=["trips"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_trusted_origin)])
def create_trip(body: TripCreate, user: CurrentUser, db: DbSession) -> TripRead:
    return TripRead.from_record(trip_service.create_trip(db, user, body))


@router.get("", response_model=list[TripRead])
def list_trips(user: CurrentUser, db: DbSession) -> list[TripRead]:
    return [TripRead.from_record(trip) for trip in trip_service.list_trips(db, user.id)]


@router.get("/{trip_id}", response_model=TripRead)
def get_trip(trip_id: str, user: CurrentUser, db: DbSession) -> TripRead:
    return TripRead.from_record(trip_service.get_owned_trip(db, user.id, trip_id))


@router.post("/{trip_id}/plan", response_model=TripRead, dependencies=[Depends(require_trusted_origin)])
def plan_trip(trip_id: str, user: CurrentUser, db: DbSession) -> TripRead:
    trip = trip_service.get_owned_trip(db, user.id, trip_id)
    trip_service.build_mock_proposal(trip)
    db.commit()
    db.refresh(trip)
    return TripRead.from_record(trip)


@router.post("/{trip_id}/decision", response_model=TripRead, dependencies=[Depends(require_trusted_origin)])
def decide_trip(trip_id: str, body: ApprovalRequest, user: CurrentUser, db: DbSession) -> TripRead:
    trip = trip_service.get_owned_trip(db, user.id, trip_id)
    trip_service.decide_proposal(trip, decision=body.decision, proposal_version=body.proposal_version)
    db.commit()
    db.refresh(trip)
    return TripRead.from_record(trip)
