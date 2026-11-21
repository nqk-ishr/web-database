"""Danh mục dùng cho form (loại xe, loại lỗi, camera) và tra cứu người nhận sang tên."""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import ADMIN, OWNER, VIOLATION
from app.core.security import current_user, need
from app.db.session import q, q1, tx

router = APIRouter(tags=["catalog"])


@router.get("/catalog/vehicle-types")
def vehicle_types(u=Depends(current_user)):
    with tx() as cur:
        return q(cur, "SELECT vehicle_type_id, name, usage_purpose FROM vehicle_types ORDER BY name, usage_purpose")


@router.get("/catalog/violation-types")
def violation_types(u=Depends(need(VIOLATION, ADMIN))):
    with tx() as cur:
        return q(cur, """SELECT violation_type_id, code, description, min_fine, max_fine
                         FROM violation_types WHERE is_active ORDER BY violation_type_id""")


@router.get("/catalog/cameras")
def cameras(u=Depends(need(VIOLATION, ADMIN))):
    with tx() as cur:
        return q(cur, "SELECT camera_id, code, location_name FROM cameras ORDER BY camera_id")


@router.get("/users/lookup")
def lookup_buyer(citizen_id: str = Query(pattern=r"^[0-9]{9,12}$"), u=Depends(need(OWNER))):
    """Tìm người mua theo CCCD khi tạo hồ sơ sang tên. Chỉ trả mã và tên, không lộ dữ liệu khác."""
    with tx() as cur:
        row = q1(cur, """SELECT u.user_id, u.full_name FROM users u JOIN roles r USING (role_id)
                         WHERE u.citizen_id = %s AND r.code = 'owner' AND u.is_active""", (citizen_id,))
    if not row or row["user_id"] == u["user_id"]:
        raise HTTPException(404, "Không tìm thấy chủ xe với số CCCD này")
    return row
