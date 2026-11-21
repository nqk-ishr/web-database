-- View: tinh trang tong hop cua xe (dang ky hien hanh, nien han, dang kiem, no phat, khieu nai)
-- Dung cho: man hinh tra cuu xe cua chu xe, dashboard can bo, bao cao so xe theo tinh trang.
CREATE OR REPLACE VIEW v_vehicle_status AS
SELECT v.id                       AS vehicle_id,
       r.plate_number,
       o.id                       AS owner_id,
       o.full_name                AS owner_name,
       vt.code                    AS vehicle_type,
       v.manufacture_year,
       v.manufacture_year + vt.max_service_years AS service_end_year,
       CASE WHEN vt.max_service_years IS NULL THEN 'unlimited'
            WHEN extract(year FROM current_date) > v.manufacture_year + vt.max_service_years THEN 'expired'
            WHEN extract(year FROM current_date) >= v.manufacture_year + vt.max_service_years - 1 THEN 'near_expiry'
            ELSE 'valid' END      AS service_status,
       li.expires_at              AS inspection_expires_at,
       CASE WHEN li.expires_at IS NULL THEN 'none'
            WHEN li.expires_at < current_date THEN 'expired'
            WHEN li.expires_at <= current_date + 30 THEN 'expiring_30d'
            ELSE 'valid' END      AS inspection_status,
       COALESCE(uf.cnt, 0)        AS unpaid_count,
       COALESCE(uf.amt, 0)        AS unpaid_amount,
       COALESCE(pa.cnt, 0)        AS pending_appeals
FROM vehicles v
JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
LEFT JOIN registrations r ON r.vehicle_id = v.id AND r.status = 'active'
LEFT JOIN owners o        ON o.id = r.owner_id
LEFT JOIN LATERAL (SELECT max(i.expires_at) AS expires_at
                   FROM inspections i WHERE i.vehicle_id = v.id AND i.result = 'passed') li ON true
LEFT JOIN LATERAL (SELECT count(*) AS cnt, sum(x.fine_amount) AS amt
                   FROM violations x WHERE x.vehicle_id = v.id
                     AND x.status IN ('verified','notified','appealing')) uf ON true
LEFT JOIN LATERAL (SELECT count(*) AS cnt
                   FROM appeals a JOIN violations x ON x.id = a.violation_id
                   WHERE x.vehicle_id = v.id AND a.status = 'pending') pa ON true;
