"""Nghiệp vụ 2: vi phạm (phạt nguội) và nộp phạt. Mỗi hàm ghi dữ liệu là MỘT transaction."""
import datetime as dt

from fastapi import HTTPException

from app.core.config import LATE_FEE_RATE, TODAY, TZ
from app.db.session import found, q1, tx
from app.services.common import gateway_ref


def record_violation(b, u):
    """Camera ghi nhận: gắn xe theo biển số, người chịu phạt = chủ xe tại thời điểm vi phạm."""
    plate = b.plate_number.strip().upper()
    with tx() as cur:
        v = q1(cur, "SELECT vehicle_id FROM vehicles WHERE plate_number = %s", (plate,))
        vid = v["vehicle_id"] if v else None
        liable = q1(cur, "SELECT fn_owner_at(%s, %s) AS o", (vid, b.occurred_at))["o"] if vid else None
        return q1(cur, """INSERT INTO violations (vehicle_id, plate_number_captured, liable_owner_id,
                                                  violation_type_id, camera_id, occurred_at)
                          VALUES (%s, %s, %s, %s, %s, %s)
                          RETURNING violation_id, vehicle_id, liable_owner_id, status""",
                  (vid, plate, liable, b.violation_type_id, b.camera_id, b.occurred_at))


def verify_violation(vid, u):
    """Xác minh; trả về cảnh báo (không chặn) nếu xe Báo mất hoặc lỗi 'không có bảo hiểm'
    mà xe có hợp đồng hiệu lực."""
    with tx() as cur:
        v = found(q1(cur, """SELECT v.*, t.code AS type_code, ve.status AS vehicle_status
                             FROM violations v JOIN violation_types t USING (violation_type_id)
                             LEFT JOIN vehicles ve USING (vehicle_id)
                             WHERE v.violation_id = %s FOR UPDATE OF v""", (vid,)))
        if v["status"] != "recorded":
            raise HTTPException(409, f"Vi phạm đang ở trạng thái {v['status']}, không xác minh được")
        if v["vehicle_id"] is None or v["liable_owner_id"] is None:
            raise HTTPException(409, "Chưa xác định được xe hoặc chủ xe tại thời điểm vi phạm; hãy hủy vi phạm")
        warnings = []
        if v["vehicle_status"] == "stolen":
            warnings.append("Xe đang ở trạng thái Báo mất")
        if v["type_code"] == "NO_COMPULSORY_INSURANCE" and q1(cur, """
                SELECT 1 FROM insurance_policies
                WHERE vehicle_id = %s AND status = 'active'
                  AND (%s AT TIME ZONE %s)::date BETWEEN start_date AND end_date""",
                (v["vehicle_id"], v["occurred_at"], TZ)):
            warnings.append("Xe có hợp đồng bảo hiểm hiệu lực tại thời điểm vi phạm")
        cur.execute("""UPDATE violations SET status = 'verified', handled_by = %s, verified_at = now()
                       WHERE violation_id = %s""", (u["user_id"], vid))
    return {"violation_id": vid, "status": "verified", "warnings": warnings}


def notify_violation(vid, b, u):
    """Lập quyết định: chốt mức phạt (trigger kiểm tra nằm trong khung danh mục lỗi), số quyết định, hạn nộp."""
    with tx() as cur:
        v = found(q1(cur, "SELECT status FROM violations WHERE violation_id = %s FOR UPDATE", (vid,)))
        if v["status"] != "verified":
            raise HTTPException(409, f"Vi phạm đang ở trạng thái {v['status']}, không ra thông báo được")
        if b.due_date < dt.date.today():
            raise HTTPException(400, "Hạn nộp phải từ hôm nay trở đi")
        number = f"QD-{dt.date.today().year}-{vid:06d}"
        cur.execute("""UPDATE violations SET status = 'notified', fine_amount = %s, due_date = %s,
                              decision_number = %s, handled_by = %s, notified_at = now()
                       WHERE violation_id = %s""", (b.fine_amount, b.due_date, number, u["user_id"], vid))
    return {"violation_id": vid, "status": "notified", "decision_number": number}


def cancel_violation(vid, b, u):
    with tx() as cur:
        v = found(q1(cur, "SELECT status FROM violations WHERE violation_id = %s FOR UPDATE", (vid,)))
        if v["status"] not in ("recorded", "verified"):
            raise HTTPException(409, f"Vi phạm đang ở trạng thái {v['status']}, không hủy được")
        cur.execute("""UPDATE violations SET status = 'cancelled', cancelled_reason = %s, handled_by = %s
                       WHERE violation_id = %s""", (b.reason, u["user_id"], vid))
    return {"violation_id": vid, "status": "cancelled"}


def pay_violation(vid, b, u):
    """Nộp phạt (cổng mô phỏng). Khóa hàng vi phạm nên hai lần bấm đồng thời chỉ một lần thành công."""
    with tx() as cur:
        v = found(q1(cur, "SELECT * FROM violations WHERE violation_id = %s FOR UPDATE", (vid,)))
        if v["liable_owner_id"] != u["user_id"]:
            raise HTTPException(403, "Bạn không phải người chịu phạt của vi phạm này")
        if v["status"] != "notified":
            raise HTTPException(409, f"Vi phạm đang ở trạng thái {v['status']}, không nộp phạt được")
        late = q1(cur, f"SELECT ROUND(%s * {LATE_FEE_RATE} * GREATEST(0, {TODAY} - %s)) AS f",
                  (v["fine_amount"], v["due_date"]))["f"]
        status = "failed" if b.simulate_fail else "success"
        pay = q1(cur, """INSERT INTO payments (violation_id, paid_by, fine_amount, late_fee, status, gateway_ref)
                         VALUES (%s, %s, %s, %s, %s, %s)
                         RETURNING payment_id, total_amount, status, gateway_ref""",
                 (vid, u["user_id"], v["fine_amount"], late, status, gateway_ref("TXN")))
        if status == "success":
            cur.execute("UPDATE violations SET status = 'paid' WHERE violation_id = %s", (vid,))
    return {**pay, "violation_status": "paid" if status == "success" else "notified"}
