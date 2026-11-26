"""Xem chi tiết một hồ sơ / vi phạm / yêu cầu bồi thường / hợp đồng.

Mỗi endpoint dùng chung cho chủ xe và cán bộ, phạm vi dữ liệu theo vai trò:
  * chủ xe: chỉ bản ghi của chính mình;
  * nhân viên bảo hiểm: chỉ bản ghi thuộc công ty bảo hiểm của mình;
  * cán bộ đăng ký / xử lý vi phạm / quản trị: theo quyền của nghiệp vụ.
Bản ghi ngoài phạm vi trả 404 (không phải 403) để không lộ việc bản ghi có tồn tại.
"""
from fastapi import APIRouter, Depends

from app.core.config import ADMIN, INSURANCE, LATE_FEE_RATE, OWNER, REGISTRAR, TODAY, VIOLATION
from app.core.security import need
from app.db.session import found, q, q1, tx

router = APIRouter(tags=["details"])


@router.get("/requests/{rid}")
def request_detail(rid: int, u=Depends(need(OWNER, REGISTRAR, ADMIN))):
    with tx() as cur:
        r = found(q1(cur, """
            SELECT r.*, ve.plate_number, vt.name AS declared_vehicle_type,
                   rq.full_name AS requester_name, bu.full_name AS buyer_name, rv.full_name AS reviewer_name,
                   (SELECT count(*) FROM violations x
                     WHERE x.vehicle_id = r.vehicle_id AND x.status IN ('verified', 'notified'))::int AS unpaid_violations
            FROM registration_requests r
            LEFT JOIN vehicles ve      ON ve.vehicle_id = r.vehicle_id
            LEFT JOIN vehicle_types vt ON vt.vehicle_type_id = r.declared_vehicle_type_id
            JOIN users rq              ON rq.user_id = r.requester_id
            LEFT JOIN users bu         ON bu.user_id = r.buyer_id
            LEFT JOIN users rv         ON rv.user_id = r.reviewer_id
            WHERE r.request_id = %s""", (rid,)), "Không tìm thấy hồ sơ")
        if u["role"] == OWNER and u["user_id"] not in (r["requester_id"], r["buyer_id"]):
            found(None, "Không tìm thấy hồ sơ")
        r["history"] = q(cur, """SELECT h.history_id, h.event_type, h.old_status, h.new_status, h.reason,
                                        h.changed_at, a.full_name AS actor_name
                                 FROM vehicle_status_history h LEFT JOIN users a ON a.user_id = h.actor_id
                                 WHERE h.request_id = %s ORDER BY h.changed_at""", (rid,))
        return r


@router.get("/violations/{vid}")
def violation_detail(vid: int, u=Depends(need(OWNER, VIOLATION, ADMIN))):
    """Lưu ý: /violations/mine được khai báo trước (xem routers/__init__.py)."""
    with tx() as cur:
        v = found(q1(cur, f"""
            SELECT v.*, vt.code AS violation_code, vt.description AS violation_type,
                   vt.min_fine, vt.max_fine, c.code AS camera_code, c.location_name,
                   ve.plate_number, ve.status AS vehicle_status,
                   ow.full_name AS liable_owner, hd.full_name AS handled_by_name,
                   (v.status = 'notified' AND v.due_date < {TODAY}) AS is_overdue,
                   CASE WHEN v.status = 'notified'
                        THEN ROUND(v.fine_amount * {LATE_FEE_RATE} * GREATEST(0, {TODAY} - v.due_date))
                        ELSE 0 END AS late_fee
            FROM violations v
            JOIN violation_types vt ON vt.violation_type_id = v.violation_type_id
            JOIN cameras c          ON c.camera_id = v.camera_id
            LEFT JOIN vehicles ve   ON ve.vehicle_id = v.vehicle_id
            LEFT JOIN users ow      ON ow.user_id = v.liable_owner_id
            LEFT JOIN users hd      ON hd.user_id = v.handled_by
            WHERE v.violation_id = %s""", (vid,)), "Không tìm thấy vi phạm")
        if u["role"] == OWNER and v["liable_owner_id"] != u["user_id"]:
            found(None, "Không tìm thấy vi phạm")
        v["payments"] = q(cur, """SELECT payment_id, fine_amount, late_fee, total_amount, status,
                                         gateway_ref, created_at, paid_at
                                  FROM payments WHERE violation_id = %s ORDER BY created_at""", (vid,))
        return v


def _insurer_scope(u):
    """Điều kiện SQL + tham số giới hạn theo công ty bảo hiểm (chỉ áp dụng cho nhân viên bảo hiểm)."""
    if u["role"] == INSURANCE:
        return " AND pr.insurer_id = %(ins)s", {"ins": u["insurer_id"]}
    return "", {}


@router.get("/claims/{cid}")
def claim_detail(cid: int, u=Depends(need(OWNER, INSURANCE, ADMIN))):
    scope, args = _insurer_scope(u)
    if u["role"] == OWNER:
        scope, args = " AND c.claimant_id = %(uid)s", {"uid": u["user_id"]}
    with tx() as cur:
        return found(q1(cur, f"""
            SELECT c.*, po.certificate_code, po.vehicle_id, ve.plate_number,
                   po.liability_limit, po.includes_theft, po.start_date AS policy_start, po.end_date AS policy_end,
                   pr.name AS product_name, i.name AS insurer,
                   cl.full_name AS claimant_name, rv.full_name AS reviewer_name
            FROM insurance_claims c
            JOIN insurance_policies po ON po.policy_id = c.policy_id
            JOIN insurance_products pr ON pr.product_id = po.product_id
            JOIN insurers i            ON i.insurer_id = pr.insurer_id
            JOIN vehicles ve           ON ve.vehicle_id = po.vehicle_id
            JOIN users cl              ON cl.user_id = c.claimant_id
            LEFT JOIN users rv         ON rv.user_id = c.reviewer_id
            WHERE c.claim_id = %(cid)s{scope}""", {"cid": cid, **args}), "Không tìm thấy yêu cầu bồi thường")


@router.get("/policies/{pid}")
def policy_detail(pid: int, u=Depends(need(OWNER, INSURANCE, ADMIN))):
    scope, args = _insurer_scope(u)
    if u["role"] == OWNER:
        scope, args = " AND po.buyer_id = %(uid)s", {"uid": u["user_id"]}
    with tx() as cur:
        p = found(q1(cur, f"""
            SELECT po.*, (po.status = 'active' AND po.end_date < {TODAY}) AS is_expired,
                   pr.name AS product_name, pr.term_months, i.name AS insurer,
                   ve.plate_number, bu.full_name AS buyer_name
            FROM insurance_policies po
            JOIN insurance_products pr ON pr.product_id = po.product_id
            JOIN insurers i            ON i.insurer_id = pr.insurer_id
            JOIN vehicles ve           ON ve.vehicle_id = po.vehicle_id
            JOIN users bu              ON bu.user_id = po.buyer_id
            WHERE po.policy_id = %(pid)s{scope}""", {"pid": pid, **args}), "Không tìm thấy hợp đồng")
        p["payments"] = q(cur, """SELECT policy_payment_id, amount, status, gateway_ref, created_at, paid_at
                                  FROM policy_payments WHERE policy_id = %s ORDER BY created_at""", (pid,))
        p["claims"] = q(cur, """SELECT claim_id, claim_type, status, requested_amount, approved_amount, created_at
                                FROM insurance_claims WHERE policy_id = %s ORDER BY created_at DESC""", (pid,))
        return p
