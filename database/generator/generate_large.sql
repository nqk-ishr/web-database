-- ============================================================================
-- generate_large.sql - Sinh bo du lieu LON cho schema.sql (16 bang) bang SQL thuan
-- Chay:  psql -d <db> -f database/schema.sql
--        psql -d <db> -f database/generator/generate_large.sql
-- Doi quy mo:  -v n_viol=500000 -v n_vehicles=100000 -v n_owners=80000 -v n_cameras=300
-- Tai lap duoc (setseed + cong thuc theo id). Mat khau moi tai khoan: Demo@123 (bcrypt).
-- Cach nap giong seed.sql cua nhom: tam tat trigger nguoi dung de nap lich su, CHECK/UNIQUE/EXCLUDE
-- van hieu luc; khoi DO cuoi file kiem tra lai cac quy tac lien bang (sai => ROLLBACK toan bo).
-- Cac bang can TRONG: file TRUNCATE toan bo truoc khi sinh.
-- ============================================================================
\set ON_ERROR_STOP on
\if :{?n_owners}   \else \set n_owners   60000  \endif
\if :{?n_vehicles} \else \set n_vehicles 75000  \endif
\if :{?n_viol}     \else \set n_viol     300000 \endif
\if :{?n_cameras}  \else \set n_cameras  300    \endif
\timing on
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT crypt('Demo@123', gen_salt('bf', 8)) AS pw \gset
SELECT setseed(0.42);

BEGIN;
ALTER TABLE users                 DISABLE TRIGGER USER;
ALTER TABLE vehicles              DISABLE TRIGGER USER;
ALTER TABLE registration_requests DISABLE TRIGGER USER;
ALTER TABLE violations            DISABLE TRIGGER USER;
ALTER TABLE payments              DISABLE TRIGGER USER;
ALTER TABLE insurance_policies    DISABLE TRIGGER USER;
ALTER TABLE policy_payments       DISABLE TRIGGER USER;
ALTER TABLE insurance_claims      DISABLE TRIGGER USER;

TRUNCATE vehicle_status_history, insurance_claims, policy_payments, insurance_policies, insurance_products,
         payments, violations, registration_requests, ownership_history, vehicles, cameras,
         violation_types, vehicle_types, users, insurers, roles RESTART IDENTITY CASCADE;

-- ---- ham tro giup (chi ton tai trong phien) --------------------------------
-- bien so: don anh theo id, khong bao gio trung, luon IN HOA
CREATE FUNCTION pg_temp.plate(g bigint) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT (10 + g % 80)::text || chr(65 + (g % 7)::int) || '-' || lpad((g / 80)::text, 5, '0') $$;
-- chu so huu dau (A) va chu moi sau khi sang ten (B); user_id chu xe bat dau tu 33
CREATE FUNCTION pg_temp.own_a(g bigint, n int) RETURNS bigint LANGUAGE sql IMMUTABLE AS
$$ SELECT 33 + (g::bigint * 13) % n $$;
CREATE FUNCTION pg_temp.own_b(g bigint, n int) RETURNS bigint LANGUAGE sql IMMUTABLE AS
$$ SELECT 33 + (g::bigint * 13 + 1 + g % 1000) % n $$;
CREATE FUNCTION pg_temp.first_from(g bigint) RETURNS timestamptz LANGUAGE sql STABLE AS
$$ SELECT now() - make_interval(days => (800 + (g * 53) % 2000)::int) $$;
CREATE FUNCTION pg_temp.xfer(g bigint) RETURNS timestamptz LANGUAGE sql STABLE AS
$$ SELECT now() - make_interval(days => (10 + (g * 37) % 700)::int) $$;
CREATE FUNCTION pg_temp.today() RETURNS date LANGUAGE sql STABLE AS
$$ SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date $$;
-- xe bi bao mat (g chia het 250, khong chia het 500 => khong sang ten); 1 phan ba trong do bi thu hoi
CREATE FUNCTION pg_temp.is_stolen(g bigint) RETURNS boolean LANGUAGE sql IMMUTABLE AS
$$ SELECT g % 250 = 0 AND g % 500 <> 0 $$;

-- ---- 1. DANH MUC -------------------------------------------------------------
INSERT INTO roles (role_id, code, name) OVERRIDING SYSTEM VALUE VALUES
 (1,'owner','Chủ phương tiện'),(2,'registrar','Cán bộ đăng ký phương tiện'),
 (3,'violation_officer','Cán bộ xử lý vi phạm'),(4,'insurance_staff','Nhân viên bảo hiểm'),
 (5,'admin','Quản trị hệ thống');
INSERT INTO insurers (insurer_id, code, name, hotline) OVERRIDING SYSTEM VALUE VALUES
 (1,'DEMO_A','Công ty Bảo hiểm Demo A','1900000001'),(2,'DEMO_B','Công ty Bảo hiểm Demo B','1900000002');
INSERT INTO vehicle_types (vehicle_type_id, name, usage_purpose) OVERRIDING SYSTEM VALUE VALUES
 (1,'Xe máy dưới 175cc','cá nhân'),(2,'Mô tô phân khối lớn','cá nhân'),(3,'Ô tô sedan','cá nhân'),
 (4,'Ô tô SUV','cá nhân'),(5,'Ô tô MPV 7 chỗ','cá nhân'),(6,'Taxi điện','kinh doanh vận tải'),
 (7,'Xe hợp đồng công nghệ','kinh doanh vận tải'),(8,'Xe khách 45 chỗ','kinh doanh vận tải'),
 (9,'Xe tải 5 tấn','kinh doanh vận tải'),(10,'Xe đầu kéo','kinh doanh vận tải');
-- 6 loi cua nhom + 24 loi bo sung (muc phat minh hoa)
INSERT INTO violation_types (violation_type_id, code, description, min_fine, max_fine) OVERRIDING SYSTEM VALUE VALUES
 (1,'RED_LIGHT_CAR','Ô tô vượt đèn đỏ: không chấp hành tín hiệu đèn giao thông',18000000,20000000),
 (2,'RED_LIGHT_MOTO','Xe máy, mô tô vượt đèn đỏ: không chấp hành tín hiệu đèn giao thông',4000000,6000000),
 (3,'SPEED_OVER_20','Ô tô quá tốc độ trên 20 đến 35 km/h',12000000,14000000),
 (4,'RESERVED_LANE','Đi vào làn đường dành riêng',2000000,3000000),
 (5,'STOP_LINE','Dừng xe quá vạch dừng',400000,600000),
 (6,'NO_COMPULSORY_INSURANCE','Không có bảo hiểm bắt buộc còn hiệu lực',200000,600000);
INSERT INTO violation_types (violation_type_id, code, description, min_fine, max_fine) OVERRIDING SYSTEM VALUE
SELECT g, 'VT' || lpad(g::text,3,'0'), 'Lỗi vi phạm giao thông số ' || g,
       200000 * (1 + g % 5), 200000 * (1 + g % 5) + 200000 * (g % 4)
FROM generate_series(7, 30) g;
INSERT INTO cameras (camera_id, code, location_name) OVERRIDING SYSTEM VALUE
SELECT g, 'CAM-SG-' || lpad(g::text,3,'0'),
       (ARRAY['Ngã tư Hàng Xanh','Vòng xoay Dân Chủ','Cầu Sài Gòn','Ngã sáu Phù Đổng','Ngã tư Bảy Hiền',
              'Cầu Phú Mỹ','Ngã tư An Sương','Nút giao Mỹ Thủy','Ngã ba Cát Lái','Ngã tư Thủ Đức'])[1 + g % 10]
       || ', ' ||
       (ARRAY['Điện Biên Phủ','Võ Văn Tần','Xa lộ Hà Nội','Trần Hưng Đạo','Cách Mạng Tháng Tám',
              'Nguyễn Văn Linh','Quốc lộ 22','Mai Chí Thọ','Đồng Văn Cống','Võ Văn Ngân'])[1 + (g/10) % 10]
       || ', ' ||
       (ARRAY['Bình Thạnh','Quận 3','Thành phố Thủ Đức','Quận 1','Tân Bình','Quận 7','Quận 12','Gò Vấp'])[1 + g % 8]
FROM generate_series(1, :n_cameras) g;
-- moi cong ty x moi loai xe x {Co ban, Mo rong (co mat cap)}: id = 1 + (cty-1)*20 + (loai-1)*2 + bien the
INSERT INTO insurance_products (product_id, insurer_id, vehicle_type_id, name, premium, term_months, liability_limit, includes_theft)
OVERRIDING SYSTEM VALUE
SELECT 1 + (i-1)*20 + (t-1)*2 + v, i, t,
       CASE v WHEN 0 THEN 'Cơ bản' ELSE 'Mở rộng (có mất cắp)' END,
       round((CASE t WHEN 1 THEN 70000 WHEN 2 THEN 180000 WHEN 3 THEN 480000 WHEN 4 THEN 520000 WHEN 5 THEN 500000
                     WHEN 6 THEN 1100000 WHEN 7 THEN 900000 WHEN 8 THEN 3000000 WHEN 9 THEN 2000000 ELSE 3500000 END)
             * (CASE v WHEN 0 THEN 1.0 ELSE 3.5 END) * (CASE i WHEN 1 THEN 1.0 ELSE 0.95 END), -3),
       12, 150000000, v = 1
FROM generate_series(1,2) i, generate_series(1,10) t, generate_series(0,1) v;

-- ---- 2. NGUOI DUNG -----------------------------------------------------------
-- 1-10 can bo dang ky | 11-25 can bo xu ly vi pham | 26-31 nhan vien bao hiem | 32 quan tri | 33.. chu xe
INSERT INTO users (user_id, role_id, insurer_id, username, password_hash, full_name, citizen_id, phone, email)
OVERRIDING SYSTEM VALUE
SELECT g, 2, NULL::int, 'canbo_dk' || lpad(g::text,2,'0'), :'pw', 'Cán bộ đăng ký ' || g, NULL::text,
       '0902' || lpad(g::text,6,'0'), 'dk' || g || '@giaothong.example' FROM generate_series(1,10) g
UNION ALL
SELECT g, 3, NULL, 'canbo_vp' || lpad((g-10)::text,2,'0'), :'pw', 'Cán bộ xử lý vi phạm ' || (g-10), NULL,
       '0903' || lpad(g::text,6,'0'), 'vp' || (g-10) || '@giaothong.example' FROM generate_series(11,25) g
UNION ALL
SELECT g, 4, CASE WHEN g <= 28 THEN 1 ELSE 2 END, 'bh_' || (CASE WHEN g <= 28 THEN 'a' ELSE 'b' END) || lpad(((g-26) % 3 + 1)::text,2,'0'),
       :'pw', 'Nhân viên bảo hiểm ' || (g-25), NULL, '0904' || lpad(g::text,6,'0'), 'bh' || (g-25) || '@baohiem.example'
FROM generate_series(26,31) g
UNION ALL
SELECT 32, 5, NULL, 'admin', :'pw', 'Quản trị hệ thống', NULL, '0905000032', 'admin@giaothong.example';

CREATE FUNCTION pg_temp.person(g int) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Phan','Vũ','Đặng','Bùi','Đỗ'])[1 + g % 10] || ' ' ||
          (ARRAY['Văn','Thị','Quang','Thu','Xuân','Minh'])[1 + (g/10) % 6] || ' ' ||
          (ARRAY['An','Bình','Cường','Dũng','Hải','Huế','Khánh','Khoa','Lan','Nam','Phúc','Trang'])[1 + (g/7) % 12] $$;
-- chu xe: cu 33 nguoi la 1 to chuc (khong co CCCD)
INSERT INTO users (user_id, role_id, username, password_hash, full_name, citizen_id, phone, email, created_at)
OVERRIDING SYSTEM VALUE
SELECT 32 + g, 1, 'owner_' || lpad(g::text,6,'0'), :'pw',
       CASE WHEN g % 33 = 0 THEN 'Công ty TNHH Vận tải ' || g ELSE pg_temp.person(g) END,
       CASE WHEN g % 33 = 0 THEN NULL ELSE '079' || lpad(g::text,9,'0') END,
       '09' || lpad((g::bigint * 7919 % 100000000)::text,8,'0'), 'owner' || g || '@example.com',
       now() - make_interval(days => (800 + (g * 53) % 2000)::int)
FROM generate_series(1, :n_owners) g;

-- ---- 3. XE VA LICH SU SO HUU ------------------------------------------------
WITH v AS MATERIALIZED (SELECT g, random() u1, random() u2 FROM generate_series(1, :n_vehicles) g)
INSERT INTO vehicles (vehicle_id, plate_number, chassis_number, engine_number, manufacture_year, vehicle_type_id, status, created_at)
OVERRIDING SYSTEM VALUE
SELECT g, pg_temp.plate(g), 'CH' || lpad(g::text,10,'0'), 'EN' || lpad(g::text,10,'0'),
       GREATEST(1990, extract(year FROM now())::int - floor(power(u1, 1.7) * 25)::int),
       CASE WHEN u2 < .55 THEN 1 WHEN u2 < .60 THEN 2 WHEN u2 < .72 THEN 3 WHEN u2 < .80 THEN 4 WHEN u2 < .85 THEN 5
            WHEN u2 < .88 THEN 6 WHEN u2 < .92 THEN 7 WHEN u2 < .94 THEN 8 WHEN u2 < .97 THEN 9 ELSE 10 END,
       CASE WHEN pg_temp.is_stolen(g) THEN (CASE WHEN g % 750 = 0 THEN 'revoked' ELSE 'stolen' END)::vehicle_status
            ELSE 'normal' END,
       pg_temp.first_from(g)
FROM v;
-- 25% xe da sang ten 1 lan: chu A [first_from, xfer) roi chu B [xfer, hien tai)
INSERT INTO ownership_history (vehicle_id, owner_id, valid_from, valid_to)
SELECT g, pg_temp.own_a(g,:n_owners), pg_temp.first_from(g), pg_temp.xfer(g) FROM generate_series(1,:n_vehicles) g WHERE g % 4 = 0
UNION ALL
SELECT g, pg_temp.own_a(g,:n_owners), pg_temp.first_from(g), NULL FROM generate_series(1,:n_vehicles) g WHERE g % 4 <> 0
UNION ALL
SELECT g, pg_temp.own_b(g,:n_owners), pg_temp.xfer(g), NULL FROM generate_series(1,:n_vehicles) g WHERE g % 4 = 0;

-- ---- 4. VI PHAM ---------------------------------------------------------------
-- (a) vi pham khop xe: xe "nong" bi phat nhieu (power), thoi diem ngau nhien trong 2 nam,
--     liable_owner_id = chu xe TAI THOI DIEM vi pham (tra tu ownership_history).
WITH pick AS MATERIALIZED (
  SELECT g, 1 + floor(power(random(), 1.4) * :n_vehicles)::int AS vid,
         now() - random() * interval '730 days' AS occ,
         1 + floor(power(random(), 1.3) * 30)::int AS vt,
         1 + floor(random() * :n_cameras)::int AS cam,
         random() AS ust, random() AS uf, random() AS ud
  FROM generate_series(1, :n_viol - :n_viol / 50) g),
j AS (
  SELECT p.*, v.plate_number, o.owner_id, t.min_fine, t.max_fine,
         CASE WHEN p.occ > now() - interval '10 days' THEN 'recorded'
              WHEN p.ust < .03 THEN 'recorded' WHEN p.ust < .06 THEN 'verified'
              WHEN p.ust < .30 THEN 'notified' WHEN p.ust < .93 THEN 'paid'
              ELSE 'cancelled' END::violation_status AS st
  FROM pick p
  JOIN vehicles v          ON v.vehicle_id = p.vid
  JOIN ownership_history o ON o.vehicle_id = p.vid AND tstzrange(o.valid_from, o.valid_to) @> p.occ
  JOIN violation_types t   ON t.violation_type_id = p.vt),
k AS (
  SELECT j.*,
         CASE WHEN st <> 'recorded' THEN occ + interval '1 day' * (1 + ud * 2) END AS ver_at,
         CASE WHEN st IN ('notified','paid') THEN occ + interval '1 day' * (2 + ud * 3) END AS not_at
  FROM j)
INSERT INTO violations (vehicle_id, plate_number_captured, liable_owner_id, violation_type_id, camera_id, occurred_at,
                        status, fine_amount, decision_number, due_date, handled_by, verified_at, notified_at,
                        cancelled_reason, created_at, updated_at)
SELECT vid, plate_number, owner_id, vt, cam, occ, st,
       CASE WHEN st IN ('notified','paid')
            THEN LEAST(max_fine, min_fine + round(uf * (max_fine - min_fine) / 10000) * 10000) END,
       CASE WHEN st IN ('notified','paid') THEN 'QD-' || lpad(g::text, 8, '0') END,
       CASE WHEN st IN ('notified','paid') THEN (not_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 30 END,
       CASE WHEN st <> 'recorded' THEN 11 + g % 15 END,
       ver_at, not_at,
       CASE WHEN st = 'cancelled' THEN (ARRAY['Biển số bị nhận nhầm','Ảnh không rõ biển số','Xe đã bán nhưng chưa sang tên','Đèn tín hiệu lỗi'])[1 + g % 4] END,
       occ + interval '5 minutes', COALESCE(not_at, ver_at, occ + interval '5 minutes')
FROM k ORDER BY occ;
-- (b) 2% bien so khong khop xe nao (vehicle_id NULL): chi o trang thai Moi ghi nhan hoac Da huy
INSERT INTO violations (vehicle_id, plate_number_captured, violation_type_id, camera_id, occurred_at, status, cancelled_reason)
SELECT NULL, '99Z-' || lpad((90000 + g)::text, 5, '0'), 1 + g % 6, 1 + g % :n_cameras,
       now() - random() * interval '700 days',
       (CASE WHEN g % 5 = 0 THEN 'cancelled' ELSE 'recorded' END)::violation_status,
       CASE WHEN g % 5 = 0 THEN 'Biển số không khớp xe nào' END
FROM generate_series(1, :n_viol / 50) g;

-- ---- 5. NOP PHAT --------------------------------------------------------------
-- giao dich thanh cong: nop sau 1-40 ngay ke tu luc thong bao; qua han thi phat tre 0,05%/ngay (nhu seed.sql)
INSERT INTO payments (violation_id, paid_by, fine_amount, late_fee, status, gateway_ref, created_at, paid_at)
SELECT v.violation_id, v.liable_owner_id, v.fine_amount,
       round(v.fine_amount * 0.0005 * GREATEST(0, (v.pt AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - v.due_date)),
       'success', 'GW' || lpad(v.violation_id::text, 10, '0'), v.pt, v.pt
FROM (SELECT x.*, LEAST(x.notified_at + interval '1 day' * (1 + x.violation_id % 40), now()) AS pt
      FROM violations x WHERE x.status = 'paid') v;
-- lan nop that bai (loi cong thanh toan): 1/12 vi pham da thong bao hoac da nop
INSERT INTO payments (violation_id, paid_by, fine_amount, late_fee, status, gateway_ref, created_at, paid_at)
SELECT violation_id, liable_owner_id, fine_amount, 0, 'failed', 'GWF' || lpad(violation_id::text, 10, '0'),
       notified_at + interval '12 hours', NULL
FROM violations WHERE status IN ('notified','paid') AND violation_id % 12 = 0;

-- ---- 6. HO SO DANG KY MOI / SANG TEN ----------------------------------------
CREATE FUNCTION pg_temp.vn(d date) RETURNS timestamptz LANGUAGE sql IMMUTABLE AS
$$ SELECT d::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' $$;
-- chu xe tai thoi diem t (xe sang ten: A truoc xfer, B sau xfer)
CREATE FUNCTION pg_temp.owner_at(g bigint, n int, t timestamptz) RETURNS bigint LANGUAGE sql STABLE AS
$$ SELECT CASE WHEN g % 4 = 0 AND t >= pg_temp.xfer(g) THEN pg_temp.own_b(g, n) ELSE pg_temp.own_a(g, n) END $$;

-- (a) moi xe da sang ten co 1 ho so sang ten da duyet
INSERT INTO registration_requests (request_type, status, vehicle_id, requester_id, buyer_id, reviewer_id, submitted_at, updated_at)
SELECT 'transfer', 'approved', g, pg_temp.own_a(g,:n_owners), pg_temp.own_b(g,:n_owners), 1 + g % 10,
       pg_temp.xfer(g) - interval '3 days', pg_temp.xfer(g)
FROM generate_series(1, :n_vehicles) g WHERE g % 4 = 0;
-- (b) 20% xe co ho so dang ky moi da duyet
INSERT INTO registration_requests (request_type, status, vehicle_id, requester_id, declared_vehicle_type_id,
       declared_chassis_number, declared_engine_number, declared_manufacture_year, reviewer_id, submitted_at, updated_at)
SELECT 'new_registration', 'approved', v.vehicle_id, pg_temp.own_a(v.vehicle_id,:n_owners), v.vehicle_type_id,
       v.chassis_number, v.engine_number, v.manufacture_year, 1 + v.vehicle_id % 10,
       v.created_at - interval '2 days', v.created_at
FROM vehicles v WHERE v.vehicle_id % 5 = 0;
-- (c) ho so sang ten dang mo / bi tu choi / bi huy (xe Binh thuong, khong no phat chua nop - dung quy tac nghiep vu)
INSERT INTO registration_requests (request_type, status, vehicle_id, requester_id, buyer_id, reviewer_id, review_note,
                                   cancel_reason, submitted_at, updated_at)
SELECT 'transfer', q.st, q.v, q.req, 33 + ((q.req - 33) + 1 + q.v % 1000) % :n_owners,
       CASE WHEN q.st IN ('rejected','needs_more_info') THEN 1 + q.v % 10 END,
       CASE q.st WHEN 'rejected' THEN 'Hồ sơ không hợp lệ' WHEN 'needs_more_info' THEN 'Cần bổ sung giấy tờ xe' END,
       CASE WHEN q.st = 'cancelled' THEN 'Người gửi hủy hồ sơ' END,
       q.sub, LEAST(q.sub + interval '2 hours', now())
FROM (
  SELECT c.v,
         (CASE WHEN c.u < .30 THEN 'pending_confirmation' WHEN c.u < .60 THEN 'pending_approval'
               WHEN c.u < .75 THEN 'needs_more_info'      WHEN c.u < .90 THEN 'rejected' ELSE 'cancelled' END)::request_status AS st,
         pg_temp.owner_at(c.v, :n_owners, now()) AS req,
         now() - c.u2 * interval '20 days' AS sub
  FROM (SELECT 1 + ((k::bigint * 7919) % :n_vehicles)::int AS v, random() AS u, random() AS u2
        FROM generate_series(1, :n_vehicles / 25) k) c
  JOIN vehicles ve ON ve.vehicle_id = c.v AND ve.status = 'normal'
  WHERE NOT EXISTS (SELECT 1 FROM violations x WHERE x.vehicle_id = c.v AND x.status IN ('verified','notified'))
) q;
-- (d) ho so dang ky moi chua thanh cong (chua co xe)
INSERT INTO registration_requests (request_type, status, requester_id, declared_vehicle_type_id, declared_chassis_number,
       declared_engine_number, declared_manufacture_year, reviewer_id, review_note, cancel_reason, submitted_at, updated_at)
SELECT 'new_registration', q.st, 33 + (q.k::bigint * 29) % :n_owners, 1 + q.k % 10,
       'NEWCH' || lpad(q.k::text, 8, '0'), 'NEWEN' || lpad(q.k::text, 8, '0'), 2020 + q.k % 7,
       CASE WHEN q.st IN ('rejected','needs_more_info') THEN 1 + q.k % 10 END,
       CASE q.st WHEN 'rejected' THEN 'Số khung không khớp giấy tờ' WHEN 'needs_more_info' THEN 'Thiếu hóa đơn mua xe' END,
       CASE WHEN q.st = 'cancelled' THEN 'Người gửi hủy hồ sơ' END,
       now() - (q.k % 30) * interval '1 day', now() - (q.k % 30) * interval '1 day' + interval '1 hour'
FROM (SELECT k, (CASE k % 10 WHEN 0 THEN 'pending_approval' WHEN 1 THEN 'pending_approval' WHEN 2 THEN 'pending_approval'
                       WHEN 3 THEN 'pending_approval' WHEN 4 THEN 'pending_approval' WHEN 5 THEN 'needs_more_info'
                       WHEN 6 THEN 'needs_more_info' WHEN 7 THEN 'rejected' WHEN 8 THEN 'rejected' ELSE 'cancelled' END)::request_status AS st
      FROM generate_series(1, :n_vehicles / 50) k) q;

-- ---- 7. BAO HIEM ------------------------------------------------------------
-- ~60% xe co hop dong: 45% con hieu luc, 10% da het han (van status active), 2,5% cho thanh toan, 2,5% da huy;
-- 1/3 xe con hieu luc co them hop dong ky truoc (gia han lien ke); xe bi bao mat luon co goi "co mat cap".
WITH base AS (
  SELECT v.vehicle_id::int AS g, v.vehicle_type_id AS tid, (v.vehicle_id::bigint * 7919 % 100) AS r, pg_temp.is_stolen(v.vehicle_id) AS stolen
  FROM vehicles v),
cls AS (
  SELECT g, tid, stolen,
         CASE WHEN stolen OR r < 45 THEN 'valid' WHEN r < 55 THEN 'expired' WHEN r < 58 THEN 'pending' WHEN r < 60 THEN 'cancelled' END AS c
  FROM base),
pol AS (
  SELECT g, tid, c, stolen, 1 + g % 2 AS ins, CASE WHEN stolen THEN 1 ELSE (g / 2) % 2 END AS var,
         CASE c WHEN 'valid'     THEN pg_temp.today() - CASE WHEN stolen THEN 30 + g % 300 ELSE (g * 17) % 360 END
                WHEN 'expired'   THEN pg_temp.today() - (400 + g % 300)
                WHEN 'pending'   THEN pg_temp.today() - (g % 5)
                WHEN 'cancelled' THEN pg_temp.today() - (g % 200) END AS sd
  FROM cls WHERE c IS NOT NULL),
q AS (
  SELECT p.*, pr.product_id, pr.term_months, pr.premium, pr.liability_limit, pr.includes_theft,
         CASE WHEN p.c = 'pending' THEN now() - interval '1 day' ELSE pg_temp.vn(p.sd) - interval '3 days' END AS created
  FROM pol p JOIN insurance_products pr ON pr.product_id = 1 + (p.ins - 1) * 20 + (p.tid - 1) * 2 + p.var)
INSERT INTO insurance_policies (policy_id, certificate_code, vehicle_id, product_id, buyer_id, start_date, end_date, premium,
                                liability_limit, includes_theft, status, created_at, cancelled_at) OVERRIDING SYSTEM VALUE
SELECT row_number() OVER (ORDER BY g),
       CASE WHEN c IN ('valid','expired') THEN 'BH-' || lpad((row_number() OVER (ORDER BY g))::text, 10, '0') END,
       g, product_id, pg_temp.owner_at(g, :n_owners, created), sd, (sd + make_interval(months => term_months))::date - 1,
       premium, liability_limit, includes_theft,
       (CASE c WHEN 'pending' THEN 'pending_payment' WHEN 'cancelled' THEN 'cancelled' ELSE 'active' END)::policy_status,
       created, CASE WHEN c = 'cancelled' THEN created + interval '1 day' END
FROM q;
-- hop dong ky truoc (gia han lien ke) cho 1/3 xe con hieu luc, khong bi mat
INSERT INTO insurance_policies (policy_id, certificate_code, vehicle_id, product_id, buyer_id, start_date, end_date, premium,
                                liability_limit, includes_theft, status, created_at) OVERRIDING SYSTEM VALUE
SELECT (SELECT max(policy_id) FROM insurance_policies) + row_number() OVER (ORDER BY c.vehicle_id),
       'BH-' || lpad(((SELECT max(policy_id) FROM insurance_policies) + row_number() OVER (ORDER BY c.vehicle_id))::text, 10, '0'),
       c.vehicle_id, c.product_id, pg_temp.owner_at(c.vehicle_id, :n_owners, pg_temp.vn(ps.d) - interval '3 days'),
       ps.d, (ps.d + make_interval(months => pr.term_months))::date - 1, c.premium, c.liability_limit, c.includes_theft,
       'active', pg_temp.vn(ps.d) - interval '3 days'
FROM insurance_policies c
JOIN insurance_products pr ON pr.product_id = c.product_id
CROSS JOIN LATERAL (SELECT (c.start_date - interval '12 months')::date AS d) ps
WHERE c.status = 'active' AND c.end_date >= pg_temp.today() AND c.vehicle_id % 3 = 0 AND NOT pg_temp.is_stolen(c.vehicle_id);

-- phi bao hiem: hop dong hieu luc co dung 1 giao dich thanh cong dung bang phi; mot so lan that bai
INSERT INTO policy_payments (policy_id, paid_by, amount, status, gateway_ref, created_at, paid_at)
SELECT policy_id, buyer_id, premium, 'success'::txn_status, 'PP' || lpad(policy_id::text, 10, '0'),
       pg_temp.vn(start_date) - interval '1 day', pg_temp.vn(start_date) - interval '1 day'
FROM insurance_policies WHERE status = 'active'
UNION ALL
SELECT policy_id, buyer_id, premium, 'failed', 'PPF' || lpad(policy_id::text, 10, '0'),
       pg_temp.vn(start_date) - interval '26 hours', NULL
FROM insurance_policies WHERE status = 'active' AND policy_id % 10 = 0
UNION ALL
SELECT policy_id, buyer_id, premium, 'failed', 'PPF' || lpad(policy_id::text, 10, '0'), now() - interval '20 hours', NULL
FROM insurance_policies WHERE status = 'pending_payment' AND policy_id % 3 = 0;

-- ---- 8. YEU CAU BOI THUONG ----------------------------------------------------
-- (a) mat cap: xe bi bao mat (hop dong co quyen loi mat cap), da duyet hoac da chi tra
INSERT INTO insurance_claims (policy_id, claim_type, claimant_id, event_time, event_location, description,
                              requested_amount, approved_amount, status, reviewer_id, paid_at, created_at, updated_at)
SELECT p.policy_id, 'theft', pg_temp.own_a(p.vehicle_id, :n_owners), pg_temp.vn(p.start_date) + interval '3 days',
       'Bãi giữ xe, TP. Hồ Chí Minh', 'Mất cắp xe tại bãi giữ xe',
       r.amt, round(r.amt * 0.9, -3),
       (CASE WHEN p.policy_id % 2 = 0 THEN 'paid' ELSE 'approved' END)::claim_status,
       CASE pr.insurer_id WHEN 1 THEN 26 + p.vehicle_id % 3 ELSE 29 + p.vehicle_id % 3 END,
       CASE WHEN p.policy_id % 2 = 0 THEN pg_temp.vn(p.start_date) + interval '3 days' + interval '25 days' END,
       pg_temp.vn(p.start_date) + interval '3 days' + interval '2 hours',
       pg_temp.vn(p.start_date) + interval '3 days' + interval '25 days'
FROM insurance_policies p
JOIN insurance_products pr ON pr.product_id = p.product_id
CROSS JOIN LATERAL (SELECT (30000000 + (p.vehicle_id % 20) * 1000000)::numeric AS amt) r
WHERE p.status = 'active' AND p.includes_theft AND pg_temp.is_stolen(p.vehicle_id) AND p.end_date >= pg_temp.today();
-- (b) tai nan: ~1/40 hop dong hieu luc cua xe chua sang ten va khong bi mat; du 6 trang thai
INSERT INTO insurance_claims (policy_id, claim_type, claimant_id, event_time, event_location, description,
                              requested_amount, approved_amount, status, reviewer_id, review_note, cancel_reason,
                              paid_at, created_at, updated_at)
SELECT q.policy_id, 'accident', pg_temp.own_a(q.vehicle_id, :n_owners), q.ev, 'Ngã tư, TP. Hồ Chí Minh',
       'Va chạm giao thông',
       q.amt, CASE WHEN q.st IN ('approved','paid') THEN round(q.amt * 0.8, -3) END, q.st,
       CASE WHEN q.st IN ('approved','paid','rejected','needs_more_info')
            THEN CASE q.insurer_id WHEN 1 THEN 26 + q.vehicle_id % 3 ELSE 29 + q.vehicle_id % 3 END END,
       CASE q.st WHEN 'rejected' THEN 'Không thuộc phạm vi bảo hiểm' WHEN 'needs_more_info' THEN 'Cần bổ sung biên bản tai nạn' END,
       CASE WHEN q.st = 'cancelled' THEN 'Người yêu cầu rút hồ sơ' END,
       CASE WHEN q.st = 'paid' THEN LEAST(q.ev + interval '20 days', now()) END,
       q.ev + interval '3 hours', LEAST(q.ev + interval '1 day', now())
FROM (
  SELECT p.policy_id, p.vehicle_id, pr.insurer_id, (2000000 + (p.policy_id % 30) * 2000000)::numeric AS amt,
         (CASE p.policy_id % 6 WHEN 0 THEN 'pending_review' WHEN 1 THEN 'needs_more_info' WHEN 2 THEN 'approved'
                             WHEN 3 THEN 'rejected' WHEN 4 THEN 'paid' ELSE 'cancelled' END)::claim_status AS st,
         pg_temp.vn(p.start_date + (p.policy_id % GREATEST(1, LEAST(p.end_date, pg_temp.today()) - p.start_date + 1))::int) AS ev
  FROM insurance_policies p JOIN insurance_products pr ON pr.product_id = p.product_id
  WHERE p.status = 'active' AND p.policy_id % 40 = 0 AND p.vehicle_id % 4 <> 0 AND NOT pg_temp.is_stolen(p.vehicle_id)) q;

-- ---- 9. LICH SU TRANG THAI XE -------------------------------------------------
INSERT INTO vehicle_status_history (vehicle_id, event_type, old_status, new_status, reason, actor_id, request_id, changed_at)
SELECT v.vehicle_id, 'registered', NULL, 'normal', 'Đăng ký mới', 1 + v.vehicle_id % 10, r.request_id, v.created_at
FROM vehicles v
LEFT JOIN registration_requests r ON r.vehicle_id = v.vehicle_id AND r.request_type = 'new_registration' AND r.status = 'approved';
INSERT INTO vehicle_status_history (vehicle_id, event_type, old_status, new_status, reason, actor_id, request_id, changed_at)
SELECT r.vehicle_id, 'ownership_transferred', 'normal', 'normal', 'Sang tên', r.reviewer_id, r.request_id, r.updated_at
FROM registration_requests r WHERE r.request_type = 'transfer' AND r.status = 'approved';
INSERT INTO vehicle_status_history (vehicle_id, event_type, old_status, new_status, reason, actor_id, claim_id, changed_at)
SELECT p.vehicle_id, 'reported_stolen', 'normal', 'stolen', 'Báo mất sau khi duyệt bồi thường mất cắp', c.reviewer_id, c.claim_id,
       c.event_time + interval '1 day'
FROM insurance_claims c JOIN insurance_policies p ON p.policy_id = c.policy_id WHERE c.claim_type = 'theft';
INSERT INTO vehicle_status_history (vehicle_id, event_type, old_status, new_status, reason, actor_id, changed_at)
SELECT p.vehicle_id, 'revoked', 'stolen', 'revoked', 'Thu hồi đăng ký do mất cắp không tìm thấy', 1 + p.vehicle_id % 10,
       c.event_time + interval '11 days'
FROM insurance_claims c JOIN insurance_policies p ON p.policy_id = c.policy_id
JOIN vehicles v ON v.vehicle_id = p.vehicle_id WHERE c.claim_type = 'theft' AND v.status = 'revoked';

-- ---- 10. DAT LAI BO DEM IDENTITY (de backend them du lieu moi khong bi trung khoa) ----
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND is_identity = 'YES' LOOP
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT max(%I) FROM %I), 0) + 1, false)',
                   r.table_name, r.column_name, r.column_name, r.table_name);
  END LOOP;
END $$;

-- ---- 11. KIEM TRA LAI QUY TAC LIEN BANG (thay cho trigger da tam tat) ---------
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM violations v WHERE v.vehicle_id IS NOT NULL AND v.liable_owner_id IS NOT NULL
     AND fn_owner_at(v.vehicle_id, v.occurred_at) IS DISTINCT FROM v.liable_owner_id;
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % vi phạm có người chịu phạt không phải chủ xe lúc vi phạm', n; END IF;
  SELECT count(*) INTO n FROM violations v JOIN violation_types t USING (violation_type_id)
     WHERE v.fine_amount IS NOT NULL AND (v.fine_amount < t.min_fine OR v.fine_amount > t.max_fine);
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % vi phạm có mức phạt ngoài khung', n; END IF;
  SELECT count(*) INTO n FROM violations v WHERE v.status = 'paid'
     AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.violation_id = v.violation_id AND p.status = 'success');
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % vi phạm Đã nộp nhưng chưa có giao dịch thành công', n; END IF;
  SELECT count(*) INTO n FROM payments p JOIN violations v ON v.violation_id = p.violation_id WHERE p.fine_amount <> v.fine_amount;
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % giao dịch phạt sai số tiền', n; END IF;
  SELECT count(*) INTO n FROM insurance_policies po JOIN insurance_products pr ON pr.product_id = po.product_id
     JOIN vehicles ve ON ve.vehicle_id = po.vehicle_id
     WHERE pr.vehicle_type_id <> ve.vehicle_type_id OR po.premium <> pr.premium OR po.liability_limit <> pr.liability_limit
        OR po.includes_theft <> pr.includes_theft
        OR po.end_date <> (po.start_date + make_interval(months => pr.term_months))::date - 1
        OR fn_owner_at(po.vehicle_id, po.created_at) IS DISTINCT FROM po.buyer_id;
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % hợp đồng bảo hiểm không khớp gói/ngày/người mua', n; END IF;
  SELECT count(*) INTO n FROM insurance_policies po WHERE po.status = 'active'
     AND NOT EXISTS (SELECT 1 FROM policy_payments pp WHERE pp.policy_id = po.policy_id AND pp.status = 'success' AND pp.amount = po.premium);
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % hợp đồng Hiệu lực thiếu giao dịch phí', n; END IF;
  SELECT count(*) INTO n FROM insurance_claims c JOIN insurance_policies po ON po.policy_id = c.policy_id
     JOIN insurance_products pr ON pr.product_id = po.product_id
     WHERE (c.event_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date NOT BETWEEN po.start_date AND po.end_date
        OR fn_owner_at(po.vehicle_id, c.event_time) IS DISTINCT FROM c.claimant_id
        OR (c.claim_type = 'theft' AND NOT po.includes_theft)
        OR (c.reviewer_id IS NOT NULL AND (SELECT u.insurer_id FROM users u WHERE u.user_id = c.reviewer_id) IS DISTINCT FROM pr.insurer_id);
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % yêu cầu bồi thường sai hiệu lực/chủ xe/công ty', n; END IF;
  SELECT count(*) INTO n FROM (SELECT 1 FROM insurance_claims c JOIN insurance_policies po USING (policy_id)
     WHERE c.status IN ('approved','paid') GROUP BY po.policy_id, po.liability_limit HAVING sum(c.approved_amount) > po.liability_limit) x;
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % hợp đồng vượt hạn mức', n; END IF;
  SELECT count(*) INTO n FROM vehicles v WHERE v.status <> 'normal'
     AND NOT EXISTS (SELECT 1 FROM vehicle_status_history h WHERE h.vehicle_id = v.vehicle_id AND h.new_status = v.status);
  IF n > 0 THEN RAISE EXCEPTION 'Sinh lỗi: % xe có trạng thái không khớp lịch sử', n; END IF;
END $$;

ALTER TABLE users                 ENABLE TRIGGER USER;
ALTER TABLE vehicles              ENABLE TRIGGER USER;
ALTER TABLE registration_requests ENABLE TRIGGER USER;
ALTER TABLE violations            ENABLE TRIGGER USER;
ALTER TABLE payments              ENABLE TRIGGER USER;
ALTER TABLE insurance_policies    ENABLE TRIGGER USER;
ALTER TABLE policy_payments       ENABLE TRIGGER USER;
ALTER TABLE insurance_claims      ENABLE TRIGGER USER;
COMMIT;

VACUUM ANALYZE;
\timing off
SELECT 'users' AS bang, count(*) AS so_dong FROM users UNION ALL SELECT 'vehicles', count(*) FROM vehicles
UNION ALL SELECT 'ownership_history', count(*) FROM ownership_history
UNION ALL SELECT 'registration_requests', count(*) FROM registration_requests
UNION ALL SELECT 'violations', count(*) FROM violations UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'insurance_products', count(*) FROM insurance_products
UNION ALL SELECT 'insurance_policies', count(*) FROM insurance_policies
UNION ALL SELECT 'policy_payments', count(*) FROM policy_payments
UNION ALL SELECT 'insurance_claims', count(*) FROM insurance_claims
UNION ALL SELECT 'vehicle_status_history', count(*) FROM vehicle_status_history
UNION ALL SELECT 'cameras', count(*) FROM cameras UNION ALL SELECT 'violation_types', count(*) FROM violation_types
UNION ALL SELECT 'vehicle_types', count(*) FROM vehicle_types UNION ALL SELECT 'roles', count(*) FROM roles
UNION ALL SELECT 'insurers', count(*) FROM insurers ORDER BY 2 DESC;
