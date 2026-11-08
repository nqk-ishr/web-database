"""Kết nối PostgreSQL, transaction và dịch lỗi ràng buộc ra HTTP."""
from contextlib import contextmanager

import psycopg
from fastapi import HTTPException
from psycopg import errors as pgerr
from psycopg.rows import dict_row

from app.core.config import DATABASE_URL

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
