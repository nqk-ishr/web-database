-- View: tinh trang tong hop cua xe (chu hien hanh, bao hiem, vi pham chua nop, ho so dang xu ly)
-- Dung cho: man hinh tra cuu xe, dashboard can bo, bao cao so xe theo tinh trang.
-- "Hom nay" tinh theo gio Viet Nam, giong backend (app/core/config.py).
-- "Chua nop" = vi pham tu trang thai Da xac minh tro di (verified, notified) - cung dinh nghia voi trigger sang ten.
CREATE OR REPLACE VIEW v_vehicle_overview AS
SELECT v.vehicle_id,
       v.plate_number,
       vt.name                        AS vehicle_type,
       v.manufacture_year,
       v.status                       AS vehicle_status,
       u.user_id                      AS owner_id,
       u.full_name                    AS owner_name,
       ins.end_date                   AS insurance_end_date,
       CASE WHEN ins.end_date IS NULL THEN 'none'
            WHEN ins.end_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'expired'
            WHEN ins.end_date <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 30 THEN 'expiring_30d'
            ELSE 'valid' END          AS insurance_status,
       COALESCE(vio.cnt, 0)           AS unpaid_count,
       COALESCE(vio.amt, 0)           AS unpaid_amount,
       COALESCE(vio.overdue, 0)       AS overdue_count,
       COALESCE(rq.cnt, 0)            AS open_requests
FROM vehicles v
JOIN vehicle_types vt          ON vt.vehicle_type_id = v.vehicle_type_id
LEFT JOIN ownership_history oh ON oh.vehicle_id = v.vehicle_id AND oh.valid_to IS NULL
LEFT JOIN users u              ON u.user_id = oh.owner_id
LEFT JOIN LATERAL (SELECT max(p.end_date) AS end_date
                   FROM insurance_policies p
                   WHERE p.vehicle_id = v.vehicle_id AND p.status = 'active') ins ON true
LEFT JOIN LATERAL (SELECT count(*) AS cnt, sum(x.fine_amount) AS amt,
                          count(*) FILTER (WHERE x.status = 'notified'
                                             AND x.due_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS overdue
                   FROM violations x
                   WHERE x.vehicle_id = v.vehicle_id AND x.status IN ('verified', 'notified')) vio ON true
LEFT JOIN LATERAL (SELECT count(*) AS cnt
                   FROM registration_requests r
                   WHERE r.vehicle_id = v.vehicle_id
                     AND r.status IN ('pending_confirmation', 'pending_approval', 'needs_more_info')) rq ON true;
