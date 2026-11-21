"""Cổng chủ xe, nghiệp vụ 2: xem vi phạm của mình và nộp phạt."""
from fastapi import APIRouter, Depends

from app.core.config import LATE_FEE_RATE, OWNER, TODAY
from app.core.security import need
from app.db.session import q, tx
from app.schemas.common import Pay
from app.services import violation as svc

router = APIRouter()


@router.get("/violations/mine")
def violations_mine(u=Depends(need(OWNER))):
    """Vi phạm do mình chịu phạt (đúng hình dạng frontend), kèm phạt trễ tính đến hôm nay."""
    with tx() as cur:
        return q(cur, f"""
            SELECT v.violation_id, v.occurred_at, v.status, v.fine_amount, v.due_date,
                   v.decision_number, v.vehicle_id,
                   v.plate_number_captured AS plate_number, t.description AS type,
                   (v.status = 'notified' AND v.due_date < {TODAY}) AS is_overdue,
                   CASE WHEN v.status = 'notified'
                        THEN ROUND(v.fine_amount * {LATE_FEE_RATE} * GREATEST(0, {TODAY} - v.due_date))
                        ELSE 0 END AS late_fee
            FROM violations v JOIN violation_types t USING (violation_type_id)
            WHERE v.liable_owner_id = %s ORDER BY v.occurred_at DESC""", (u["user_id"],))


@router.post("/violations/{vid}/pay")
def pay_violation(vid: int, b: Pay = Pay(), u=Depends(need(OWNER))):
    return svc.pay_violation(vid, b, u)
