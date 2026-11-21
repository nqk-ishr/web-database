"""Nghiệp vụ 1: đăng ký và sang tên. Mỗi hàm ghi dữ liệu là MỘT transaction.

Thứ tự khóa hàng cố định: vehicles -> insurance_policies -> (claims | registration_requests).
"""
from fastapi import HTTPException

from app.core.config import OPEN_REQUEST, OWNER
from app.db.session import found, q1, tx
from app.services.common import log_vehicle


def submit_registration(b, u):
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


def submit_transfer(b, u):
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


def request_step(rid, allowed_status, to_status, who, set_sql="", args=()):
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


def buyer_confirm(rid, u):
    return request_step(rid, ("pending_confirmation",), "pending_approval",
                        lambda r: r["buyer_id"] == u["user_id"])


def buyer_decline(rid, u):
    return request_step(rid, ("pending_confirmation",), "cancelled",
                        lambda r: r["buyer_id"] == u["user_id"],
                        ", cancel_reason = %s", ("Bên mua từ chối",))


def requester_withdraw(rid, b, u):
    return request_step(rid, OPEN_REQUEST, "cancelled",
                        lambda r: r["requester_id"] == u["user_id"],
                        ", cancel_reason = %s", (b.reason if b else "Chủ xe rút hồ sơ",))


def requester_resubmit(rid, u):
    """Bổ sung xong, gửi lại hồ sơ đang ở trạng thái Cần bổ sung."""
    return request_step(rid, ("needs_more_info",), "pending_approval",
                        lambda r: r["requester_id"] == u["user_id"])


def registrar_reject(rid, b, u):
    return request_step(rid, ("pending_approval",), "rejected", lambda r: True,
                        ", reviewer_id = %s, review_note = %s", (u["user_id"], b.note))


def registrar_request_info(rid, b, u):
    return request_step(rid, ("pending_approval",), "needs_more_info", lambda r: True,
                        ", reviewer_id = %s, review_note = %s", (u["user_id"], b.note))


def approve_request(rid, b, u):
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


def vehicle_from_stolen(vid, new_status, event, reason, u):
    """Xe Báo mất -> Bình thường (tìm thấy) hoặc Đã thu hồi."""
    with tx() as cur:
        v = found(q1(cur, "SELECT status FROM vehicles WHERE vehicle_id = %s FOR UPDATE", (vid,)))
        if v["status"] != "stolen":
            raise HTTPException(409, "Chỉ xử lý được xe đang ở trạng thái Báo mất")
        cur.execute("UPDATE vehicles SET status = %s WHERE vehicle_id = %s", (new_status, vid))
        log_vehicle(cur, vid, event, "stolen", new_status, reason, u["user_id"])
    return {"vehicle_id": vid, "status": new_status}
