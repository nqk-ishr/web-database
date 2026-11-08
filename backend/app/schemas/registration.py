"""Schema nghiệp vụ 1: đăng ký và sang tên."""
from typing import Optional

from pydantic import BaseModel, Field


class NewRegistration(BaseModel):
    vehicle_type_id: int
    chassis_number: str = Field(min_length=1, max_length=30)
    engine_number: str = Field(min_length=1, max_length=30)
    manufacture_year: int = Field(ge=1950, le=2100)


class Transfer(BaseModel):
    vehicle_id: int
    buyer_id: int


class ApproveRequest(BaseModel):
    plate_number: Optional[str] = Field(default=None, max_length=15)   # bắt buộc khi đăng ký mới
