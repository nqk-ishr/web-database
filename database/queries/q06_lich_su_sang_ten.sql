-- Q06: Cac lan sang ten gan nhat: chu cu -> chu moi (LAG OVER, JOIN 4 bang)
WITH h AS (
  SELECT oh.vehicle_id, oh.owner_id, oh.valid_from,
         LAG(oh.owner_id) OVER (PARTITION BY oh.vehicle_id ORDER BY oh.valid_from) AS prev_owner
  FROM ownership_history oh
)
SELECT v.plate_number, pu.full_name AS chu_cu, nu.full_name AS chu_moi, h.valid_from AS ngay_sang_ten
FROM h
JOIN vehicles v ON v.vehicle_id = h.vehicle_id
JOIN users nu   ON nu.user_id = h.owner_id
JOIN users pu   ON pu.user_id = h.prev_owner
WHERE h.prev_owner IS NOT NULL
ORDER BY h.valid_from DESC
LIMIT 50;
