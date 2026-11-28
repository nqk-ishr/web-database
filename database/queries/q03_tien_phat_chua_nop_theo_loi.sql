-- Q03: Tien phat chua nop theo loai loi, ty trong (SUM() OVER)
SELECT t.code, t.description, count(*) AS so_vi_pham, sum(x.fine_amount) AS tien_chua_nop,
       round(100.0 * sum(x.fine_amount) / sum(sum(x.fine_amount)) OVER (), 2) AS ty_trong_pct
FROM violations x JOIN violation_types t ON t.violation_type_id = x.violation_type_id
WHERE x.status = 'notified'
GROUP BY t.violation_type_id, t.code, t.description
ORDER BY tien_chua_nop DESC;
