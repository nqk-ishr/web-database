-- Q04: Chu xe vi pham nhieu nhat (doi chieu chu xe TAI THOI DIEM vi pham; RANK)
SELECT * FROM (
  SELECT o.id AS owner_id, o.full_name, count(*) AS so_vi_pham, sum(x.fine_amount) AS tong_tien_phat,
         RANK() OVER (ORDER BY count(*) DESC) AS hang
  FROM violations x
  JOIN registrations r ON r.id = x.registration_id
  JOIN owners o        ON o.id = r.owner_id
  WHERE x.status <> 'cancelled'
  GROUP BY o.id, o.full_name
) t WHERE hang <= 10
ORDER BY hang, owner_id;
