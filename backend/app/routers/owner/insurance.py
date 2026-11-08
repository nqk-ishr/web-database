"""Cổng chủ xe, nghiệp vụ 3: mua bảo hiểm và yêu cầu bồi thường."""
from typing import Optional

from fastapi import APIRouter, Depends

from app.core.config import OWNER
from app.core.security import need
from app.schemas.common import Pay, Reason
from app.schemas.insurance import NewClaim, NewPolicy, Supplement
from app.services import insurance as svc

router = APIRouter()


@router.post("/policies", status_code=201)
def buy_policy(b: NewPolicy, u=Depends(need(OWNER))):
    return svc.buy_policy(b, u)


@router.post("/policies/{pid}/pay")
def pay_policy(pid: int, b: Pay = Pay(), u=Depends(need(OWNER))):
    return svc.pay_policy(pid, b, u)


@router.post("/policies/{pid}/cancel")
def cancel_policy(pid: int, u=Depends(need(OWNER))):
    return svc.cancel_policy(pid, u)


@router.post("/claims", status_code=201)
def submit_claim(b: NewClaim, u=Depends(need(OWNER))):
    return svc.submit_claim(b, u)


@router.post("/claims/{cid}/cancel")
def claimant_withdraw(cid: int, b: Optional[Reason] = None, u=Depends(need(OWNER))):
    return svc.claimant_withdraw(cid, b, u)


@router.post("/claims/{cid}/supplement")
def claimant_supplement(cid: int, b: Supplement = Supplement(), u=Depends(need(OWNER))):
    return svc.claimant_supplement(cid, b, u)
