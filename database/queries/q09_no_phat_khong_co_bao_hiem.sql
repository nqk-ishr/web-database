-- Q09: Xe dang no phat ma khong co bao hiem hieu luc (truy van con + NOT EXISTS)
SELECT d.vehicle_id, v.plate_number, d.so_vi_pham, d.tong_no
FROM (SELECT vehicle_id, count(*) AS so_vi_pham, sum(fine_amount) AS tong_no
      FROM violations
      WHERE vehicle_id IS NOT NULL AND status IN ('verified', 'notified')
      GROUP BY vehicle_id) d
JOIN vehicles v ON v.vehicle_id = d.vehicle_id
WHERE NOT EXISTS (SELECT 1 FROM insurance_policies p
                  WHERE p.vehicle_id = d.vehicle_id AND p.status = 'active'
                    AND p.end_date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
ORDER BY d.tong_no DESC NULLS LAST
LIMIT 50;
