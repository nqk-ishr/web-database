-- Q07: Ho so cho duyet lau nhat (man hinh can bo dang ky)
SELECT r.request_id, r.request_type, r.submitted_at, now()::date - r.submitted_at::date AS ngay_cho,
       u.full_name AS nguoi_gui, v.plate_number
FROM registration_requests r
JOIN users u ON u.user_id = r.requester_id
LEFT JOIN vehicles v ON v.vehicle_id = r.vehicle_id
WHERE r.status = 'pending_approval'
ORDER BY r.submitted_at
LIMIT 20;
