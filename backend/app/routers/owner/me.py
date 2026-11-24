"""Cổng chủ xe: tra cứu dữ liệu của chính mình và danh mục gói bảo hiểm."""
from fastapi import APIRouter, Depends

from app.core.config import LATE_FEE_RATE, OWNER, TODAY
from app.core.security import need
from app.routers.officer.requests import REQUEST_FROM, REQUEST_SELECT
from app.db.session import q, tx

router = APIRouter()


@router.get("/me/vehicles")
def my_vehicles(u=Depends(need(OWNER))):
    with tx() as cur:
        return q(cur, """SELECT v.vehicle_id, v.plate_number, v.status, v.manufacture_year,
                                vt.name AS vehicle_type, oh.valid_from AS owned_since
                         FROM ownership_history oh
                         JOIN vehicles v USING (vehicle_id)
                         JOIN vehicle_types vt USING (vehicle_type_id)
                         WHERE oh.owner_id = %s AND oh.valid_to IS NULL
                         ORDER BY v.vehicle_id""", (u["user_id"],))


@router.get("/me/requests")
def my_requests(u=Depends(need(OWNER))):
    """Hồ sơ tôi gửi hoặc tôi là bên mua, kèm biển số, tên các bên và ghi chú của cán bộ."""
    with tx() as cur:
        return q(cur, f"""SELECT {REQUEST_SELECT} {REQUEST_FROM}
                          WHERE r.requester_id = %(uid)s OR r.buyer_id = %(uid)s
                          ORDER BY r.submitted_at DESC, r.request_id DESC""", {"uid": u["user_id"]})


@router.get("/me/violations")
def my_violations(u=Depends(need(OWNER))):
    """Vi phạm do mình chịu phạt, kèm phạt trễ tính đến hôm nay (suy ra, không lưu)."""
    with tx() as cur:
        return q(cur, f"""
            SELECT v.violation_id, v.plate_number_captured, t.description, v.occurred_at, v.status,
                   v.fine_amount, v.decision_number, v.due_date,
                   (v.status = 'notified' AND v.due_date < {TODAY}) AS is_overdue,
                   CASE WHEN v.status = 'notified'
                        THEN ROUND(v.fine_amount * {LATE_FEE_RATE} * GREATEST(0, {TODAY} - v.due_date))
                        ELSE 0 END AS late_fee
            FROM violations v JOIN violation_types t USING (violation_type_id)
            WHERE v.liable_owner_id = %s ORDER BY v.occurred_at DESC""", (u["user_id"],))


@router.get("/me/policies")
def my_policies(u=Depends(need(OWNER))):
    with tx() as cur:
        return q(cur, f"""
            SELECT po.*, pr.name AS product_name, pr.term_months, i.name AS insurer, ve.plate_number,
                   (po.status = 'active' AND po.end_date < {TODAY}) AS is_expired
            FROM insurance_policies po
            JOIN insurance_products pr USING (product_id)
            JOIN insurers i ON i.insurer_id = pr.insurer_id
            JOIN vehicles ve USING (vehicle_id)
            WHERE po.buyer_id = %s ORDER BY po.created_at DESC""", (u["user_id"],))


@router.get("/me/claims")
def my_claims(u=Depends(need(OWNER))):
    with tx() as cur:
        return q(cur, """SELECT c.claim_id, c.policy_id, c.claim_type, c.status, c.event_time, c.event_location,
                                c.requested_amount, c.approved_amount, c.review_note, c.cancel_reason, c.paid_at,
                                c.created_at, c.updated_at, po.certificate_code, po.vehicle_id, ve.plate_number,
                                pr.name AS product_name, i.name AS insurer
                         FROM insurance_claims c
                         JOIN insurance_policies po ON po.policy_id = c.policy_id
                         JOIN insurance_products pr ON pr.product_id = po.product_id
                         JOIN insurers i            ON i.insurer_id = pr.insurer_id
                         JOIN vehicles ve           ON ve.vehicle_id = po.vehicle_id
                         WHERE c.claimant_id = %s ORDER BY c.created_at DESC, c.claim_id DESC""", (u["user_id"],))


@router.get("/insurance/products")
def products_for_vehicle(vehicle_id: int, u=Depends(need(OWNER))):
    with tx() as cur:
        return q(cur, """SELECT p.product_id, i.name AS insurer, p.name, p.premium, p.term_months,
                                p.liability_limit, p.includes_theft
                         FROM insurance_products p
                         JOIN insurers i USING (insurer_id)
                         JOIN vehicles v ON v.vehicle_type_id = p.vehicle_type_id
                         WHERE v.vehicle_id = %s AND p.is_active AND i.is_active
                         ORDER BY i.name, p.premium""", (vehicle_id,))
