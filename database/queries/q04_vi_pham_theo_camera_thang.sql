-- Q04: Top 3 camera co nhieu vi pham nhat moi thang trong 12 thang gan nhat (CTE + ROW_NUMBER)
WITH m AS (
  SELECT c.code, c.location_name, date_trunc('month', x.occurred_at)::date AS thang,
         count(*) AS so_vi_pham, COALESCE(sum(x.fine_amount), 0) AS tong_phat
  FROM violations x JOIN cameras c ON c.camera_id = x.camera_id
  WHERE x.occurred_at >= date_trunc('month', now()) - interval '11 months'
  GROUP BY c.camera_id, c.code, c.location_name, date_trunc('month', x.occurred_at)
)
SELECT * FROM (SELECT m.*, ROW_NUMBER() OVER (PARTITION BY thang ORDER BY so_vi_pham DESC, code) AS rn FROM m) s
WHERE rn <= 3 ORDER BY thang, rn;
