-- Q03: Xe con tien phat chua nop (tong hop + HAVING)
SELECT x.vehicle_id, r.plate_number, o.full_name, count(*) AS so_vi_pham,
       sum(x.fine_amount) AS tong_no, min(x.due_date) AS han_som_nhat
FROM violations x
JOIN registrations r ON r.vehicle_id = x.vehicle_id AND r.status = 'active'
JOIN owners o        ON o.id = r.owner_id
WHERE x.status IN ('verified','notified','appealing')
GROUP BY x.vehicle_id, r.plate_number, o.full_name
HAVING sum(x.fine_amount) >= 5000000
ORDER BY tong_no DESC
LIMIT 50;
