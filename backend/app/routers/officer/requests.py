"""Cổng cán bộ đăng ký: duyệt hồ sơ, xử lý xe Báo mất."""
from fastapi import APIRouter, Depends

from app.core.config import REGISTRAR
from app.core.security import need
from app.db.session import q, tx
from app.schemas.common import Note, Reason
from app.schemas.registration import ApproveRequest
from app.services import registration as svc

router = APIRouter()


@router.get("/requests")
def request_queue(status: str = "pending_approval", u=Depends(need(REGISTRAR))):
    with tx() as cur:
        return q(cur, "SELECT * FROM registration_requests WHERE status = %s ORDER BY submitted_at", (status,))


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
