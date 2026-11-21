"""Cổng chủ xe, nghiệp vụ 1: gửi, xác nhận, rút hồ sơ đăng ký và sang tên."""
from typing import Optional

from fastapi import APIRouter, Depends

from app.core.config import OWNER
from app.core.security import need
from app.schemas.common import Reason
from app.schemas.registration import NewRegistration, Transfer
from app.services import registration as svc

router = APIRouter()


@router.post("/requests/registration", status_code=201)
def submit_registration(b: NewRegistration, u=Depends(need(OWNER))):
    return svc.submit_registration(b, u)


@router.post("/requests/transfer", status_code=201)
def submit_transfer(b: Transfer, u=Depends(need(OWNER))):
    return svc.submit_transfer(b, u)


@router.post("/requests/{rid}/confirm")
def buyer_confirm(rid: int, u=Depends(need(OWNER))):
    return svc.buyer_confirm(rid, u)


@router.post("/requests/{rid}/decline")
def buyer_decline(rid: int, u=Depends(need(OWNER))):
    return svc.buyer_decline(rid, u)


@router.post("/requests/{rid}/cancel")
def requester_withdraw(rid: int, b: Optional[Reason] = None, u=Depends(need(OWNER))):
    return svc.requester_withdraw(rid, b, u)


@router.post("/requests/{rid}/resubmit")
def requester_resubmit(rid: int, u=Depends(need(OWNER))):
    return svc.requester_resubmit(rid, u)
