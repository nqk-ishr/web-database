-- Q11: Bao cao so xe theo tinh trang nien han x dang kiem (dung view v_vehicle_status)
SELECT service_status, inspection_status, count(*) AS so_xe, sum(unpaid_amount) AS tong_no_phat
FROM v_vehicle_status
GROUP BY service_status, inspection_status
ORDER BY service_status, inspection_status;
