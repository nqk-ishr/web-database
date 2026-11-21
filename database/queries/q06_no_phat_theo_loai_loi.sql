-- Q06: Tong tien phat chua nop theo loai loi, ty trong (SUM() OVER)
SELECT t.code, t.name, count(*) AS so_vi_pham, sum(x.fine_amount) AS tien_chua_nop,
       round(100.0 * sum(x.fine_amount) / sum(sum(x.fine_amount)) OVER (), 2) AS ty_trong_pct
FROM violations x JOIN violation_types t ON t.id = x.violation_type_id
WHERE x.status IN ('verified','notified','appealing')
GROUP BY t.id, t.code, t.name
ORDER BY tien_chua_nop DESC;
