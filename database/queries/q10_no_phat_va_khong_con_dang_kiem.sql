-- Q10: Xe dang no phat nhung KHONG con dang kiem hop le (NOT EXISTS)
SELECT d.vehicle_id, r.plate_number, o.full_name, d.tong_no
FROM (SELECT vehicle_id, sum(fine_amount) AS tong_no
      FROM violations WHERE vehicle_id IS NOT NULL AND status IN ('verified','notified','appealing')
      GROUP BY vehicle_id) d
JOIN registrations r ON r.vehicle_id = d.vehicle_id AND r.status = 'active'
JOIN owners o        ON o.id = r.owner_id
WHERE NOT EXISTS (SELECT 1 FROM inspections i
                  WHERE i.vehicle_id = d.vehicle_id AND i.result = 'passed' AND i.expires_at >= current_date)
ORDER BY d.tong_no DESC
LIMIT 50;
