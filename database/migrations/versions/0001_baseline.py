"""Baseline: schema.sql (16 bảng, trigger, ràng buộc).

DB mới, chưa có bảng users  -> nạp schema.sql.
DB đã nạp schema.sql (docker compose, CI) -> không làm gì, chỉ ghi nhận phiên bản.

Revision ID: 0001
Revises:
"""
import os
from pathlib import Path

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

SCHEMA_SQL = Path(__file__).resolve().parents[2] / "schema.sql"


def upgrade():
    bind = op.get_bind()
    exists = bind.exec_driver_sql("SELECT to_regclass('public.users') IS NOT NULL").scalar()
    if exists:
        return
    # Dùng con trỏ DBAPI thô: schema.sql chứa ký tự % (RAISE EXCEPTION '%') mà SQLAlchemy/psycopg
    # sẽ hiểu nhầm là tham số nếu đi qua op.execute.
    cur = bind.connection.cursor()
    cur.execute(SCHEMA_SQL.read_text(encoding="utf-8"))


def downgrade():
    # Xóa TOÀN BỘ dữ liệu: bắt buộc xác nhận rõ ràng
    if os.environ.get("ALLOW_DESTRUCTIVE_DOWNGRADE") != "1":
        raise RuntimeError("Downgrade baseline xóa toàn bộ dữ liệu. Đặt ALLOW_DESTRUCTIVE_DOWNGRADE=1 nếu chắc chắn.")
    op.execute("DROP SCHEMA public CASCADE")
    op.execute("CREATE SCHEMA public")
