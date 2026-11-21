"""Nghiệp vụ 3: bảo hiểm (mua, gia hạn, bồi thường). Mỗi hàm ghi dữ liệu là MỘT transaction."""
import datetime as dt

from fastapi import HTTPException

from app.core.config import OPEN_REQUEST
from app.db.session import found, q1, tx
from app.services.common import gateway_ref, log_vehicle


# ----- hợp đồng ------------------------------------------------------
def buy_policy(b, u):
    """Tạo hợp đồng Chờ thanh toán. Gia hạn = mua hợp đồng mới có start_date liền sau end_date hợp đồng cũ.
    Trigger kiểm tra gói đúng loại xe, xe Bình thường, người mua là chủ hiện hành;
    phí/hạn mức/end_date do trigger điền."""
    if b.start_date < dt.date.today():
        raise HTTPException(400, "Ngày bắt đầu không được ở quá khứ")
    with tx() as cur:
        return q1(cur, """INSERT INTO insurance_policies (vehicle_id, product_id, buyer_id, start_date)
                          VALUES (%s, %s, %s, %s)
                          RETURNING policy_id, status, start_date, end_date, premium""",
                  (b.vehicle_id, b.product_id, u["user_id"], b.start_date))


def pay_policy(pid, b, u):
    """Thanh toán phí: INSERT policy_payments (success) -> UPDATE hợp đồng thành Hiệu lực.
    Nếu kích hoạt bị chặn (chồng hiệu lực) thì rollback cả giao dịch thanh toán."""
    with tx() as cur:
        p = found(q1(cur, "SELECT * FROM insurance_policies WHERE policy_id = %s FOR UPDATE", (pid,)))
        if p["buyer_id"] != u["user_id"]:
            raise HTTPException(403, "Bạn không phải người mua hợp đồng này")
        if p["status"] != "pending_payment":
            raise HTTPException(409, f"Hợp đồng đang ở trạng thái {p['status']}, không thanh toán được")
        status = "failed" if b.simulate_fail else "success"
        pay = q1(cur, """INSERT INTO policy_payments (policy_id, paid_by, amount, status, gateway_ref)
                         VALUES (%s, %s, %s, %s, %s) RETURNING policy_payment_id, amount, status, gateway_ref""",
                 (pid, u["user_id"], p["premium"], status, gateway_ref("PAY")))
        cert = None
        if status == "success":
            cert = q1(cur, """UPDATE insurance_policies SET status = 'active' WHERE policy_id = %s
                              RETURNING certificate_code""", (pid,))["certificate_code"]
    return {**pay, "policy_status": "active" if status == "success" else "pending_payment",
            "certificate_code": cert}


def cancel_policy(pid, u):
    """Chỉ hủy được hợp đồng còn Chờ thanh toán (hợp đồng đã hiệu lực không hủy/hoàn phí)."""
    with tx() as cur:
        p = found(q1(cur, "SELECT buyer_id, status FROM insurance_policies WHERE policy_id = %s FOR UPDATE", (pid,)))
        if p["buyer_id"] != u["user_id"]:
            raise HTTPException(403, "Bạn không phải người mua hợp đồng này")
        if p["status"] != "pending_payment":
            raise HTTPException(409, "Chỉ hủy được hợp đồng đang Chờ thanh toán")
        cur.execute("UPDATE insurance_policies SET status = 'cancelled' WHERE policy_id = %s", (pid,))
    return {"policy_id": pid, "status": "cancelled"}


# ----- yêu cầu bồi thường: phía chủ xe ------------------------------
def submit_claim(b, u):
    """Trigger kiểm tra: hợp đồng Hiệu lực, sự kiện trong hiệu lực và không ở tương lai,
    người yêu cầu là chủ xe tại thời điểm xảy ra; mất cắp thêm: gói có quyền lợi mất cắp, xe Bình thường."""
    with tx() as cur:
        return q1(cur, """INSERT INTO insurance_claims (policy_id, claim_type, claimant_id, event_time,
                                                        event_location, description, requested_amount)
                          VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING claim_id, status""",
                  (b.policy_id, b.claim_type, u["user_id"], b.event_time, b.event_location,
                   b.description, b.requested_amount))


def claimant_step(cid, allowed, to_status, u, set_sql="", args=()):
    with tx() as cur:
        c = found(q1(cur, "SELECT claimant_id, status FROM insurance_claims WHERE claim_id = %s FOR UPDATE", (cid,)))
        if c["claimant_id"] != u["user_id"]:
            raise HTTPException(403, "Bạn không phải người gửi yêu cầu này")
        if c["status"] not in allowed:
            raise HTTPException(409, f"Yêu cầu đang ở trạng thái {c['status']}, không thực hiện được")
        cur.execute(f"UPDATE insurance_claims SET status = %s{set_sql} WHERE claim_id = %s", (to_status, *args, cid))
    return {"claim_id": cid, "status": to_status}


def claimant_withdraw(cid, b, u):
    return claimant_step(cid, ("pending_review", "needs_more_info"), "cancelled", u,
                         ", cancel_reason = %s", (b.reason if b else "Chủ xe rút yêu cầu",))


def claimant_supplement(cid, b, u):
    if b.description:
        return claimant_step(cid, ("needs_more_info",), "pending_review", u,
                             ", description = %s", (b.description,))
    return claimant_step(cid, ("needs_more_info",), "pending_review", u)


# ----- yêu cầu bồi thường: phía nhân viên bảo hiểm -------------------
def staff_claim(cur, cid, u):
    """Đọc yêu cầu kèm hợp đồng/xe/công ty bảo hiểm; nhân viên chỉ xử lý yêu cầu của công ty mình."""
    c = found(q1(cur, """SELECT c.claim_id, c.policy_id, c.claim_type, c.claimant_id, c.requested_amount,
                                po.vehicle_id, pr.insurer_id
                         FROM insurance_claims c
                         JOIN insurance_policies po USING (policy_id)
                         JOIN insurance_products pr USING (product_id)
                         WHERE c.claim_id = %s""", (cid,)))
    if c["insurer_id"] != u["insurer_id"]:
        raise HTTPException(403, "Yêu cầu thuộc công ty bảo hiểm khác")
    return c


def staff_step(cid, from_status, to_status, u, set_sql, args):
    with tx() as cur:
        staff_claim(cur, cid, u)
        c = q1(cur, "SELECT status FROM insurance_claims WHERE claim_id = %s FOR UPDATE", (cid,))
        if c["status"] != from_status:
            raise HTTPException(409, f"Yêu cầu đang ở trạng thái {c['status']}, không thực hiện được")
        cur.execute(f"UPDATE insurance_claims SET status = %s, {set_sql} WHERE claim_id = %s",
                    (to_status, *args, cid))
    return {"claim_id": cid, "status": to_status}


def reject_claim(cid, b, u):
    return staff_step(cid, "pending_review", "rejected", u, "reviewer_id = %s, review_note = %s",
                      (u["user_id"], b.note))


def claim_request_info(cid, b, u):
    return staff_step(cid, "pending_review", "needs_more_info", u, "reviewer_id = %s, review_note = %s",
                      (u["user_id"], b.note))


def pay_claim(cid, u):
    """Ghi nhận chi trả yêu cầu đã duyệt (paid_at do trigger điền)."""
    return staff_step(cid, "approved", "paid", u, "reviewer_id = reviewer_id", ())


def approve_claim(cid, b, u):
    """Duyệt bồi thường. Với yêu cầu MẤT CẮP, cùng một transaction:
    khóa xe -> khóa hợp đồng -> duyệt yêu cầu -> xe thành Báo mất -> hủy hồ sơ đăng ký/sang tên đang mở
    -> hủy hợp đồng đang chờ thanh toán của xe -> ghi lịch sử trạng thái xe.
    Trigger kiểm tra tổng đã duyệt không vượt hạn mức (khóa hàng hợp đồng nên hai yêu cầu
    cùng lúc được tuần tự hóa)."""
    with tx() as cur:
        c = staff_claim(cur, cid, u)
        theft = c["claim_type"] == "theft"
        vid = c["vehicle_id"]
        if theft:
            cur.execute("SELECT 1 FROM vehicles WHERE vehicle_id = %s FOR UPDATE", (vid,))
        cur.execute("SELECT 1 FROM insurance_policies WHERE policy_id = %s FOR UPDATE", (c["policy_id"],))
        cur_status = q1(cur, "SELECT status FROM insurance_claims WHERE claim_id = %s FOR UPDATE", (cid,))["status"]
        if cur_status != "pending_review":
            raise HTTPException(409, f"Yêu cầu đang ở trạng thái {cur_status}, không duyệt được")
        if b.approved_amount > c["requested_amount"]:
            raise HTTPException(400, "Số tiền duyệt không được vượt số tiền đề nghị")

        if theft:   # kiểm tra lại lúc duyệt: xe vẫn Bình thường và người yêu cầu vẫn là chủ hiện hành
            if q1(cur, "SELECT status FROM vehicles WHERE vehicle_id = %s", (vid,))["status"] != "normal":
                raise HTTPException(409, "Xe không còn ở trạng thái Bình thường")
            if q1(cur, "SELECT fn_owner_at(%s, now()) AS o", (vid,))["o"] != c["claimant_id"]:
                raise HTTPException(409, "Người yêu cầu không còn là chủ hiện hành")

        cur.execute("""UPDATE insurance_claims SET status = 'approved', approved_amount = %s,
                              reviewer_id = %s, review_note = %s WHERE claim_id = %s""",
                    (b.approved_amount, u["user_id"], b.note, cid))
        out = {"claim_id": cid, "status": "approved", "approved_amount": b.approved_amount}
        if theft:
            cur.execute("UPDATE vehicles SET status = 'stolen' WHERE vehicle_id = %s", (vid,))
            cur.execute("""UPDATE registration_requests SET status = 'cancelled', cancel_reason = 'Xe báo mất'
                           WHERE vehicle_id = %s AND status = ANY(%s)""", (vid, list(OPEN_REQUEST)))
            out["cancelled_requests"] = cur.rowcount
            cur.execute("""UPDATE insurance_policies SET status = 'cancelled'
                           WHERE vehicle_id = %s AND status = 'pending_payment'""", (vid,))
            out["cancelled_policies"] = cur.rowcount
            log_vehicle(cur, vid, "reported_stolen", "normal", "stolen", "Duyệt bồi thường mất cắp",
                        u["user_id"], claim_id=cid)
            out["vehicle_status"] = "stolen"
        return out
