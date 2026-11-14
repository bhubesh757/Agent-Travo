"""Validated request and response models for trip planning."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class BudgetInput(BaseModel):
    amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="INR", min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        value = value.strip().upper()
        if not value.isalpha():
            raise ValueError("Currency must be a three-letter code")
        return value


class BudgetRead(BaseModel):
    amount: Decimal | None
    currency: str
    range: str | None = None


class TripCreate(BaseModel):
    origin: str | None = Field(default=None, max_length=160)
    destination: str = Field(min_length=2, max_length=200)
    start_date: date | None = None
    end_date: date | None = None
    travelers: int = Field(default=1, ge=1, le=20)
    budget: BudgetInput | None = None
    budget_currency: str | None = Field(default=None, min_length=3, max_length=3)
    budget_range: str | None = Field(default=None, max_length=100)
    budget_min: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    budget_max: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    preferences: str | None = Field(default=None, max_length=2000)
    interests: list[str] = Field(default_factory=list, max_length=20)
    booking_requires_approval: Literal[True] = True

    @field_validator("origin", "budget_range", "preferences")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if value and value.strip() else None

    @field_validator("destination")
    @classmethod
    def validate_destination(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Destination must contain at least two non-space characters")
        return value

    @field_validator("budget_currency")
    @classmethod
    def uppercase_budget_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip().upper()
        if not value.isalpha():
            raise ValueError("Currency must be a three-letter code")
        return value

    @model_validator(mode="after")
    def validate_trip(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date must be on or after start date")
        if self.start_date and self.end_date and (self.end_date - self.start_date).days > 60:
            raise ValueError("Trip duration cannot exceed 60 days")
        if self.budget_min is not None and self.budget_max is not None and self.budget_max < self.budget_min:
            raise ValueError("Maximum budget must be greater than or equal to minimum budget")
        if self.interests:
            cleaned = [interest.strip() for interest in self.interests if interest.strip()]
            if any(len(interest) > 80 for interest in cleaned):
                raise ValueError("Each interest must be 80 characters or fewer")
            self.interests = cleaned
        return self


class TripRead(BaseModel):
    id: str
    origin: str | None
    destination: str
    start_date: date | None
    end_date: date | None
    travelers: int
    budget: BudgetRead
    budget_currency: str
    budget_range: str | None
    budget_min: Decimal | None
    budget_max: Decimal | None
    preferences: str | None
    interests: list[str]
    booking_requires_approval: bool = True
    status: str
    proposal_version: int
    proposal: dict | None
    approval_decision: str | None
    approval_decided_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, trip) -> "TripRead":
        return cls(
            id=trip.id,
            origin=trip.origin,
            destination=trip.destination,
            start_date=trip.start_date,
            end_date=trip.end_date,
            travelers=trip.travelers,
            budget=BudgetRead(amount=trip.budget_amount, currency=trip.budget_currency, range=trip.budget_range),
            budget_currency=trip.budget_currency,
            budget_range=trip.budget_range,
            budget_min=trip.budget_min,
            budget_max=trip.budget_max,
            preferences=trip.preferences,
            interests=trip.interests or [],
            status=trip.status,
            proposal_version=trip.proposal_version,
            proposal=trip.proposal,
            approval_decision=trip.approval_decision,
            approval_decided_at=trip.approval_decided_at,
            created_at=trip.created_at,
            updated_at=trip.updated_at,
        )


class ApprovalRequest(BaseModel):
    decision: Literal["approve", "reject"]
    proposal_version: int = Field(ge=1)
