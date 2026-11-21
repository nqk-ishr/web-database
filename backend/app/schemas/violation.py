"""Schema nghiệp vụ 2: vi phạm và nộp phạt."""
import datetime as dt

from pydantic import BaseModel, Field


class NewViolation(BaseModel):
    plate_number: str
    violation_type_id: int
    camera_id: int
    occurred_at: dt.datetime


class Notice(BaseModel):
    fine_amount: int = Field(ge=0)
    due_date: dt.date
