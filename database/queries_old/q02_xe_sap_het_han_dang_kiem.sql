-- Q02: Xe co giay dang kiem moi nhat het han trong 30 ngay toi (NOT EXISTS: chua gia han)
SELECT i.vehicle_id, r.plate_number, o.full_name, o.phone, i.expires_at, i.expires_at - current_date AS con_ngay
FROM inspections i
JOIN registrations r ON r.vehicle_id = i.vehicle_id AND r.status = 'active'
JOIN owners o        ON o.id = r.owner_id
WHERE i.result = 'passed'
  AND i.expires_at BETWEEN current_date AND current_date + 30
  AND NOT EXISTS (SELECT 1 FROM inspections j
                  WHERE j.vehicle_id = i.vehicle_id AND j.result = 'passed' AND j.expires_at > i.expires_at)
ORDER BY i.expires_at
LIMIT 100;
