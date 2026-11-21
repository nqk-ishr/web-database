-- Q01: Xe da qua nien han su dung (JOIN 4 bang, loc + sap xep + gioi han)
SELECT v.id AS vehicle_id, r.plate_number, vt.name AS loai_xe, v.manufacture_year, vt.max_service_years,
       extract(year FROM current_date)::int - v.manufacture_year - vt.max_service_years AS so_nam_qua_han,
       o.full_name AS chu_xe
FROM vehicles v
JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
JOIN registrations r  ON r.vehicle_id = v.id AND r.status = 'active'
JOIN owners o         ON o.id = r.owner_id
WHERE vt.max_service_years IS NOT NULL
  AND v.manufacture_year + vt.max_service_years < extract(year FROM current_date)
ORDER BY so_nam_qua_han DESC, v.id
LIMIT 50;
