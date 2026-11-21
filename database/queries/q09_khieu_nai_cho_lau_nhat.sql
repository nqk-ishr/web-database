-- Q09: Khieu nai dang cho xu ly lau nhat
SELECT a.id, a.created_at, now()::date - a.created_at::date AS ngay_cho, o.full_name, t.name AS loi, x.fine_amount, a.reason
FROM appeals a
JOIN violations x       ON x.id = a.violation_id
JOIN violation_types t  ON t.id = x.violation_type_id
JOIN owners o           ON o.id = a.owner_id
WHERE a.status = 'pending'
ORDER BY a.created_at
LIMIT 20;
