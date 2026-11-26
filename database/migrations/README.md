# Migration (Alembic)

`schema.sql` là bản gốc (revision `0001`). Mọi thay đổi schema sau đó là một file trong `versions/`, có `upgrade()` và `downgrade()`.

```bash
cd database
pip install -r requirements-migrations.txt
export DATABASE_URL=postgresql://vehicle_app:change_me@localhost:5432/vehicle_db

alembic upgrade head        # áp dụng tất cả
alembic current             # xem phiên bản hiện tại
alembic downgrade -1        # lùi một bước (0003 -> 0002)
alembic upgrade +1          # tiến lại một bước
alembic upgrade head --sql  # in SQL, không chạy
```

| Revision | Nội dung |
|---|---|
| 0001 | Baseline `schema.sql` (DB đã nạp sẵn thì bỏ qua) |
| 0002 | Bảng `audit_log` |
| 0003 | Bảng `attachments` |

Thêm migration mới: `alembic revision -m "mô tả"` rồi viết SQL trong `upgrade()` / `downgrade()`.
Lùi qua `0001` xóa toàn bộ dữ liệu nên cần `ALLOW_DESTRUCTIVE_DOWNGRADE=1`.
Minh chứng cho `docs/evidence/06`: chụp `alembic upgrade head`, `\d audit_log`, `alembic downgrade -1`, rồi `upgrade head` lại.
