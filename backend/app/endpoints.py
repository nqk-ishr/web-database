"""
Các endpoint xử lý nghiệp vụ (3 nghiệp vụ + báo cáo) cho schema.sql (16 bảng).

Dùng:
    from app.endpoints import router
    app = FastAPI(); app.include_router(router)

Cần: fastapi, psycopg[binary], PyJWT; biến môi trường DATABASE_URL, JWT_SECRET.
Xác thực: endpoint đọc `Authorization: Bearer <jwt>` với claim `sub` = user_id (HS256).
Việc đăng nhập/băm mật khẩu để phần xác thực của nhóm làm; file này chỉ kiểm token và vai trò.

Quy ước:
 * Mỗi endpoint ghi dữ liệu là MỘT transaction (`tx()`); lỗi thì rollback toàn bộ.
 * Thứ tự khóa hàng cố định: vehicles -> insurance_policies -> (claims | registration_requests)
   để tránh deadlock giữa các thao tác duyệt.
 * Các quy tắc liên bảng đã có trigger/constraint trong CSDL; ở đây chỉ bắt lỗi và dịch ra thông báo.
"""
import datetime as dt
import os
import secrets
from contextlib import contextmanager
from typing import Optional

import jwt
import psycopg
from fastapi import APIRouter, Depends, Header, HTTPException
from psycopg import errors as pgerr
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]

TZ = "Asia/Ho_Chi_Minh"
TODAY = f"(now() AT TIME ZONE '{TZ}')::date"
LATE_FEE_RATE = "0.0005"            # 0,05% số tiền phạt mỗi ngày quá hạn (đơn giản hóa)
OPEN_REQUEST = ("pending_confirmation", "pending_approval", "needs_more_info")

OWNER, REGISTRAR, VIOLATION, INSURANCE, ADMIN = (
    "owner", "registrar", "violation_officer", "insurance_staff", "admin")

router = APIRouter()

# Thông báo dễ hiểu cho các ràng buộc hay gặp (tên constraint/index trong schema.sql)
CONSTRAINT_MSG = {
    "uq_req_one_open_per_vehicle": "Xe này đã có một hồ sơ đang mở",
    "uq_req_open_new_chassis": "Đã có hồ sơ đăng ký mới đang mở với số khung này",
    "uq_req_open_new_engine": "Đã có hồ sơ đăng ký mới đang mở với số máy này",
    "vehicles_plate_number_key": "Biển số đã tồn tại",
    "vehicles_chassis_number_key": "Số khung đã tồn tại",
    "vehicles_engine_number_key": "Số máy đã tồn tại",
    "uq_payment_one_success": "Vi phạm này đã có giao dịch nộp phạt thành công",
    "uq_policy_one_pending": "Xe này đã có một hợp đồng đang chờ thanh toán",
    "uq_policy_payment_one_success": "Hợp đồng này đã có giao dịch thanh toán thành công",
    "ex_policy_no_overlap": "Khoảng hiệu lực chồng với một hợp đồng đang hiệu lực của xe",
    "uq_claim_one_open_theft": "Hợp đồng này đã có một yêu cầu mất cắp đang mở",
    "ex_ownership_no_overlap": "Khoảng thời gian sở hữu bị chồng lấn",
}


# ---------------------------------------------------------------------
# Hạ tầng: transaction, lỗi, xác thực
# ---------------------------------------------------------------------
@contextmanager
def tx():
    """Mở một transaction. Thoát bình thường = COMMIT, có lỗi = ROLLBACK."""
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        try:
            with conn.cursor() as cur:
                yield cur
        except (pgerr.UniqueViolation, pgerr.ExclusionViolation, pgerr.CheckViolation) as e:
            name = e.diag.constraint_name
            raise HTTPException(409, CONSTRAINT_MSG.get(name) or e.diag.message_primary)
        except pgerr.ForeignKeyViolation:
            raise HTTPException(400, "Tham chiếu đến dữ liệu không tồn tại")
        except (pgerr.DeadlockDetected, pgerr.SerializationFailure, pgerr.LockNotAvailable):
            raise HTTPException(409, "Xung đột đồng thời, vui lòng thử lại")


def q(cur, sql, args=None):
    cur.execute(sql, args)
    return cur.fetchall()


def q1(cur, sql, args=None):
    cur.execute(sql, args)
    return cur.fetchone()


def found(row, msg="Không tìm thấy"):
    if row is None:
        raise HTTPException(404, msg)
    return row


def current_user(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    try:
        uid = int(jwt.decode(token, JWT_SECRET, algorithms=["HS256"])["sub"])
    except Exception:
        raise HTTPException(401, "Token không hợp lệ")
    with tx() as cur:
        u = q1(cur, """SELECT u.user_id, r.code AS role, u.insurer_id
                       FROM users u JOIN roles r USING (role_id)
                       WHERE u.user_id = %s AND u.is_active""", (uid,))
    if not u:
        raise HTTPException(401, "Tài khoản không tồn tại hoặc đã khóa")
    return u


def need(*roles):
    def dep(u=Depends(current_user)):
        if u["role"] not in roles:
            raise HTTPException(403, "Không đủ quyền")
        return u
    return dep


def log_vehicle(cur, vehicle_id, event, old, new, reason, actor, request_id=None, claim_id=None):
    cur.execute("""INSERT INTO vehicle_status_history
                   (vehicle_id, event_type, old_status, new_status, reason, actor_id, request_id, claim_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                (vehicle_id, event, old, new, reason, actor, request_id, claim_id))


def gateway_ref(prefix):
    return f"{prefix}{dt.datetime.now():%Y%m%d%H%M%S}{secrets.token_hex(3).upper()}"


# ---------------------------------------------------------------------
# Schema đầu vào
# ---------------------------------------------------------------------
class NewRegistration(BaseModel):
    vehicle_type_id: int
    chassis_number: str = Field(min_length=1, max_length=30)
    engine_number: str = Field(min_length=1, max_length=30)
    manufacture_year: int = Field(ge=1950, le=2100)


class Transfer(BaseModel):
    vehicle_id: int
    buyer_id: int


class Reason(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class Note(BaseModel):
    note: str = Field(min_length=1, max_length=500)


class ApproveRequest(BaseModel):
    plate_number: Optional[str] = Field(default=None, max_length=15)   # bắt buộc khi đăng ký mới


class NewViolation(BaseModel):
    plate_number: str
    violation_type_id: int
    camera_id: int
    occurred_at: dt.datetime


class Notice(BaseModel):
    fine_amount: int = Field(ge=0)
    due_date: dt.date


class Pay(BaseModel):
    simulate_fail: bool = False          # mô phỏng cổng thanh toán báo lỗi


class NewPolicy(BaseModel):
    vehicle_id: int
    product_id: int
    start_date: dt.date


class NewClaim(BaseModel):
    policy_id: int
    claim_type: str = Field(pattern="^(accident|theft)$")
    event_time: dt.datetime
    event_location: str = Field(min_length=1, max_length=300)
    description: Optional[str] = Field(default=None, max_length=1000)
    requested_amount: int = Field(gt=0)


class Supplement(BaseModel):
    description: Optional[str] = Field(default=None, max_length=1000)


class ApproveClaim(BaseModel):
    approved_amount: int = Field(ge=0)
    note: Optional[str] = Field(default=None, max_length=500)


# =====================================================================
# TRA CỨU CỦA CHỦ XE / DANH MỤC
# =====================================================================
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
    with tx() as cur:
        return q(cur, """SELECT * FROM registration_requests
                         WHERE requester_id = %s OR buyer_id = %s
                         ORDER BY submitted_at DESC""", (u["user_id"], u["user_id"]))


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
            SELECT po.*, pr.name AS product_name, ve.plate_number,
                   (po.status = 'active' AND po.end_date < {TODAY}) AS is_expired
            FROM insurance_policies po
            JOIN insurance_products pr USING (product_id)
            JOIN vehicles ve USING (vehicle_id)
            WHERE po.buyer_id = %s ORDER BY po.created_at DESC""", (u["user_id"],))


@router.get("/me/claims")
def my_claims(u=Depends(need(OWNER))):
    with tx() as cur:
        return q(cur, "SELECT * FROM insurance_claims WHERE claimant_id = %s ORDER BY created_at DESC",
                 (u["user_id"],))


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


# =====================================================================
# NGHIỆP VỤ 1: ĐĂNG KÝ VÀ SANG TÊN
# =====================================================================
@router.post("/requests/registration", status_code=201)
def submit_registration(b: NewRegistration, u=Depends(need(OWNER))):
    with tx() as cur:
        if q1(cur, "SELECT 1 FROM vehicles WHERE chassis_number = %s OR engine_number = %s",
              (b.chassis_number, b.engine_number)):
            raise HTTPException(409, "Số khung hoặc số máy đã có trong hệ thống")
        return q1(cur, """INSERT INTO registration_requests
                          (request_type, status, requester_id, declared_vehicle_type_id,
                           declared_chassis_number, declared_engine_number, declared_manufacture_year)
                          VALUES ('new_registration', 'pending_approval', %s, %s, %s, %s, %s)
                          RETURNING request_id, status""",
                  (u["user_id"], b.vehicle_type_id, b.chassis_number, b.engine_number, b.manufacture_year))


@router.post("/requests/transfer", status_code=201)
def submit_transfer(b: Transfer, u=Depends(need(OWNER))):
    """Trigger kiểm tra: người gửi là chủ hiện hành, xe Bình thường, chủ không còn nợ phạt."""
    with tx() as cur:
        buyer = q1(cur, """SELECT r.code FROM users u JOIN roles r USING (role_id)
                           WHERE u.user_id = %s AND u.is_active""", (b.buyer_id,))
        if not buyer or buyer["code"] != OWNER:
            raise HTTPException(400, "Bên mua phải là một chủ xe có tài khoản")
        return q1(cur, """INSERT INTO registration_requests
                          (request_type, status, vehicle_id, requester_id, buyer_id)
                          VALUES ('transfer', 'pending_confirmation', %s, %s, %s)
                          RETURNING request_id, status""", (b.vehicle_id, u["user_id"], b.buyer_id))


def _request_step(rid, allowed_status, to_status, who, set_sql="", args=()):
    """Đổi trạng thái hồ sơ sau khi khóa hàng và kiểm tra người thao tác + trạng thái hiện tại."""
    with tx() as cur:
        r = found(q1(cur, "SELECT * FROM registration_requests WHERE request_id = %s FOR UPDATE", (rid,)))
        if not who(r):
            raise HTTPException(403, "Bạn không có quyền với hồ sơ này")
        if r["status"] not in allowed_status:
            raise HTTPException(409, f"Hồ sơ đang ở trạng thái {r['status']}, không thực hiện được")
        cur.execute(f"UPDATE registration_requests SET status = %s{set_sql} WHERE request_id = %s",
                    (to_status, *args, rid))
    return {"request_id": rid, "status": to_status}


@router.post("/requests/{rid}/confirm")
def buyer_confirm(rid: int, u=Depends(need(OWNER))):
    return _request_step(rid, ("pending_confirmation",), "pending_approval",
                         lambda r: r["buyer_id"] == u["user_id"])


@router.post("/requests/{rid}/decline")
def buyer_decline(rid: int, u=Depends(need(OWNER))):
    return _request_step(rid, ("pending_confirmation",), "cancelled",
                         lambda r: r["buyer_id"] == u["user_id"],
                         ", cancel_reason = %s", ("Bên mua từ chối",))


@router.post("/requests/{rid}/cancel")
def requester_withdraw(rid: int, b: Optional[Reason] = None, u=Depends(need(OWNER))):
    return _request_step(rid, OPEN_REQUEST, "cancelled",
                         lambda r: r["requester_id"] == u["user_id"],
                         ", cancel_reason = %s", (b.reason if b else "Chủ xe rút hồ sơ",))


@router.post("/requests/{rid}/resubmit")
def requester_resubmit(rid: int, u=Depends(need(OWNER))):
    """Bổ sung xong, gửi lại hồ sơ đang ở trạng thái Cần bổ sung."""
    return _request_step(rid, ("needs_more_info",), "pending_approval",
                         lambda r: r["requester_id"] == u["user_id"])


@router.get("/requests")
def request_queue(status: str = "pending_approval", u=Depends(need(REGISTRAR))):
    with tx() as cur:
        return q(cur, """SELECT * FROM registration_requests WHERE status = %s
                         ORDER BY submitted_at""", (status,))


@router.post("/requests/{rid}/reject")
def registrar_reject(rid: int, b: Note, u=Depends(need(REGISTRAR))):
    return _request_step(rid, ("pending_approval",), "rejected", lambda r: True,
                         ", reviewer_id = %s, review_note = %s", (u["user_id"], b.note))


@router.post("/requests/{rid}/request-info")
def registrar_request_info(rid: int, b: Note, u=Depends(need(REGISTRAR))):
    return _request_step(rid, ("pending_approval",), "needs_more_info", lambda r: True,
                         ", reviewer_id = %s, review_note = %s", (u["user_id"], b.note))


@router.post("/requests/{rid}/approve")
def registrar_approve(rid: int, b: ApproveRequest, u=Depends(need(REGISTRAR))):
    with tx() as cur:
        req = found(q1(cur, "SELECT * FROM registration_requests WHERE request_id = %s", (rid,)))
        # khóa xe trước, rồi mới khóa hồ sơ (thứ tự cố định, cùng thứ tự với duyệt bồi thường mất cắp)
        if req["vehicle_id"]:
            cur.execute("SELECT 1 FROM vehicles WHERE vehicle_id = %s FOR UPDATE", (req["vehicle_id"],))
        req = q1(cur, "SELECT * FROM registration_requests WHERE request_id = %s FOR UPDATE", (rid,))
        if req["status"] != "pending_approval":
            raise HTTPException(409, f"Hồ sơ đang ở trạng thái {req['status']}, không duyệt được")

        if req["request_type"] == "new_registration":
            plate = (b.plate_number or "").strip().upper()
            if not plate:
                raise HTTPException(400, "Cần nhập biển số khi duyệt đăng ký mới")
            vid = q1(cur, """INSERT INTO vehicles (plate_number, chassis_number, engine_number,
                                                   manufacture_year, vehicle_type_id)
                             VALUES (%s, %s, %s, %s, %s) RETURNING vehicle_id""",
                     (plate, req["declared_chassis_number"], req["declared_engine_number"],
                      req["declared_manufacture_year"], req["declared_vehicle_type_id"]))["vehicle_id"]
            cur.execute("INSERT INTO ownership_history (vehicle_id, owner_id, valid_from) VALUES (%s, %s, now())",
                        (vid, req["requester_id"]))
            cur.execute("""UPDATE registration_requests
                           SET vehicle_id = %s, status = 'approved', reviewer_id = %s WHERE request_id = %s""",
                        (vid, u["user_id"], rid))
            log_vehicle(cur, vid, "registered", None, "normal", "Đăng ký mới", u["user_id"], request_id=rid)
            return {"request_id": rid, "status": "approved", "vehicle_id": vid, "plate_number": plate}

        # sang tên: trigger kiểm tra lại xe Bình thường và chủ không còn nợ phạt
        vid = req["vehicle_id"]
        cur.execute("UPDATE registration_requests SET status = 'approved', reviewer_id = %s WHERE request_id = %s",
                    (u["user_id"], rid))
        closed = q1(cur, """UPDATE ownership_history SET valid_to = now()
                            WHERE vehicle_id = %s AND owner_id = %s AND valid_to IS NULL
                            RETURNING ownership_id""", (vid, req["requester_id"]))
        if not closed:
            raise HTTPException(409, "Người bán không còn là chủ hiện hành; hãy từ chối hồ sơ")
        cur.execute("INSERT INTO ownership_history (vehicle_id, owner_id, valid_from) VALUES (%s, %s, now())",
                    (vid, req["buyer_id"]))
        log_vehicle(cur, vid, "ownership_transferred", "normal", "normal",
                    f"Sang tên từ user {req['requester_id']} sang user {req['buyer_id']}",
                    u["user_id"], request_id=rid)
        return {"request_id": rid, "status": "approved", "vehicle_id": vid}


@router.post("/vehicles/{vid}/found")
def vehicle_found(vid: int, b: Reason, u=Depends(need(REGISTRAR))):
    return _vehicle_from_stolen(vid, "normal", "found", b.reason, u)


@router.post("/vehicles/{vid}/revoke")
def vehicle_revoke(vid: int, b: Reason, u=Depends(need(REGISTRAR))):
    return _vehicle_from_stolen(vid, "revoked", "revoked", b.reason, u)


def _vehicle_from_stolen(vid, new_status, event, reason, u):
    with tx() as cur:
        v = found(q1(cur, "SELECT status FROM vehicles WHERE vehicle_id = %s FOR UPDATE", (vid,)))
        if v["status"] != "stolen":
            raise HTTPException(409, "Chỉ xử lý được xe đang ở trạng thái Báo mất")
        cur.execute("UPDATE vehicles SET status = %s WHERE vehicle_id = %s", (new_status, vid))
        log_vehicle(cur, vid, event, "stolen", new_status, reason, u["user_id"])
    return {"vehicle_id": vid, "status": new_status}


# =====================================================================
# NGHIỆP VỤ 2: VI PHẠM (PHẠT NGUỘI) VÀ NỘP PHẠT
# =====================================================================
@router.post("/violations", status_code=201)
def record_violation(b: NewViolation, u=Depends(need(VIOLATION))):
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


@router.get("/violations")
def violation_queue(status: str = "recorded", u=Depends(need(VIOLATION))):
    with tx() as cur:
        return q(cur, "SELECT * FROM violations WHERE status = %s ORDER BY occurred_at", (status,))


@router.post("/violations/{vid}/verify")
def verify_violation(vid: int, u=Depends(need(VIOLATION))):
    """Xác minh; trả về cảnh báo (không chặn) nếu xe Báo mất hoặc lỗi 'không có bảo hiểm' mà xe có hợp đồng hiệu lực."""
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


@router.post("/violations/{vid}/notify")
def notify_violation(vid: int, b: Notice, u=Depends(need(VIOLATION))):
    """Lập quyết định: chốt mức phạt (trigger kiểm tra nằm trong khung danh mục lỗi), số quyết định, hạn nộp."""
    with tx() as cur:
        v = found(q1(cur, "SELECT status, EXTRACT(YEAR FROM occurred_at)::int AS y FROM violations "
                          "WHERE violation_id = %s FOR UPDATE", (vid,)))
        if v["status"] != "verified":
            raise HTTPException(409, f"Vi phạm đang ở trạng thái {v['status']}, không ra thông báo được")
        if b.due_date < dt.date.today():
            raise HTTPException(400, "Hạn nộp phải từ hôm nay trở đi")
        number = f"QD-{dt.date.today().year}-{vid:06d}"
        cur.execute("""UPDATE violations SET status = 'notified', fine_amount = %s, due_date = %s,
                              decision_number = %s, handled_by = %s, notified_at = now()
                       WHERE violation_id = %s""", (b.fine_amount, b.due_date, number, u["user_id"], vid))
    return {"violation_id": vid, "status": "notified", "decision_number": number}


@router.post("/violations/{vid}/cancel")
def cancel_violation(vid: int, b: Reason, u=Depends(need(VIOLATION))):
    with tx() as cur:
        v = found(q1(cur, "SELECT status FROM violations WHERE violation_id = %s FOR UPDATE", (vid,)))
        if v["status"] not in ("recorded", "verified"):
            raise HTTPException(409, f"Vi phạm đang ở trạng thái {v['status']}, không hủy được")
        cur.execute("""UPDATE violations SET status = 'cancelled', cancelled_reason = %s, handled_by = %s
                       WHERE violation_id = %s""", (b.reason, u["user_id"], vid))
    return {"violation_id": vid, "status": "cancelled"}


@router.post("/violations/{vid}/pay")
def pay_violation(vid: int, b: Pay = Pay(), u=Depends(need(OWNER))):
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


# =====================================================================
# NGHIỆP VỤ 3: BẢO HIỂM (MUA, GIA HẠN, BỒI THƯỜNG)
# =====================================================================
@router.post("/policies", status_code=201)
def buy_policy(b: NewPolicy, u=Depends(need(OWNER))):
    """Tạo hợp đồng Chờ thanh toán. Gia hạn = mua hợp đồng mới có start_date liền sau end_date hợp đồng cũ.
    Trigger kiểm tra gói đúng loại xe, xe Bình thường, người mua là chủ hiện hành; phí/hạn mức/end_date do trigger điền."""
    if b.start_date < dt.date.today():
        raise HTTPException(400, "Ngày bắt đầu không được ở quá khứ")
    with tx() as cur:
        return q1(cur, """INSERT INTO insurance_policies (vehicle_id, product_id, buyer_id, start_date)
                          VALUES (%s, %s, %s, %s)
                          RETURNING policy_id, status, start_date, end_date, premium""",
                  (b.vehicle_id, b.product_id, u["user_id"], b.start_date))


@router.post("/policies/{pid}/pay")
def pay_policy(pid: int, b: Pay = Pay(), u=Depends(need(OWNER))):
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


@router.post("/policies/{pid}/cancel")
def cancel_policy(pid: int, u=Depends(need(OWNER))):
    """Chỉ hủy được hợp đồng còn Chờ thanh toán (hợp đồng đã hiệu lực không hủy/hoàn phí)."""
    with tx() as cur:
        p = found(q1(cur, "SELECT buyer_id, status FROM insurance_policies WHERE policy_id = %s FOR UPDATE", (pid,)))
        if p["buyer_id"] != u["user_id"]:
            raise HTTPException(403, "Bạn không phải người mua hợp đồng này")
        if p["status"] != "pending_payment":
            raise HTTPException(409, "Chỉ hủy được hợp đồng đang Chờ thanh toán")
        cur.execute("UPDATE insurance_policies SET status = 'cancelled' WHERE policy_id = %s", (pid,))
    return {"policy_id": pid, "status": "cancelled"}


@router.post("/claims", status_code=201)
def submit_claim(b: NewClaim, u=Depends(need(OWNER))):
    """Trigger kiểm tra: hợp đồng Hiệu lực, sự kiện trong hiệu lực và không ở tương lai,
    người yêu cầu là chủ xe tại thời điểm xảy ra; mất cắp thêm: gói có quyền lợi mất cắp, xe Bình thường."""
    with tx() as cur:
        return q1(cur, """INSERT INTO insurance_claims (policy_id, claim_type, claimant_id, event_time,
                                                        event_location, description, requested_amount)
                          VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING claim_id, status""",
                  (b.policy_id, b.claim_type, u["user_id"], b.event_time, b.event_location,
                   b.description, b.requested_amount))


def _claimant_step(cid, allowed, to_status, u, set_sql="", args=()):
    with tx() as cur:
        c = found(q1(cur, "SELECT claimant_id, status FROM insurance_claims WHERE claim_id = %s FOR UPDATE", (cid,)))
        if c["claimant_id"] != u["user_id"]:
            raise HTTPException(403, "Bạn không phải người gửi yêu cầu này")
        if c["status"] not in allowed:
            raise HTTPException(409, f"Yêu cầu đang ở trạng thái {c['status']}, không thực hiện được")
        cur.execute(f"UPDATE insurance_claims SET status = %s{set_sql} WHERE claim_id = %s", (to_status, *args, cid))
    return {"claim_id": cid, "status": to_status}


@router.post("/claims/{cid}/cancel")
def claimant_withdraw(cid: int, b: Optional[Reason] = None, u=Depends(need(OWNER))):
    return _claimant_step(cid, ("pending_review", "needs_more_info"), "cancelled", u,
                          ", cancel_reason = %s", (b.reason if b else "Chủ xe rút yêu cầu",))


@router.post("/claims/{cid}/supplement")
def claimant_supplement(cid: int, b: Supplement = Supplement(), u=Depends(need(OWNER))):
    if b.description:
        return _claimant_step(cid, ("needs_more_info",), "pending_review", u,
                              ", description = %s", (b.description,))
    return _claimant_step(cid, ("needs_more_info",), "pending_review", u)


def _staff_claim(cur, cid, u):
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


@router.get("/claims")
def claim_queue(status: str = "pending_review", u=Depends(need(INSURANCE))):
    with tx() as cur:
        return q(cur, """SELECT c.* FROM insurance_claims c
                         JOIN insurance_policies po USING (policy_id)
                         JOIN insurance_products pr USING (product_id)
                         WHERE c.status = %s AND pr.insurer_id = %s ORDER BY c.created_at""",
                 (status, u["insurer_id"]))


def _staff_step(cid, from_status, to_status, u, set_sql, args):
    with tx() as cur:
        _staff_claim(cur, cid, u)
        c = q1(cur, "SELECT status FROM insurance_claims WHERE claim_id = %s FOR UPDATE", (cid,))
        if c["status"] != from_status:
            raise HTTPException(409, f"Yêu cầu đang ở trạng thái {c['status']}, không thực hiện được")
        cur.execute(f"UPDATE insurance_claims SET status = %s, {set_sql} WHERE claim_id = %s",
                    (to_status, *args, cid))
    return {"claim_id": cid, "status": to_status}


@router.post("/claims/{cid}/reject")
def reject_claim(cid: int, b: Note, u=Depends(need(INSURANCE))):
    return _staff_step(cid, "pending_review", "rejected", u, "reviewer_id = %s, review_note = %s",
                       (u["user_id"], b.note))


@router.post("/claims/{cid}/request-info")
def claim_request_info(cid: int, b: Note, u=Depends(need(INSURANCE))):
    return _staff_step(cid, "pending_review", "needs_more_info", u, "reviewer_id = %s, review_note = %s",
                       (u["user_id"], b.note))


@router.post("/claims/{cid}/pay")
def pay_claim(cid: int, u=Depends(need(INSURANCE))):
    """Ghi nhận chi trả yêu cầu đã duyệt (paid_at do trigger điền)."""
    return _staff_step(cid, "approved", "paid", u, "reviewer_id = reviewer_id", ())


@router.post("/claims/{cid}/approve")
def approve_claim(cid: int, b: ApproveClaim, u=Depends(need(INSURANCE))):
    """Duyệt bồi thường. Với yêu cầu MẤT CẮP, cùng một transaction:
    khóa xe -> khóa hợp đồng -> duyệt yêu cầu -> xe thành Báo mất -> hủy hồ sơ đăng ký/sang tên đang mở
    -> hủy hợp đồng đang chờ thanh toán của xe -> ghi lịch sử trạng thái xe.
    Trigger kiểm tra tổng đã duyệt không vượt hạn mức (khóa hàng hợp đồng nên hai yêu cầu cùng lúc được tuần tự hóa)."""
    with tx() as cur:
        c = _staff_claim(cur, cid, u)
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


# =====================================================================
# BÁO CÁO THỐNG KÊ
# =====================================================================
@router.get("/reports/violations")
def report_violations(from_date: Optional[dt.date] = None, to_date: Optional[dt.date] = None,
                      u=Depends(need(VIOLATION, ADMIN))):
    """Báo cáo 1: số vi phạm và tiền phạt theo loại lỗi, theo tháng, theo trạng thái."""
    day = f"(v.occurred_at AT TIME ZONE '{TZ}')::date"
    where = f"WHERE (%(f)s::date IS NULL OR {day} >= %(f)s::date) AND (%(t)s::date IS NULL OR {day} <= %(t)s::date)"
    p = {"f": from_date, "t": to_date}
    sel = "count(*) AS violations, COALESCE(SUM(v.fine_amount), 0) AS total_fine"
    with tx() as cur:
        return {
            "by_type": q(cur, f"""SELECT t.code AS violation_type, {sel} FROM violations v
                                  JOIN violation_types t USING (violation_type_id) {where}
                                  GROUP BY t.code ORDER BY violations DESC""", p),
            "by_month": q(cur, f"""SELECT to_char(v.occurred_at AT TIME ZONE '{TZ}', 'YYYY-MM') AS month, {sel}
                                   FROM violations v {where} GROUP BY 1 ORDER BY 1""", p),
            "by_status": q(cur, f"SELECT v.status, {sel} FROM violations v {where} GROUP BY v.status ORDER BY 1", p),
        }


@router.get("/reports/unpaid-fines")
def report_unpaid(u=Depends(need(VIOLATION, ADMIN))):
    """Báo cáo 2: xe và chủ xe còn phạt chưa nộp (Đã xác minh / Đã thông báo), kèm phạt trễ tính đến hôm nay."""
    overdue = f"(v.status = 'notified' AND v.due_date < {TODAY})"
    with tx() as cur:
        return q(cur, f"""
            SELECT ve.plate_number, u.full_name AS owner, count(*) AS violations,
                   COALESCE(SUM(v.fine_amount), 0) AS total_fine,
                   count(*) FILTER (WHERE {overdue}) AS overdue_violations,
                   COALESCE(SUM(CASE WHEN {overdue}
                       THEN ROUND(v.fine_amount * {LATE_FEE_RATE} * ({TODAY} - v.due_date)) END), 0) AS late_fee
            FROM violations v
            JOIN vehicles ve USING (vehicle_id)
            JOIN users u ON u.user_id = v.liable_owner_id
            WHERE v.status IN ('verified', 'notified')
            GROUP BY ve.vehicle_id, ve.plate_number, u.user_id, u.full_name
            ORDER BY total_fine DESC""")


@router.get("/reports/insurance")
def report_insurance(u=Depends(need(INSURANCE, ADMIN))):
    """Báo cáo 3: hợp đồng sắp hết hạn trong 30 ngày; phí thu và tiền bồi thường theo tháng, theo loại xe.
    Nhân viên bảo hiểm chỉ thấy số liệu công ty mình; quản trị thấy tất cả."""
    ins = u["insurer_id"] if u["role"] == INSURANCE else None
    p = {"ins": ins}
    flt = "(%(ins)s::int IS NULL OR pr.insurer_id = %(ins)s::int)"
    join = """JOIN insurance_policies po ON po.policy_id = {k}.policy_id
              JOIN insurance_products pr ON pr.product_id = po.product_id"""
    with tx() as cur:
        return {
            "expiring_30_days": q(cur, f"""
                SELECT po.certificate_code, ve.plate_number, po.end_date, i.name AS insurer
                FROM insurance_policies po
                JOIN insurance_products pr USING (product_id)
                JOIN insurers i USING (insurer_id)
                JOIN vehicles ve USING (vehicle_id)
                WHERE po.status = 'active' AND po.end_date BETWEEN {TODAY} AND {TODAY} + 30 AND {flt}
                ORDER BY po.end_date""", p),
            "premium_by_month": q(cur, f"""
                SELECT to_char(pp.paid_at AT TIME ZONE '{TZ}', 'YYYY-MM') AS month, SUM(pp.amount) AS premium
                FROM policy_payments pp {join.format(k='pp')}
                WHERE pp.status = 'success' AND {flt} GROUP BY 1 ORDER BY 1""", p),
            "payout_by_month": q(cur, f"""
                SELECT to_char(c.paid_at AT TIME ZONE '{TZ}', 'YYYY-MM') AS month, SUM(c.approved_amount) AS payout
                FROM insurance_claims c {join.format(k='c')}
                WHERE c.status = 'paid' AND {flt} GROUP BY 1 ORDER BY 1""", p),
            "by_vehicle_type": q(cur, f"""
                SELECT * FROM (
                  SELECT vt.name AS vehicle_type, vt.usage_purpose,
                    COALESCE((SELECT SUM(pp.amount) FROM policy_payments pp {join.format(k='pp')}
                              JOIN vehicles ve ON ve.vehicle_id = po.vehicle_id
                              WHERE pp.status = 'success' AND ve.vehicle_type_id = vt.vehicle_type_id AND {flt}), 0) AS premium,
                    COALESCE((SELECT SUM(c.approved_amount) FROM insurance_claims c {join.format(k='c')}
                              JOIN vehicles ve ON ve.vehicle_id = po.vehicle_id
                              WHERE c.status = 'paid' AND ve.vehicle_type_id = vt.vehicle_type_id AND {flt}), 0) AS payout
                  FROM vehicle_types vt) x
                WHERE premium > 0 OR payout > 0 ORDER BY premium DESC""", p),
        }
