-- Q08: Xe da sang ten tu 2 lan tro len, kem lich su chu so huu (CTE + COUNT/ROW_NUMBER OVER)
WITH h AS (
  SELECT r.vehicle_id, r.plate_number, o.full_name, r.valid_from, r.valid_to, r.status,
         count(*) OVER (PARTITION BY r.vehicle_id) AS so_lan,
         row_number() OVER (PARTITION BY r.vehicle_id ORDER BY r.valid_from) AS thu_tu
  FROM registrations r JOIN owners o ON o.id = r.owner_id
)
SELECT * FROM h WHERE so_lan >= 2 ORDER BY vehicle_id, thu_tu LIMIT 100;
