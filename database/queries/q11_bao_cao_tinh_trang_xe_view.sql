-- Q11: Bao cao so xe theo trang thai xe x tinh trang bao hiem (dung view v_vehicle_overview)
SELECT vehicle_status, insurance_status, count(*) AS so_xe, sum(unpaid_amount) AS tong_no_phat, sum(overdue_count) AS so_vp_qua_han
FROM v_vehicle_overview
GROUP BY vehicle_status, insurance_status
ORDER BY vehicle_status, insurance_status;
