-- Q05: Lich su vi pham cua mot xe, phan trang (man hinh "Xe cua toi")
SELECT x.violation_id, x.occurred_at, t.description AS loi, x.fine_amount, x.status, x.due_date
FROM violations x JOIN violation_types t ON t.violation_type_id = x.violation_type_id
WHERE x.vehicle_id = 100
ORDER BY x.occurred_at DESC
LIMIT 20 OFFSET 0;
