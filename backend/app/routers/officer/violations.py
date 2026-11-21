"""Cổng cán bộ xử lý vi phạm: ghi nhận, danh sách (lọc, phân trang), xác minh, ra quyết định, hủy."""
import datetime as dt
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.config import ADMIN, TODAY, VIOLATION
from app.core.pagination import PageParams, add_date_range, like, paginate
from app.core.security import need
from app.db.session import tx
from app.schemas.common import Reason
from app.schemas.filters import Sort, ViolationStatusF, direction
from app.schemas.violation import NewViolation, Notice
from app.services import violation as svc

router = APIRouter()

VIOLATION_SELECT = f"""
    v.violation_id, v.status, v.occurred_at, v.plate_number_captured, v.vehicle_id,
    vt.code AS violation_code, vt.description AS violation_type,
    v.camera_id, c.location_name,
    v.liable_owner_id, ow.full_name AS liable_owner,
    v.fine_amount, v.decision_number, v.due_date,
    (v.status = 'notified' AND v.due_date < {TODAY}) AS is_overdue,
    (v.vehicle_id IS NULL) AS unmatched"""
VIOLATION_FROM = """
    FROM violations v
    JOIN violation_types vt ON vt.violation_type_id = v.violation_type_id
    JOIN cameras c          ON c.camera_id = v.camera_id
    LEFT JOIN users ow      ON ow.user_id = v.liable_owner_id"""


@router.post("/violations", status_code=201)
def record_violation(b: NewViolation, u=Depends(need(VIOLATION))):
    return svc.record_violation(b, u)


@router.get("/violations")
def violation_queue(status: ViolationStatusF = "recorded",
                    violation_type_id: Optional[int] = None, camera_id: Optional[int] = None,
                    plate: Optional[str] = Query(None, max_length=15, description="Biển số (chứa)"),
                    overdue: bool = Query(False, description="Chỉ vi phạm đã thông báo và quá hạn nộp"),
                    unmatched: bool = Query(False, description="Chỉ vi phạm có biển số không khớp xe nào"),
                    from_date: Optional[dt.date] = None, to_date: Optional[dt.date] = None,
                    sort: Sort = "oldest",
                    pg: PageParams = Depends(), u=Depends(need(VIOLATION, ADMIN))):
    where, args = [], {}
    if status != "all":
        where.append("v.status = %(status)s")
        args["status"] = status
    if violation_type_id:
        where.append("v.violation_type_id = %(vtype)s")
        args["vtype"] = violation_type_id
    if camera_id:
        where.append("v.camera_id = %(cam)s")
        args["cam"] = camera_id
    if plate:
        where.append("v.plate_number_captured ILIKE %(plate)s")
        args["plate"] = like(plate)
    if overdue:
        where.append(f"(v.status = 'notified' AND v.due_date < {TODAY})")
    if unmatched:
        where.append("v.vehicle_id IS NULL")
    add_date_range(where, args, "v.occurred_at", from_date, to_date)
    d = direction(sort)
    with tx() as cur:
        return paginate(cur, VIOLATION_SELECT, VIOLATION_FROM, where, args,
                        f"v.occurred_at {d}, v.violation_id {d}", pg)


@router.post("/violations/{vid}/verify")
def verify_violation(vid: int, u=Depends(need(VIOLATION))):
    return svc.verify_violation(vid, u)


@router.post("/violations/{vid}/notify")
def notify_violation(vid: int, b: Notice, u=Depends(need(VIOLATION))):
    return svc.notify_violation(vid, b, u)


@router.post("/violations/{vid}/cancel")
def cancel_violation(vid: int, b: Reason, u=Depends(need(VIOLATION))):
    return svc.cancel_violation(vid, b, u)
