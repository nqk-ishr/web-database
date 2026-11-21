-- Q05: Top 3 camera vi pham nhieu nhat moi thang trong 12 thang gan nhat (CTE + ham cua so)
WITH m AS (
  SELECT c.code, c.district, date_trunc('month', x.occurred_at)::date AS thang,
         count(*) AS so_vi_pham, sum(t.points) AS tong_diem, sum(x.fine_amount) AS tong_phat
  FROM violations x
  JOIN cameras c         ON c.id = x.camera_id
  JOIN violation_types t ON t.id = x.violation_type_id
  WHERE x.occurred_at >= date_trunc('month', now()) - interval '11 months'
  GROUP BY c.id, c.code, c.district, date_trunc('month', x.occurred_at)
)
SELECT * FROM (SELECT m.*, ROW_NUMBER() OVER (PARTITION BY thang ORDER BY so_vi_pham DESC, code) AS rn FROM m) s
WHERE rn <= 3 ORDER BY thang, rn;
