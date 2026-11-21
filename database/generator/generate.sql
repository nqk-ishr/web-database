-- ============================================================
-- generate.sql - Sinh du lieu gia lap cho schema.sql (demo va lon dung CHUNG file nay)
-- Tham so mac dinh = BO LON. Bo demo: seed/seed_demo.sql dat tham so nho roi goi file nay.
-- Doi quy mo:  psql -f generator/generate.sql -v n_viol=500000 -v n_vehicles=100000
-- Tai lap duoc: setseed co dinh + cong thuc theo id. Cac xe 'cố ý' bat thuong:
--   * id chia het cho 12 va loai xe co nien han  -> xe QUA NIEN HAN
--   * id chia het cho 9                           -> xe QUA HAN DANG KIEM
--   * ~31% vi pham 'notified' (chua nop), 2% vi pham khong khop xe (vehicle_id NULL)
-- Luu y: khi nhom them trigger chuyen trang thai, tam tat khi nap:
--   ALTER TABLE violations DISABLE TRIGGER USER; ... ENABLE TRIGGER USER;
-- ============================================================
\set ON_ERROR_STOP on
\if :{?n_owners}   \else \set n_owners   60000  \endif
\if :{?n_vehicles} \else \set n_vehicles 75000  \endif
\if :{?n_cameras}  \else \set n_cameras  300    \endif
\if :{?n_vtypes}   \else \set n_vtypes   50     \endif
\if :{?n_viol}     \else \set n_viol     375000 \endif
\if :{?n_off_reg}  \else \set n_off_reg  10     \endif
\if :{?n_off_vio}  \else \set n_off_vio  15     \endif
\timing on
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- mot hash bcrypt dung chung cho moi tai khoan gia lap; mat khau: Demo@123
SELECT crypt('Demo@123', gen_salt('bf', 8)) AS pw \gset
SELECT setseed(0.42);

TRUNCATE payments, appeals, violations, inspections, registrations, vehicles,
         owners, cameras, violation_types, vehicle_models, vehicle_types, users RESTART IDENTITY CASCADE;

-- Bien so: don anh theo id (2 so tinh + 1 chu + 5 so), khong bao gio trung
CREATE FUNCTION pg_temp.plate(g int) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT (10 + g % 80)::text || chr(65 + g % 7) || '-' || lpad((g / 80)::text, 5, '0') $$;

-- ---------- DANH MUC ----------
-- Gia tri MAU (nien han, chu ky, muc phat) - nhom doi chieu quy dinh hien hanh truoc khi nop
INSERT INTO vehicle_types(code,name,usage,max_service_years,inspection_cycle_months) VALUES
 ('XM','Xe máy','personal',NULL,24),
 ('OTO_CN','Ô tô con cá nhân (≤9 chỗ)','personal',NULL,12),
 ('OTO_TAXI','Ô tô taxi','commercial',8,6),
 ('OTO_KD','Ô tô kinh doanh vận tải (≤9 chỗ)','commercial',15,6),
 ('OTO_KHACH','Ô tô khách (>9 chỗ)','commercial',20,6),
 ('OTO_TAI','Ô tô tải','commercial',25,6),
 ('DAU_KEO','Xe đầu kéo','commercial',20,6),
 ('XE_BUYT','Xe buýt','commercial',20,6),
 ('BAN_TAI','Ô tô bán tải cá nhân','personal',NULL,12),
 ('CHUYEN_DUNG','Xe chuyên dùng','commercial',25,12);

INSERT INTO vehicle_models(brand,name) VALUES
 ('Honda','Wave Alpha'),('Honda','Vision'),('Honda','SH 150'),('Yamaha','Exciter'),('Yamaha','Sirius'),
 ('Toyota','Vios'),('Toyota','Camry'),('Toyota','Fortuner'),('Hyundai','Accent'),('Hyundai','Santa Fe'),
 ('Kia','Morning'),('Kia','Seltos'),('Mazda','CX-5'),('VinFast','VF 8'),('Ford','Ranger'),
 ('Hino','500 Series'),('Isuzu','QKR'),('Thaco','Universe'),('Samco','Felix'),('Hyundai','County');

INSERT INTO violation_types(code,name,detection,min_fine,max_fine,points) VALUES
 ('SPD_5','Quá tốc độ 5–10 km/h','camera',800000,1000000,0),
 ('SPD_10','Quá tốc độ 10–20 km/h','camera',4000000,6000000,2),
 ('SPD_20','Quá tốc độ 20–35 km/h','camera',6000000,8000000,4),
 ('RED_LIGHT','Vượt đèn đỏ','camera',4000000,6000000,4),
 ('WRONG_LANE','Đi sai làn đường','camera',400000,600000,0),
 ('WRONG_WAY','Đi ngược chiều','camera',18000000,20000000,0),
 ('STOP_LINE','Dừng đỗ quá vạch dừng','camera',400000,600000,0),
 ('NO_BELT','Không thắt dây an toàn','camera',800000,1000000,0),
 ('PHONE','Dùng điện thoại khi lái xe','camera',800000,1000000,0),
 ('PARKING','Đỗ xe sai quy định','camera',400000,600000,0),
 ('BUS_LANE','Đi vào làn xe buýt','camera',400000,600000,0),
 ('NO_HELMET','Không đội mũ bảo hiểm','on_site',400000,600000,0),
 ('ALCOHOL','Vi phạm nồng độ cồn','on_site',6000000,8000000,10),
 ('NO_INSPECT','Quá hạn đăng kiểm','on_site',2000000,3000000,0),
 ('NO_LICENSE','Không có giấy phép lái xe','on_site',4000000,6000000,0);
INSERT INTO violation_types(code,name,detection,min_fine,max_fine,points)
SELECT 'VT' || lpad(g::text,3,'0'), 'Lỗi vi phạm khác số ' || g,
       CASE WHEN g % 3 = 0 THEN 'on_site' ELSE 'camera' END::detection_source,
       200000 * (1 + g % 5), 200000 * (1 + g % 5) + 200000 * (g % 4), g % 3
FROM generate_series(16, :n_vtypes) g;

INSERT INTO cameras(code,location_name,route,district,latitude,longitude)
SELECT 'CAM' || lpad(g::text,4,'0'),
       'Điểm giám sát số ' || g,
       (ARRAY['Đại lộ Thăng Long','Quốc lộ 1A','Đường Láng','Nguyễn Trãi','Giải Phóng','Cầu Giấy','Võ Chí Công','Lê Văn Lương'])[1 + g % 8],
       (ARRAY['Ba Đình','Hoàn Kiếm','Đống Đa','Cầu Giấy','Thanh Xuân','Hà Đông','Nam Từ Liêm','Long Biên','Hoàng Mai','Tây Hồ'])[1 + g % 10],
       round((20.95 + random()*0.13)::numeric, 6), round((105.74 + random()*0.17)::numeric, 6)
FROM generate_series(1, :n_cameras) g;

-- ---------- NGUOI DUNG ----------
INSERT INTO users(role,officer_type,username,password_hash,full_name,email,phone)
SELECT 'officer','registration','dk'||lpad(g::text,2,'0'),:'pw','Cán bộ đăng ký '||g,'dk'||g||'@vehicle.local','0900'||lpad(g::text,6,'0')
FROM generate_series(1,:n_off_reg) g;
INSERT INTO users(role,officer_type,username,password_hash,full_name,email,phone)
SELECT 'officer','violation','vp'||lpad(g::text,2,'0'),:'pw','Cán bộ xử lý vi phạm '||g,'vp'||g||'@vehicle.local','0901'||lpad(g::text,6,'0')
FROM generate_series(1,:n_off_vio) g;

CREATE FUNCTION pg_temp.person(g int) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Phan','Vũ','Đặng','Bùi','Đỗ'])[1 + g % 10] || ' ' ||
          (ARRAY['Văn','Thị','Quang','Thu','Xuân','Minh'])[1 + (g/10) % 6] || ' ' ||
          (ARRAY['An','Bình','Cường','Dũng','Hải','Huế','Khánh','Khoa','Lan','Nam','Phúc','Trang'])[1 + (g/7) % 12] $$;

INSERT INTO users(role,username,password_hash,full_name,email,phone)
SELECT 'owner','owner'||g,:'pw',pg_temp.person(g),'owner'||g||'@example.com','09'||lpad((g*7919 % 100000000)::text,8,'0')
FROM generate_series(1,:n_owners) g;

INSERT INTO owners(user_id,kind,full_name,identity_no,date_of_birth,phone,email,address)
SELECT :n_off_reg + :n_off_vio + g,
       CASE WHEN g % 33 = 0 THEN 'organization' ELSE 'individual' END::owner_kind,
       CASE WHEN g % 33 = 0 THEN 'Công ty TNHH Vận tải ' || g ELSE pg_temp.person(g) END,
       lpad(g::text,12,'0'),
       current_date - (18*365 + (g*97) % (45*365)),
       '09'||lpad((g*7919 % 100000000)::text,8,'0'),
       'owner'||g||'@example.com',
       'Số ' || (1 + g % 200) || ', phường ' || (1 + g % 15) || ', quận ' || (ARRAY['Ba Đình','Cầu Giấy','Đống Đa','Hà Đông','Long Biên'])[1 + g % 5]
FROM generate_series(1,:n_owners) g;

-- ---------- PHUONG TIEN ----------
WITH v AS MATERIALIZED (
  SELECT g, random() u1, random() u2, random() u3 FROM generate_series(1,:n_vehicles) g),
t AS (
  SELECT v.*, CASE WHEN u2 < .55 THEN 1 WHEN u2 < .80 THEN 2 ELSE 3 + floor((u2-.80)/.20*8)::int END AS tid FROM v)
INSERT INTO vehicles(model_id,vehicle_type_id,chassis_no,engine_no,color,manufacture_year)
SELECT 1 + floor(u1*20)::int, tid,
       'CH' || lpad(g::text,10,'0'), 'EN' || lpad(g::text,10,'0'),
       (ARRAY['Trắng','Đen','Đỏ','Xanh','Bạc','Xám'])[1 + g % 6],
       GREATEST(1980, CASE WHEN vt.max_service_years IS NOT NULL AND g % 12 = 0
                           THEN extract(year FROM current_date)::int - vt.max_service_years - 1 - g % 3
                           ELSE extract(year FROM current_date)::int - floor(power(u3,1.7)*28)::int END)
FROM t JOIN vehicle_types vt ON vt.id = t.tid
ORDER BY g;

-- ---------- DANG KY (25% xe da sang ten 1 lan -> co dang ky 'closed' + 'active', khong chong lan) ----------
INSERT INTO registrations(vehicle_id,owner_id,registered_by,plate_number,valid_from,valid_to,status)
SELECT g, 1 + (g*13) % :n_owners, 1 + g % :n_off_reg, pg_temp.plate(g),
       current_date - (800 + (g*53) % 2000), current_date - (10 + (g*37) % 700), 'closed'
FROM generate_series(1,:n_vehicles) g WHERE g % 4 = 0;
INSERT INTO registrations(vehicle_id,owner_id,registered_by,plate_number,valid_from,valid_to,status)
SELECT g, 1 + (g*17 + 5) % :n_owners, 1 + g % :n_off_reg, pg_temp.plate(g),
       CASE WHEN g % 4 = 0 THEN current_date - (10 + (g*37) % 700) ELSE current_date - (800 + (g*53) % 2000) END,
       NULL, 'active'
FROM generate_series(1,:n_vehicles) g;

-- ---------- DANG KIEM: 1-3 lan / xe, cach nhau 1 chu ky; 1/9 xe da qua han ----------
INSERT INTO inspections(vehicle_id,inspector_id,result,certificate_no,inspected_at,expires_at)
SELECT s.vehicle_id, 1 + (s.vehicle_id + s.k) % :n_off_reg, s.result, 
       CASE WHEN s.result = 'passed' THEN 'GCN' || s.vehicle_id || '-' || s.k END,
       s.d, CASE WHEN s.result = 'passed' THEN (s.d + s.cm * interval '1 month')::date END
FROM (
  SELECT v.id AS vehicle_id, k, t.inspection_cycle_months AS cm,
         (current_date - (CASE WHEN v.id % 9 = 0 THEN t.inspection_cycle_months*30 + 1 + (v.id*7) % 200
                               ELSE (v.id*31) % (t.inspection_cycle_months*30) END
                         + (k-1) * t.inspection_cycle_months*30))::date AS d,
         (CASE WHEN (v.id*k*7919) % 10 < 9 THEN 'passed' ELSE 'failed' END)::inspection_result AS result
  FROM vehicles v JOIN vehicle_types t ON t.id = v.vehicle_type_id
  CROSS JOIN LATERAL generate_series(1, 1 + v.id % 3) k) s;

-- ---------- VI PHAM ----------
-- (a) vi pham khop xe: chon xe lech (xe 'nong' vi pham nhieu), thoi diem ngau nhien 2 nam,
--     doi chieu dang ky HIEN HANH TAI THOI DIEM vi pham (dung nghiep vu 3)
WITH pick AS MATERIALIZED (
  SELECT g, 1 + floor(power(random(),1.4) * :n_vehicles)::int AS vid,
         now() - random() * interval '730 days' AS occ,
         1 + floor(random() * :n_vtypes)::int AS vt,
         random() AS ust, random() AS uf, random() AS uc
  FROM generate_series(1, :n_viol - :n_viol/50) g),
j AS (
  SELECT p.*, r.id AS reg_id, r.plate_number, vt.detection, vt.min_fine, vt.max_fine,
         CASE WHEN p.occ > now() - interval '8 days' THEN 'new'
              WHEN p.ust < .03 THEN 'new'      WHEN p.ust < .06 THEN 'verified'
              WHEN p.ust < .36 THEN 'notified' WHEN p.ust < .97 THEN 'paid'
              WHEN p.ust < .985 THEN 'appealing' ELSE 'cancelled' END::violation_status AS st
  FROM pick p
  JOIN registrations r ON r.vehicle_id = p.vid AND daterange(r.valid_from, r.valid_to, '[)') @> p.occ::date
  JOIN violation_types vt ON vt.id = p.vt)
INSERT INTO violations(source,camera_id,violation_type_id,vehicle_id,registration_id,plate_detected,occurred_at,
                       location_detail,fine_amount,status,evidence_url,verified_by,verified_at,notified_at,due_date,created_at)
SELECT detection,
       CASE WHEN detection = 'camera' THEN 1 + floor(uc * :n_cameras)::int END,
       vt, vid, reg_id, plate_number, occ,
       CASE WHEN detection = 'on_site' THEN 'Chốt kiểm tra số ' || (g % 50) END,
       LEAST(max_fine, min_fine + round(uf * (max_fine - min_fine) / 10000) * 10000),
       st, 'https://storage.example.local/evidence/' || g || '.jpg',
       CASE WHEN st <> 'new' THEN :n_off_reg + 1 + g % :n_off_vio END,
       CASE WHEN st <> 'new' THEN occ + interval '1 day' * (1 + uf*2) END,
       CASE WHEN st IN ('notified','paid','appealing') THEN occ + interval '1 day' * (2 + uf*3) END,
       CASE WHEN st IN ('notified','paid','appealing') THEN (occ + interval '1 day' * (2 + uf*3))::date + 30 END,
       occ + interval '1 hour'
FROM j ORDER BY occ;
-- (b) 2% vi pham bien so khong khop xe nao (vehicle_id NULL) - de kiem thu quy trinh xac minh
INSERT INTO violations(source,camera_id,violation_type_id,plate_detected,occurred_at,fine_amount,status,evidence_url)
SELECT 'camera', 1 + g % :n_cameras, t.id, '99Z-' || lpad((90000+g)::text,5,'0'),
       now() - random() * interval '700 days', t.min_fine, 'new', 'https://storage.example.local/evidence/x' || g || '.jpg'
FROM generate_series(1, :n_viol/50) g JOIN violation_types t ON t.id = 1 + g % 11;   -- id 1..11 = loi camera

-- ---------- THANH TOAN ----------
INSERT INTO payments(violation_id,paid_by,recorded_by,amount,method,status,transaction_ref,paid_at)
SELECT v.id,
       CASE WHEN v.id % 10 < 7 THEN r.owner_id END,
       CASE WHEN v.id % 10 >= 7 THEN :n_off_reg + 1 + v.id % :n_off_vio END,
       v.fine_amount,
       (CASE WHEN v.id % 10 < 7 THEN 'online_qr' ELSE 'cash' END)::payment_method,
       'success', CASE WHEN v.id % 10 < 7 THEN 'QR' || v.id END,
       LEAST(v.notified_at + interval '1 day' * (1 + v.id % 25), now())
FROM violations v JOIN registrations r ON r.id = v.registration_id
WHERE v.status = 'paid';
-- lan nop that bai (QR loi) truoc khi nop lai / chua nop
INSERT INTO payments(violation_id,paid_by,amount,method,status,transaction_ref,paid_at)
SELECT v.id, r.owner_id, v.fine_amount, 'online_qr', 'failed', 'QRF' || v.id, v.notified_at + interval '12 hours'
FROM violations v JOIN registrations r ON r.id = v.registration_id
WHERE v.status IN ('notified','paid') AND v.id % 12 = 0;

-- ---------- KHIEU NAI ----------
INSERT INTO appeals(violation_id,owner_id,reason,status,resolved_by,resolution_note,created_at,resolved_at)
SELECT v.id, r.owner_id,
       (ARRAY['Biển số bị nhận nhầm','Xe đã bán nhưng chưa sang tên','Không phải tôi điều khiển','Đèn tín hiệu lỗi','Ảnh không rõ biển số'])[1 + v.id % 5],
       CASE WHEN v.status = 'appealing' THEN 'pending' ELSE 'accepted' END::appeal_status,
       CASE WHEN v.status = 'cancelled' THEN :n_off_reg + 1 + v.id % :n_off_vio END,
       CASE WHEN v.status = 'cancelled' THEN 'Chấp nhận khiếu nại, hủy biên bản' END,
       a.created,
       CASE WHEN v.status = 'cancelled' THEN LEAST(a.created + interval '1 day' * (1 + v.id % 10), now()) END
FROM violations v JOIN registrations r ON r.id = v.registration_id
CROSS JOIN LATERAL (SELECT LEAST(coalesce(v.notified_at, v.verified_at) + interval '1 day' * (1 + v.id % 5), now()) AS created) a
WHERE v.status IN ('appealing','cancelled');

VACUUM ANALYZE;
\timing off
SELECT 'users' AS "bảng", count(*) AS "số dòng" FROM users UNION ALL SELECT 'owners', count(*) FROM owners
UNION ALL SELECT 'vehicle_types', count(*) FROM vehicle_types UNION ALL SELECT 'vehicle_models', count(*) FROM vehicle_models
UNION ALL SELECT 'violation_types', count(*) FROM violation_types UNION ALL SELECT 'cameras', count(*) FROM cameras
UNION ALL SELECT 'vehicles', count(*) FROM vehicles UNION ALL SELECT 'registrations', count(*) FROM registrations
UNION ALL SELECT 'inspections', count(*) FROM inspections UNION ALL SELECT 'violations', count(*) FROM violations
UNION ALL SELECT 'payments', count(*) FROM payments UNION ALL SELECT 'appeals', count(*) FROM appeals;
