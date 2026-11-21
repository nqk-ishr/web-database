-- Chi muc hieu nang - tao SAU khi do EXPLAIN lan dau (xem reports/)
-- 1) Lich su vi pham theo xe, moi nhat truoc (Q07; FK violations.vehicle_id chua co index nao)
CREATE INDEX idx_violations_vehicle_time ON violations (vehicle_id, occurred_at DESC);
-- 2) Partial index cho vi pham CHUA NOP (~35% bang): phuc vu no phat theo xe (Q03, Q10, view v_vehicle_status)
CREATE INDEX idx_violations_unpaid ON violations (vehicle_id) INCLUDE (fine_amount, due_date)
    WHERE status IN ('verified','notified','appealing');
-- 3) Dang kiem con hieu luc moi nhat cua xe (Q02, Q10, view): index-only scan nguoc
CREATE INDEX idx_inspections_vehicle_passed ON inspections (vehicle_id, expires_at DESC) WHERE result = 'passed';
ANALYZE violations; ANALYZE inspections;
