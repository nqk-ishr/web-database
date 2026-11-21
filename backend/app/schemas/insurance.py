"""Schema nghiệp vụ 3: bảo hiểm và bồi thường."""
import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field


class NewPolicy(BaseModel):
    vehicle_id: int
    product_id: int
    start_date: dt.date


class NewClaim(BaseModel):
    policy_id: int
    claim_type: str = Field(pattern="^(accident|theft)$")
    event_time: dt.datetime
    event_location: str = Field(min_length=1, max_length=300)
    description: Optional[str] = Field(default=None, max_length=1000)
    requested_amount: int = Field(gt=0)


class Supplement(BaseModel):
    description: Optional[str] = Field(default=None, max_length=1000)


class ApproveClaim(BaseModel):
    approved_amount: int = Field(ge=0)
    note: Optional[str] = Field(default=None, max_length=500)
