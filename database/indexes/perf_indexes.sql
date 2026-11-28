-- Chi muc hieu nang - tao SAU khi do EXPLAIN lan dau (xem database/report/). Thay cho 2 dong comment cuoi schema.sql.
-- 1) Lich su vi pham theo xe, moi nhat truoc (Q05). violations.vehicle_id chua co chi muc nao, trong khi
--    sang ten, view tong hop va nhieu truy van deu tra theo xe.
CREATE INDEX ix_vio_vehicle_time ON violations (vehicle_id, occurred_at DESC);
-- 2) Partial index cho vi pham CHUA NOP (verified, notified: ~25% bang): view v_vehicle_overview, Q09 va kiem tra
--    "no phat chan sang ten" chi can quet phan nay; INCLUDE de index-only scan khong phai doc bang.
CREATE INDEX ix_vio_unpaid_vehicle ON violations (vehicle_id) INCLUDE (fine_amount, due_date, status)
    WHERE status IN ('verified', 'notified');
ANALYZE violations;
