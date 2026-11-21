"""Cổng cán bộ xử lý vi phạm: ghi nhận, xác minh, ra quyết định, hủy."""
from fastapi import APIRouter, Depends

from app.core.config import VIOLATION
from app.core.security import need
from app.db.session import q, tx
from app.schemas.common import Reason
from app.schemas.violation import NewViolation, Notice
from app.services import violation as svc

router = APIRouter()


@router.post("/violations", status_code=201)
def record_violation(b: NewViolation, u=Depends(need(VIOLATION))):
    return svc.record_violation(b, u)


@router.get("/violations")
def violation_queue(status: str = "recorded", u=Depends(need(VIOLATION))):
    with tx() as cur:
        return q(cur, "SELECT * FROM violations WHERE status = %s ORDER BY occurred_at", (status,))


@router.post("/violations/{vid}/verify")
def verify_violation(vid: int, u=Depends(need(VIOLATION))):
    return svc.verify_violation(vid, u)


@router.post("/violations/{vid}/notify")
def notify_violation(vid: int, b: Notice, u=Depends(need(VIOLATION))):
    return svc.notify_violation(vid, b, u)


@router.post("/violations/{vid}/cancel")
def cancel_violation(vid: int, b: Reason, u=Depends(need(VIOLATION))):
    return svc.cancel_violation(vid, b, u)
