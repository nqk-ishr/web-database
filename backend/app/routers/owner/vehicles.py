"""Cổng chủ xe: danh sách và chi tiết xe, lịch sử sở hữu (đường dẫn khớp frontend)."""
from fastapi import APIRouter, Depends, HTTPException

from app.core.config import ADMIN, OWNER, REGISTRAR, VIOLATION
from app.core.security import need
from app.db.session import found, q, q1, tx

router = APIRouter(tags=["vehicles"])

# Thông tin xe + hợp đồng bảo hiểm mới nhất còn hiệu lực/đang chờ + số vi phạm chưa nộp (đã thông báo)
VEHICLE_SQL = """
SELECT v.vehicle_id, v.plate_number, v.status, v.manufacture_year,
       v.chassis_number, v.engine_number, vt.name AS vehicle_type,
       (SELECT count(*) FROM violations x
         WHERE x.vehicle_id = v.vehicle_id AND x.status = 'notified'
           AND (%(uid)s::bigint IS NULL OR x.liable_owner_id = %(uid)s))::int AS unpaid_violations,
       -- Vi phạm chặn sang tên (khớp fn_assert_transfer_allowed): đã xác minh HOẶC đã thông báo, chưa nộp
       (SELECT count(*) FROM violations x
         WHERE x.vehicle_id = v.vehicle_id AND x.status IN ('verified', 'notified')
           AND (%(uid)s::bigint IS NULL OR x.liable_owner_id = %(uid)s))::int AS blocking_violations,
       (SELECT us.full_name FROM ownership_history oh JOIN users us ON us.user_id = oh.owner_id
         WHERE oh.vehicle_id = v.vehicle_id AND oh.valid_to IS NULL) AS current_owner,
       (SELECT json_build_object('policy_id', po.policy_id, 'status', po.status, 'product_name', pr.name,
                                 'start_date', po.start_date, 'end_date', po.end_date,
                                 'liability_limit', po.liability_limit,
                                 'includes_theft', po.includes_theft)
          FROM insurance_policies po JOIN insurance_products pr USING (product_id)
         WHERE po.vehicle_id = v.vehicle_id AND po.status IN ('active', 'pending_payment')
         ORDER BY po.end_date DESC LIMIT 1) AS policy
FROM vehicles v JOIN vehicle_types vt USING (vehicle_type_id)
"""


def _check_access(cur, vid, u):
    """Chủ xe chỉ xem xe mình đang sở hữu; cán bộ/quản trị xem được mọi xe.
    Trả 404 (không phải 403) để không lộ việc xe có tồn tại hay không."""
    if u["role"] == OWNER and not q1(cur, """SELECT 1 FROM ownership_history
                                              WHERE vehicle_id = %s AND owner_id = %s AND valid_to IS NULL""",
                                     (vid, u["user_id"])):
        raise HTTPException(404, "Không tìm thấy xe")


@router.get("/vehicles/mine")
def vehicles_mine(u=Depends(need(OWNER))):
    with tx() as cur:
        return q(cur, VEHICLE_SQL + """
                 WHERE v.vehicle_id IN (SELECT vehicle_id FROM ownership_history
                                        WHERE owner_id = %(uid)s AND valid_to IS NULL)
                 ORDER BY v.vehicle_id""", {"uid": u["user_id"]})


@router.get("/vehicles/{vid}")
def vehicle_detail(vid: int, u=Depends(need(OWNER, REGISTRAR, VIOLATION, ADMIN))):
    with tx() as cur:
        _check_access(cur, vid, u)
        # Chủ xe: đếm vi phạm của chính mình; cán bộ: đếm mọi vi phạm chưa nộp của xe
        uid = u["user_id"] if u["role"] == OWNER else None
        return found(q1(cur, VEHICLE_SQL + " WHERE v.vehicle_id = %(vid)s",
                        {"uid": uid, "vid": vid}), "Không tìm thấy xe")


@router.get("/vehicles/{vid}/ownership")
def vehicle_ownership(vid: int, u=Depends(need(OWNER, REGISTRAR, VIOLATION, ADMIN))):
    with tx() as cur:
        _check_access(cur, vid, u)
        return q(cur, """SELECT oh.ownership_id, us.full_name AS owner_name, oh.valid_from, oh.valid_to
                         FROM ownership_history oh JOIN users us ON us.user_id = oh.owner_id
                         WHERE oh.vehicle_id = %s ORDER BY oh.valid_from DESC""", (vid,))


@router.get("/vehicles/{vid}/history")
def vehicle_status_history(vid: int, u=Depends(need(OWNER, REGISTRAR, VIOLATION, ADMIN))):
    """Lịch sử sự kiện của xe: đăng ký, sang tên, báo mất, tìm thấy, thu hồi."""
    with tx() as cur:
        _check_access(cur, vid, u)
        found(q1(cur, "SELECT 1 FROM vehicles WHERE vehicle_id = %s", (vid,)), "Không tìm thấy xe")
        return q(cur, """SELECT h.history_id, h.event_type, h.old_status, h.new_status, h.reason,
                                h.request_id, h.claim_id, h.changed_at, a.full_name AS actor_name
                         FROM vehicle_status_history h LEFT JOIN users a ON a.user_id = h.actor_id
                         WHERE h.vehicle_id = %s ORDER BY h.changed_at DESC, h.history_id DESC""", (vid,))
