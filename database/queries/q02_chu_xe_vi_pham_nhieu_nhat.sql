-- Q02: Chu xe vi pham nhieu nhat - tinh theo chu xe TAI THOI DIEM vi pham (RANK)
SELECT * FROM (
  SELECT u.user_id, u.full_name, count(*) AS so_vi_pham, COALESCE(sum(x.fine_amount), 0) AS tong_tien_phat,
         RANK() OVER (ORDER BY count(*) DESC) AS hang
  FROM violations x
  JOIN users u ON u.user_id = x.liable_owner_id
  WHERE x.status <> 'cancelled'
  GROUP BY u.user_id, u.full_name
) t WHERE hang <= 10
ORDER BY hang, user_id;
