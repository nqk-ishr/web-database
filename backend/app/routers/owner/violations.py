"""Cổng chủ xe, nghiệp vụ 2: nộp phạt."""
from fastapi import APIRouter, Depends

from app.core.config import OWNER
from app.core.security import need
from app.schemas.common import Pay
from app.services import violation as svc

router = APIRouter()


@router.post("/violations/{vid}/pay")
def pay_violation(vid: int, b: Pay = Pay(), u=Depends(need(OWNER))):
    return svc.pay_violation(vid, b, u)
