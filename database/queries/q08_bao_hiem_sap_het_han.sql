-- Q08: Hop dong bao hiem het han trong 30 ngay toi ma chua gia han (NOT EXISTS)
SELECT p.policy_id, p.certificate_code, v.plate_number, u.full_name AS chu_xe, p.end_date,
       p.end_date - (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS con_ngay
FROM insurance_policies p
JOIN vehicles v ON v.vehicle_id = p.vehicle_id
JOIN users u    ON u.user_id = p.buyer_id
WHERE p.status = 'active'
  AND p.end_date BETWEEN (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 30
  AND NOT EXISTS (SELECT 1 FROM insurance_policies n
                  WHERE n.vehicle_id = p.vehicle_id AND n.policy_id <> p.policy_id
                    AND n.status IN ('active', 'pending_payment') AND n.end_date > p.end_date)
ORDER BY p.end_date
LIMIT 100;
