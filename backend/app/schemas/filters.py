"""Giá trị hợp lệ cho tham số lọc (sai giá trị => 422 thay vì lỗi 500 từ PostgreSQL)."""
from typing import Literal

RequestStatusF = Literal["all", "pending_confirmation", "pending_approval", "needs_more_info",
                         "approved", "rejected", "cancelled"]
RequestTypeF = Literal["new_registration", "transfer"]
ViolationStatusF = Literal["all", "recorded", "verified", "notified", "paid", "cancelled"]
ClaimStatusF = Literal["all", "pending_review", "needs_more_info", "approved", "rejected", "paid", "cancelled"]
ClaimTypeF = Literal["accident", "theft"]
VehicleStatusF = Literal["normal", "stolen", "revoked"]
Sort = Literal["oldest", "newest"]


def direction(sort: str) -> str:
    return "DESC" if sort == "newest" else "ASC"
