-- Q01: Vi pham qua han nop phat (suy ra tu due_date) + phat tre uoc tinh 0,05%/ngay
SELECT x.violation_id, x.decision_number, u.full_name AS chu_xe, x.fine_amount, x.due_date,
       (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - x.due_date AS so_ngay_qua_han,
       round(x.fine_amount * 0.0005 * ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - x.due_date)) AS phat_tre_uoc_tinh
FROM violations x
JOIN users u ON u.user_id = x.liable_owner_id
WHERE x.status = 'notified' AND x.due_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
ORDER BY so_ngay_qua_han DESC, x.violation_id
LIMIT 50;
