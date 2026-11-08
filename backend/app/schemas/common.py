"""Schema dùng chung."""
from pydantic import BaseModel, Field


class Reason(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class Note(BaseModel):
    note: str = Field(min_length=1, max_length=500)


class Pay(BaseModel):
    simulate_fail: bool = False          # mô phỏng cổng thanh toán báo lỗi
