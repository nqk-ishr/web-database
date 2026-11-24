"""Cổng cán bộ đăng ký: danh sách hồ sơ (lọc, phân trang), duyệt hồ sơ, xử lý xe Báo mất."""
import datetime as dt
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.config import ADMIN, REGISTRAR
from app.core.pagination import PageParams, add_date_range, like, paginate
from app.core.security import need
from app.db.session import tx
from app.schemas.common import Note, Reason
from app.schemas.filters import RequestStatusF, RequestTypeF, Sort, direction
from app.schemas.registration import ApproveRequest
from app.services import registration as svc

router = APIRouter()

REQUEST_SELECT = """
    r.request_id, r.request_type, r.status, r.vehicle_id, ve.plate_number,
    r.declared_chassis_number, r.declared_engine_number, r.declared_manufacture_year,
    vt.name AS declared_vehicle_type,
    r.requester_id, rq.full_name AS requester_name,
    r.buyer_id, bu.full_name AS buyer_name,
    r.review_note, r.submitted_at, r.updated_at"""
REQUEST_FROM = """
    FROM registration_requests r
    LEFT JOIN vehicles ve      ON ve.vehicle_id = r.vehicle_id
    LEFT JOIN vehicle_types vt ON vt.vehicle_type_id = r.declared_vehicle_type_id
    JOIN users rq              ON rq.user_id = r.requester_id
    LEFT JOIN users bu         ON bu.user_id = r.buyer_id"""


@router.get("/requests")
def request_queue(status: RequestStatusF = "pending_approval",
                  request_type: Optional[RequestTypeF] = None,
                  search: Optional[str] = Query(None, alias="q", max_length=100,
                                                description="Biển số, số khung, số máy, tên/CCCD người gửi hoặc người mua"),
                  from_date: Optional[dt.date] = None, to_date: Optional[dt.date] = None,
                  sort: Sort = "oldest",
                  pg: PageParams = Depends(), u=Depends(need(REGISTRAR, ADMIN))):
    where, args = [], {}
    if status != "all":
        where.append("r.status = %(status)s")
        args["status"] = status
    if request_type:
        where.append("r.request_type = %(rtype)s")
        args["rtype"] = request_type
    if search:
        where.append("""(ve.plate_number ILIKE %(s)s OR r.declared_chassis_number ILIKE %(s)s
                         OR r.declared_engine_number ILIKE %(s)s OR rq.full_name ILIKE %(s)s
                         OR bu.full_name ILIKE %(s)s OR rq.citizen_id ILIKE %(s)s OR bu.citizen_id ILIKE %(s)s)""")
        args["s"] = like(search)
    add_date_range(where, args, "r.submitted_at", from_date, to_date)
    d = direction(sort)
    with tx() as cur:
        return paginate(cur, REQUEST_SELECT, REQUEST_FROM, where, args,
                        f"r.submitted_at {d}, r.request_id {d}", pg)


@router.post("/requests/{rid}/approve")
def approve_request(rid: int, b: ApproveRequest, u=Depends(need(REGISTRAR))):
    return svc.approve_request(rid, b, u)


@router.post("/requests/{rid}/reject")
def registrar_reject(rid: int, b: Note, u=Depends(need(REGISTRAR))):
    return svc.registrar_reject(rid, b, u)


@router.post("/requests/{rid}/request-info")
def registrar_request_info(rid: int, b: Note, u=Depends(need(REGISTRAR))):
    return svc.registrar_request_info(rid, b, u)


@router.post("/vehicles/{vid}/found")
def vehicle_found(vid: int, b: Reason, u=Depends(need(REGISTRAR))):
    return svc.vehicle_from_stolen(vid, "normal", "found", b.reason, u)


@router.post("/vehicles/{vid}/revoke")
def vehicle_revoke(vid: int, b: Reason, u=Depends(need(REGISTRAR))):
    return svc.vehicle_from_stolen(vid, "revoked", "revoked", b.reason, u)
