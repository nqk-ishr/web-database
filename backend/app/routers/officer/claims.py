"""Cổng nhân viên bảo hiểm: danh sách (lọc, phân trang), thẩm định và chi trả yêu cầu bồi thường."""
import datetime as dt
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.config import ADMIN, INSURANCE
from app.core.pagination import PageParams, add_date_range, like, paginate
from app.core.security import need
from app.db.session import tx
from app.schemas.common import Note
from app.schemas.filters import ClaimStatusF, ClaimTypeF, Sort, direction
from app.schemas.insurance import ApproveClaim
from app.services import insurance as svc

router = APIRouter()

CLAIM_SELECT = """
    c.claim_id, c.policy_id, po.certificate_code, ve.plate_number,
    c.claim_type, c.status, c.requested_amount, c.approved_amount, c.event_time,
    c.claimant_id, cl.full_name AS claimant_name, i.name AS insurer,
    c.created_at, c.updated_at"""
CLAIM_FROM = """
    FROM insurance_claims c
    JOIN insurance_policies po ON po.policy_id = c.policy_id
    JOIN insurance_products pr ON pr.product_id = po.product_id
    JOIN insurers i            ON i.insurer_id = pr.insurer_id
    JOIN vehicles ve           ON ve.vehicle_id = po.vehicle_id
    JOIN users cl              ON cl.user_id = c.claimant_id"""


@router.get("/claims")
def claim_queue(status: ClaimStatusF = "pending_review",
                claim_type: Optional[ClaimTypeF] = None,
                search: Optional[str] = Query(None, alias="q", max_length=100,
                                              description="Biển số, mã giấy chứng nhận, tên người yêu cầu"),
                from_date: Optional[dt.date] = None, to_date: Optional[dt.date] = None,
                sort: Sort = "oldest",
                pg: PageParams = Depends(), u=Depends(need(INSURANCE, ADMIN))):
    """Nhân viên bảo hiểm chỉ thấy yêu cầu thuộc công ty mình; quản trị thấy tất cả."""
    where, args = [], {}
    if u["role"] == INSURANCE:
        where.append("pr.insurer_id = %(ins)s")        # insurer_id NULL => không khớp dòng nào (an toàn)
        args["ins"] = u["insurer_id"]
    if status != "all":
        where.append("c.status = %(status)s")
        args["status"] = status
    if claim_type:
        where.append("c.claim_type = %(ctype)s")
        args["ctype"] = claim_type
    if search:
        where.append("(ve.plate_number ILIKE %(s)s OR po.certificate_code ILIKE %(s)s OR cl.full_name ILIKE %(s)s)")
        args["s"] = like(search)
    add_date_range(where, args, "c.created_at", from_date, to_date)
    d = direction(sort)
    with tx() as cur:
        return paginate(cur, CLAIM_SELECT, CLAIM_FROM, where, args, f"c.created_at {d}, c.claim_id {d}", pg)


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
