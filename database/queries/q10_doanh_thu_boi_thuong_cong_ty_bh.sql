-- Q10: Phi thu duoc va tien boi thuong theo cong ty bao hiem, ty le boi thuong (CTE + JOIN nhieu bang)
WITH prem AS (
  SELECT pr.insurer_id, sum(pp.amount) AS thu
  FROM policy_payments pp
  JOIN insurance_policies po ON po.policy_id = pp.policy_id
  JOIN insurance_products pr ON pr.product_id = po.product_id
  WHERE pp.status = 'success'
  GROUP BY pr.insurer_id),
clm AS (
  SELECT pr.insurer_id, count(*) AS so_yeu_cau,
         COALESCE(sum(c.approved_amount) FILTER (WHERE c.status IN ('approved', 'paid')), 0) AS da_duyet
  FROM insurance_claims c
  JOIN insurance_policies po ON po.policy_id = c.policy_id
  JOIN insurance_products pr ON pr.product_id = po.product_id
  GROUP BY pr.insurer_id)
SELECT i.name, prem.thu AS phi_thu_duoc, clm.so_yeu_cau, clm.da_duyet AS boi_thuong_da_duyet,
       round(100.0 * clm.da_duyet / prem.thu, 2) AS ty_le_boi_thuong_pct
FROM insurers i JOIN prem ON prem.insurer_id = i.insurer_id LEFT JOIN clm ON clm.insurer_id = i.insurer_id
ORDER BY i.insurer_id;
