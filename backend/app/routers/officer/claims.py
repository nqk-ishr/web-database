"""Cổng nhân viên bảo hiểm: thẩm định và chi trả yêu cầu bồi thường."""
from fastapi import APIRouter, Depends

from app.core.config import INSURANCE
from app.core.security import need
from app.db.session import q, tx
from app.schemas.common import Note
from app.schemas.insurance import ApproveClaim
from app.services import insurance as svc

router = APIRouter()


@router.get("/claims")
def claim_queue(status: str = "pending_review", u=Depends(need(INSURANCE))):
    with tx() as cur:
        return q(cur, """SELECT c.* FROM insurance_claims c
                         JOIN insurance_policies po USING (policy_id)
                         JOIN insurance_products pr USING (product_id)
                         WHERE c.status = %s AND pr.insurer_id = %s ORDER BY c.created_at""",
                 (status, u["insurer_id"]))


@router.post("/claims/{cid}/approve")
def approve_claim(cid: int, b: ApproveClaim, u=Depends(need(INSURANCE))):
    return svc.approve_claim(cid, b, u)


@router.post("/claims/{cid}/reject")
def reject_claim(cid: int, b: Note, u=Depends(need(INSURANCE))):
    return svc.reject_claim(cid, b, u)


@router.post("/claims/{cid}/request-info")
def claim_request_info(cid: int, b: Note, u=Depends(need(INSURANCE))):
    return svc.claim_request_info(cid, b, u)


@router.post("/claims/{cid}/pay")
def pay_claim(cid: int, u=Depends(need(INSURANCE))):
    return svc.pay_claim(cid, u)
