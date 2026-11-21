"""Hàm phụ dùng chung cho các service."""
import datetime as dt
import secrets


def log_vehicle(cur, vehicle_id, event, old, new, reason, actor, request_id=None, claim_id=None):
    """Ghi một dòng vào vehicle_status_history (gọi trong cùng transaction với thay đổi)."""
    cur.execute("""INSERT INTO vehicle_status_history
                   (vehicle_id, event_type, old_status, new_status, reason, actor_id, request_id, claim_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                (vehicle_id, event, old, new, reason, actor, request_id, claim_id))


def gateway_ref(prefix):
    """Mã giao dịch cổng thanh toán mô phỏng."""
    return f"{prefix}{dt.datetime.now():%Y%m%d%H%M%S}{secrets.token_hex(3).upper()}"
