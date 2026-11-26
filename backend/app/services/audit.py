"""Ghi nhật ký thao tác. Gọi TRONG CÙNG transaction với thay đổi (cùng commit hoặc cùng rollback)."""
from psycopg.types.json import Jsonb


def log_audit(cur, actor_id, action, entity_type, entity_id, detail=None):
    """Không đưa dữ liệu nhạy cảm (mật khẩu, token) vào `detail`."""
    cur.execute("""INSERT INTO audit_log (actor_id, action, entity_type, entity_id, detail)
                   VALUES (%s, %s, %s, %s, %s)""",
                (actor_id, action, entity_type, entity_id, Jsonb(detail or {})))
