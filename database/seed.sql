-- ============================================================
-- seed_new.sql - Dữ liệu mẫu mới (10 dòng / bảng) cho schema.sql
-- Chạy:  psql -U <user> -d <db> -f seed_new.sql
-- Thứ tự insert đã xếp theo khóa ngoại. Dữ liệu mang tính minh họa
-- (mức phạt, tọa độ, biển số... không phải số liệu thật).
-- Bối cảnh: TP. Hồ Chí Minh. Các bảng phải đang TRỐNG trước khi chạy.
-- ============================================================



-- ------------------------------------------------------------
-- 1. users (id 1-2: cán bộ đăng ký, 3-4: cán bộ vi phạm, 5-10: chủ xe)
-- password_hash chỉ là chuỗi giả, thay bằng hash thật (bcrypt) khi chạy app
-- ------------------------------------------------------------
INSERT INTO users (id, role, officer_type, username, password_hash, full_name, email, phone) VALUES
(1,  'officer', 'registration', 'canbo_dk01', '$2b$12$demohash1000000000000000000001', 'Đỗ Minh Quân',    'quan.do@giaothong.hcm.vn',   '0902100001'),
(2,  'officer', 'registration', 'canbo_dk02', '$2b$12$demohash1000000000000000000002', 'Võ Thị Hạnh',     'hanh.vo@giaothong.hcm.vn',   '0902100002'),
(3,  'officer', 'violation',    'canbo_vp01', '$2b$12$demohash1000000000000000000003', 'Huỳnh Văn Tâm',   'tam.huynh@giaothong.hcm.vn', '0902100003'),
(4,  'officer', 'violation',    'canbo_vp02', '$2b$12$demohash1000000000000000000004', 'Dương Thu Trang', 'trang.duong@giaothong.hcm.vn','0902100004'),
(5,  'owner',   NULL,           'bao.truong', '$2b$12$demohash1000000000000000000005', 'Trương Gia Bảo',  'bao.truong@example.com',     '0933400001'),
(6,  'owner',   NULL,           'diep.lam',   '$2b$12$demohash1000000000000000000006', 'Lâm Ngọc Diệp',   'diep.lam@example.com',       '0933400002'),
(7,  'owner',   NULL,           'vinh.cao',   '$2b$12$demohash1000000000000000000007', 'Cao Thế Vinh',    'vinh.cao@example.com',       '0933400003'),
(8,  'owner',   NULL,           'tuan.mai',   '$2b$12$demohash1000000000000000000008', 'Mai Anh Tuấn',    'tuan.mai@example.com',       '0933400004'),
(9,  'owner',   NULL,           'kim.dinh',   '$2b$12$demohash1000000000000000000009', 'Đinh Thị Kim',    'kim.dinh@example.com',       '0933400005'),
(10, 'owner',   NULL,           'nghia.ta',   '$2b$12$demohash1000000000000000000010', 'Tạ Hữu Nghĩa',    'nghia.ta@example.com',       '0933400006');

-- ------------------------------------------------------------
-- 2. vehicle_types
-- ------------------------------------------------------------
INSERT INTO vehicle_types (id, code, name, usage, max_service_years, inspection_cycle_months, description) VALUES
(1,  'MOTO_UNDER_175', 'Xe máy dưới 175cc',        'personal',   NULL, 24, 'Xe máy, xe tay ga dung tích xi lanh dưới 175cc'),
(2,  'MOTO_OVER_175',  'Mô tô phân khối lớn',      'personal',   NULL, 24, 'Mô tô dung tích xi lanh từ 175cc trở lên'),
(3,  'SEDAN',          'Ô tô sedan',               'personal',   NULL, 12, 'Ô tô con kiểu sedan, không kinh doanh'),
(4,  'SUV',            'Ô tô SUV',                 'personal',   NULL, 12, 'Ô tô con gầm cao, không kinh doanh'),
(5,  'MPV_7',          'Ô tô MPV 7 chỗ',           'personal',   NULL, 12, 'Ô tô đa dụng 7 chỗ, không kinh doanh'),
(6,  'TAXI_EV',        'Taxi điện',                'commercial', 8,    6,  'Ô tô điện kinh doanh vận tải hành khách theo đồng hồ'),
(7,  'RIDE_HAILING',   'Xe hợp đồng công nghệ',    'commercial', 8,    6,  'Ô tô kinh doanh vận tải qua ứng dụng đặt xe'),
(8,  'COACH_45',       'Xe khách 45 chỗ',          'commercial', 15,   6,  'Ô tô khách đường dài trên 30 chỗ'),
(9,  'TRUCK_5T',       'Xe tải 5 tấn',             'commercial', 25,   12, 'Xe tải có tải trọng từ 3,5 đến 7 tấn'),
(10, 'TRACTOR',        'Xe đầu kéo',               'commercial', 20,   6,  'Xe đầu kéo sơ mi rơ moóc');

-- ------------------------------------------------------------
-- 3. vehicle_models
-- ------------------------------------------------------------
INSERT INTO vehicle_models (id, brand, name) VALUES
(1,  'Honda',       'Air Blade'),
(2,  'Honda',       'SH Mode'),
(3,  'Yamaha',      'Janus'),
(4,  'Kawasaki',    'Z900'),
(5,  'Toyota',      'Camry'),
(6,  'Mitsubishi',  'Xpander'),
(7,  'Hyundai',     'Santa Fe'),
(8,  'VinFast',     'VF e34'),
(9,  'Thaco',       'Universe'),
(10, 'Hino',        'FM');

-- ------------------------------------------------------------
-- 4. violation_types (5 camera + 5 tại chỗ)
-- ------------------------------------------------------------
INSERT INTO violation_types (id, code, name, detection, min_fine, max_fine, points, description) VALUES
(1,  'RED_LIGHT_CAR',     'Ô tô vượt đèn đỏ',                         'camera',  18000000, 20000000, 4,  'Ô tô không chấp hành tín hiệu đèn giao thông'),
(2,  'RED_LIGHT_MOTO',    'Xe máy vượt đèn đỏ',                       'camera',  4000000,  6000000,  4,  'Xe máy, mô tô không chấp hành tín hiệu đèn giao thông'),
(3,  'SPEED_OVER_20',     'Ô tô quá tốc độ trên 20 đến 35 km/h',      'camera',  12000000, 14000000, 6,  NULL),
(4,  'RESERVED_LANE',     'Đi vào làn đường dành riêng',              'camera',  2000000,  3000000,  0,  'Đi vào làn ưu tiên hoặc làn dành riêng cho phương tiện khác'),
(5,  'STOP_LINE',         'Dừng xe quá vạch dừng',                    'camera',  400000,   600000,   0,  NULL),
(6,  'NO_HELMET',         'Không đội mũ bảo hiểm',                    'on_site', 400000,   600000,   2,  'Áp dụng cho người điều khiển và người ngồi sau xe máy'),
(7,  'PHONE_USE',         'Sử dụng điện thoại khi lái xe',            'on_site', 800000,   1000000,  2,  NULL),
(8,  'ALCOHOL_MOTO',      'Xe máy vi phạm nồng độ cồn',               'on_site', 6000000,  8000000,  10, NULL),
(9,  'EXPIRED_INSPECTION','Xe quá hạn đăng kiểm',                     'on_site', 3000000,  5000000,  0,  'Không có hoặc hết hạn giấy chứng nhận đăng kiểm'),
(10, 'OVERLOAD',          'Chở quá tải trọng cho phép',               'on_site', 7000000,  8000000,  0,  NULL);

-- ------------------------------------------------------------
-- 5. cameras
-- ------------------------------------------------------------
INSERT INTO cameras (id, code, location_name, route, district, latitude, longitude, is_active) VALUES
(1,  'CAM-SG-001', 'Ngã tư Hàng Xanh',               'Điện Biên Phủ',       'Bình Thạnh',    10.801400, 106.711000, TRUE),
(2,  'CAM-SG-002', 'Vòng xoay Dân Chủ',              'Võ Văn Tần',          'Quận 3',        10.779000, 106.687000, TRUE),
(3,  'CAM-SG-003', 'Cầu Sài Gòn',                    'Xa lộ Hà Nội',        'Thành phố Thủ Đức', 10.799000, 106.736000, TRUE),
(4,  'CAM-SG-004', 'Ngã sáu Phù Đổng',               'Trần Hưng Đạo',       'Quận 1',        10.764000, 106.689000, TRUE),
(5,  'CAM-SG-005', 'Ngã tư Bảy Hiền',                'Cách Mạng Tháng Tám', 'Tân Bình',      10.793000, 106.653000, TRUE),
(6,  'CAM-SG-006', 'Cầu Phú Mỹ',                     'Nguyễn Văn Linh',     'Quận 7',        10.727000, 106.731000, TRUE),
(7,  'CAM-SG-007', 'Ngã tư An Sương',                'Quốc lộ 22',          'Quận 12',       10.844000, 106.613000, TRUE),
(8,  'CAM-SG-008', 'Nút giao Mỹ Thủy',               'Mai Chí Thọ',         'Thành phố Thủ Đức', 10.770000, 106.765000, TRUE),
(9,  'CAM-SG-009', 'Ngã ba Cát Lái',                 'Đồng Văn Cống',       'Thành phố Thủ Đức', 10.771000, 106.792000, TRUE),
(10, 'CAM-SG-010', 'Ngã tư Thủ Đức',                 'Võ Văn Ngân',         'Thành phố Thủ Đức', 10.850000, 106.758000, FALSE);

-- ------------------------------------------------------------
-- 6. owners (1-6 có tài khoản user 5-10; 7-8 chưa có tài khoản; 9, 10 là tổ chức)
-- ------------------------------------------------------------
INSERT INTO owners (id, user_id, kind, full_name, identity_no, date_of_birth, phone, email, address) VALUES
(1,  5,    'individual',   'Trương Gia Bảo',                       '079090011111', '1990-02-14', '0933400001', 'bao.truong@example.com', '25 Điện Biên Phủ, Bình Thạnh, TP.HCM'),
(2,  6,    'individual',   'Lâm Ngọc Diệp',                        '079095022222', '1995-06-30', '0933400002', 'diep.lam@example.com',   '112 Võ Văn Tần, Quận 3, TP.HCM'),
(3,  7,    'individual',   'Cao Thế Vinh',                         '079082033333', '1982-10-05', '0933400003', 'vinh.cao@example.com',   '48 Nguyễn Thị Minh Khai, Quận 1, TP.HCM'),
(4,  8,    'individual',   'Mai Anh Tuấn',                         '079088044444', '1988-12-21', '0933400004', 'tuan.mai@example.com',   '9 Võ Văn Kiệt, Quận 5, TP.HCM'),
(5,  9,    'individual',   'Đinh Thị Kim',                         '079076055555', '1976-03-17', '0933400005', 'kim.dinh@example.com',   '73 Hoàng Văn Thụ, Tân Bình, TP.HCM'),
(6,  10,   'individual',   'Tạ Hữu Nghĩa',                         '079093066666', '1993-08-09', '0933400006', 'nghia.ta@example.com',   '31 Quang Trung, Gò Vấp, TP.HCM'),
(7,  NULL, 'individual',   'Châu Minh Hiếu',                       '079099077777', '1999-01-25', '0933400007', 'hieu.chau@example.com',  '66 Nguyễn Văn Linh, Quận 7, TP.HCM'),
(8,  NULL, 'individual',   'Quách Thị Lệ',                         '079084088888', '1984-05-11', '0933400008', 'le.quach@example.com',   '14 Lê Văn Việt, Thành phố Thủ Đức, TP.HCM'),
(9,  NULL, 'organization', 'Công ty CP Xe điện Sài Gòn Xanh',      '0312345678',   NULL,         '0283900001', 'info@saigonxanh.vn',     '200 Mai Chí Thọ, Thành phố Thủ Đức, TP.HCM'),
(10, NULL, 'organization', 'Công ty TNHH Vận tải Đông Nam',        '0318765432',   NULL,         '0283900002', 'info@vantaidongnam.vn',  '88 Quốc lộ 22, Quận 12, TP.HCM');

-- ------------------------------------------------------------
-- 7. vehicles
-- ------------------------------------------------------------
INSERT INTO vehicles (id, model_id, vehicle_type_id, chassis_no, engine_no, color, manufacture_year) VALUES
(1,  1,  1,  'RLHJF6320MY100001', 'JF63E-1000001',  'Đỏ',       2021),
(2,  2,  1,  'RLHJK0110NY100002', 'JK01E-1000002',  'Xám',      2022),
(3,  3,  1,  'RLCAB1010LY100003', 'E3N1E-1000003',  'Trắng',    2020),
(4,  4,  2,  'JKAZR900XPA100004', 'ZR900AE-100004', 'Xanh lá',  2023),
(5,  5,  3,  'JTNBF3HK0M3100005', 'A25A-1000005',   'Đen',      2021),
(6,  6,  5,  'PA4NC5HKAKA100006', '4A91-1000006',   'Bạc',      2019),
(7,  7,  4,  'KMHS381ABNU100007', 'D4HB-1000007',   'Trắng',    2022),
(8,  8,  6,  'RLVVE3400NH100008', 'EV-E34-100008',  'Trắng',    2022),
(9,  9,  8,  'RPTU45A00KB100009', 'WP10-1000009',   'Xanh',     2019),
(10, 10, 10, 'JHFM7K0000K100010', 'J08E-1000010',   'Trắng',    2018);

-- ------------------------------------------------------------
-- 8. registrations
-- Xe 3 có lịch sử: đăng ký cũ (closed, id 10) rồi sang tên (active, id 3).
-- Xe 10 (đầu kéo mới nhập) chưa đăng ký biển số.
-- ------------------------------------------------------------
INSERT INTO registrations (id, vehicle_id, owner_id, registered_by, plate_number, valid_from, valid_to, status) VALUES
(1,  1, 1,  1, '59X3-123.45', '2021-04-20', NULL,         'active'),
(2,  2, 2,  1, '59T1-234.56', '2022-07-11', NULL,         'active'),
(3,  3, 3,  2, '59P2-345.67', '2023-02-15', NULL,         'active'),
(4,  4, 4,  2, '59A1-456.78', '2023-09-05', NULL,         'active'),
(5,  5, 5,  1, '51K-567.89',  '2021-12-01', NULL,         'active'),
(6,  6, 6,  2, '51G-678.90',  '2019-10-14', NULL,         'active'),
(7,  7, 7,  1, '51H-789.01',  '2022-05-30', NULL,         'active'),
(8,  8, 9,  2, '51B-890.12',  '2022-11-18', NULL,         'active'),
(9,  9, 10, 1, '51B-901.23',  '2019-08-02', NULL,         'active'),
(10, 3, 8,  2, '59P1-012.34', '2020-09-01', '2023-02-15', 'closed');

-- ------------------------------------------------------------
-- 9. inspections (đạt => có expires_at, không đạt => NULL)
-- ------------------------------------------------------------
INSERT INTO inspections (id, vehicle_id, inspector_id, result, certificate_no, inspected_at, expires_at, notes) VALUES
(1,  5,  1, 'passed', 'DK-2025-1001', '2025-12-05', '2026-12-05', NULL),
(2,  6,  2, 'passed', 'DK-2025-1002', '2025-10-10', '2026-10-10', NULL),
(3,  6,  2, 'failed', NULL,           '2026-10-20', NULL,         'Đèn chiếu sáng không đạt yêu cầu'),
(4,  6,  2, 'passed', 'DK-2026-1003', '2026-10-25', '2027-10-25', 'Đã thay cụm đèn pha'),
(5,  7,  1, 'passed', 'DK-2026-1004', '2026-05-12', '2027-05-12', NULL),
(6,  8,  1, 'passed', 'DK-2026-1005', '2026-04-01', '2026-10-01', 'Taxi điện, chu kỳ 6 tháng (đã hết hạn)'),
(7,  8,  1, 'failed', NULL,           '2026-10-05', NULL,         'Hệ thống phanh không đạt yêu cầu'),
(8,  9,  2, 'passed', 'DK-2026-1006', '2026-06-18', '2026-12-18', NULL),
(9,  10, 2, 'passed', 'DK-2026-1007', '2026-09-01', '2027-03-01', 'Xe nhập mới, kiểm định lần đầu'),
(10, 4,  1, 'passed', 'DK-2026-1008', '2026-02-20', '2028-02-20', NULL);

-- ------------------------------------------------------------
-- 10. violations
-- Vi phạm camera (source='camera') phải có camera_id; tại chỗ thì camera_id NULL.
-- Vi phạm 10: camera đọc được biển nhưng chưa khớp xe => vehicle_id/registration_id NULL.
-- Vi phạm 8 bị hủy vì xe còn hạn đăng kiểm (đến 10/10/2026) tại thời điểm bị lập biên bản.
-- ------------------------------------------------------------
INSERT INTO violations
    (id, source, camera_id, violation_type_id, vehicle_id, registration_id, plate_detected,
     occurred_at, location_detail, fine_amount, status, evidence_url,
     verified_by, verified_at, notified_at, due_date)
VALUES
(1,  'camera',  1,    1, 5,    5,    '51K-567.89',  '2026-08-05 07:35:00', 'Ngã tư Hàng Xanh, hướng Điện Biên Phủ',   18000000, 'paid',
     'https://storage.example.com/evidence/n001.jpg', 3, '2026-08-06 09:00:00', '2026-08-07 08:00:00', '2026-09-07'),
(2,  'camera',  5,    2, 1,    1,    '59X3-123.45', '2026-09-14 18:20:00', 'Ngã tư Bảy Hiền, hướng Hoàng Văn Thụ',    5000000,  'notified',
     'https://storage.example.com/evidence/n002.jpg', 3, '2026-09-15 10:00:00', '2026-09-16 08:00:00', '2026-10-16'),
(3,  'camera',  3,    3, 7,    7,    '51H-789.01',  '2026-09-22 05:50:00', 'Cầu Sài Gòn, hướng về trung tâm',          13000000, 'verified',
     'https://storage.example.com/evidence/n003.jpg', 4, '2026-09-23 09:30:00', NULL,                  NULL),
(4,  'camera',  2,    4, 8,    8,    '51B-890.12',  '2026-10-03 09:10:00', 'Vòng xoay Dân Chủ',                        2500000,  'new',
     'https://storage.example.com/evidence/n004.jpg', NULL, NULL,              NULL,                  NULL),
(5,  'camera',  6,    1, 9,    9,    '51B-901.23',  '2026-07-15 20:45:00', 'Cầu Phú Mỹ, hướng Quận 7',                 19000000, 'appealing',
     'https://storage.example.com/evidence/n005.jpg', 4, '2026-07-16 09:00:00', '2026-07-17 08:00:00', '2026-08-17'),
(6,  'on_site', NULL, 6, 2,    2,    '59T1-234.56', '2026-09-20 08:05:00', 'Đường Nguyễn Văn Linh, Quận 7',            500000,   'paid',
     NULL,                                            4, '2026-09-20 08:30:00', '2026-09-20 08:30:00', '2026-10-20'),
(7,  'on_site', NULL, 8, 4,    4,    '59A1-456.78', '2026-10-11 22:40:00', 'Đường Võ Văn Kiệt, Quận 5',                7000000,  'appealing',
     NULL,                                            3, '2026-10-12 09:00:00', '2026-10-13 08:00:00', '2026-11-13'),
(8,  'on_site', NULL, 9, 6,    6,    '51G-678.90',  '2026-08-28 10:15:00', 'Đường Quang Trung, Gò Vấp',                4000000,  'cancelled',
     NULL,                                            4, '2026-08-29 09:00:00', '2026-08-30 08:00:00', '2026-09-30'),
(9,  'camera',  7,    3, 8,    8,    '51B-890.12',  '2026-06-10 06:30:00', 'Ngã tư An Sương, Quốc lộ 22',              12000000, 'paid',
     'https://storage.example.com/evidence/n009.jpg', 3, '2026-06-11 09:00:00', '2026-06-12 08:00:00', '2026-07-12'),
(10, 'camera',  8,    5, NULL, NULL, '59Z9-999.99', '2026-10-27 16:55:00', 'Nút giao Mỹ Thủy',                         500000,   'new',
     'https://storage.example.com/evidence/n010.jpg', NULL, NULL,              NULL,                  NULL);

-- ------------------------------------------------------------
-- 11. payments
-- Online: có paid_by (chủ xe). Tiền mặt: có recorded_by (cán bộ).
-- Mỗi vi phạm tối đa 1 lần 'success' (vi phạm 1, 6, 9); các lần còn lại là 'failed'.
-- ------------------------------------------------------------
INSERT INTO payments (id, violation_id, paid_by, recorded_by, amount, method, status, transaction_ref, paid_at) VALUES
(1,  9, 9,    NULL, 12000000, 'online_qr', 'failed',  'TXN20260629001',  '2026-06-29 15:45:00'),
(2,  9, 9,    NULL, 12000000, 'online_qr', 'success', 'TXN20260630001',  '2026-06-30 14:00:00'),
(3,  5, 10,   NULL, 19000000, 'online_qr', 'failed',  'TXN20260802001',  '2026-08-02 11:20:00'),
(4,  1, 5,    NULL, 18000000, 'online_qr', 'failed',  'TXN20260818001',  '2026-08-18 21:05:00'),
(5,  1, 5,    NULL, 18000000, 'online_qr', 'success', 'TXN20260820001',  '2026-08-20 09:12:00'),
(6,  8, 6,    NULL, 4000000,  'online_qr', 'failed',  'TXN20260905001',  '2026-09-05 13:40:00'),
(7,  6, 2,    NULL, 500000,   'online_qr', 'failed',  'TXN20260924001',  '2026-09-24 19:30:00'),
(8,  6, NULL, 4,    500000,   'cash',      'success', 'CASH20260925001', '2026-09-25 10:20:00'),
(9,  2, 1,    NULL, 5000000,  'online_qr', 'failed',  'TXN20261002001',  '2026-10-02 08:15:00'),
(10, 7, 4,    NULL, 7000000,  'online_qr', 'failed',  'TXN20261018001',  '2026-10-18 16:00:00');

-- ------------------------------------------------------------
-- 12. appeals
-- pending <=> resolved_at IS NULL; mỗi vi phạm tối đa 1 khiếu nại đang chờ (vi phạm 5, 7).
-- ------------------------------------------------------------
INSERT INTO appeals (id, violation_id, owner_id, reason, status, resolved_by, resolution_note, created_at, resolved_at) VALUES
(1,  9, 9,  'Camera chưa hiệu chuẩn nên số liệu tốc độ bị sai.',                     'rejected', 3,    'Camera đã được kiểm định định kỳ.',                              '2026-06-15 09:00:00', '2026-06-19 15:00:00'),
(2,  5, 10, 'Tài xế đang nhường đường cho xe cứu thương.',                           'rejected', 4,    'Không có xe ưu tiên trong hình ảnh ghi nhận.',                   '2026-07-20 08:45:00', '2026-07-24 15:30:00'),
(3,  5, 10, 'Bổ sung video hành trình từ thiết bị giám sát hành trình của xe.',      'pending',  NULL, NULL,                                                             '2026-08-03 09:15:00', NULL),
(4,  1, 5,  'Tôi không điều khiển xe vào thời điểm đó.',                             'rejected', 3,    'Hình ảnh camera thể hiện rõ biển số và hành vi vi phạm.',        '2026-08-09 09:00:00', '2026-08-13 14:00:00'),
(5,  8, 6,  'Xe đã đăng kiểm, giấy chứng nhận để quên ở nhà.',                       'rejected', 4,    'Chưa cung cấp được giấy chứng nhận hợp lệ.',                     '2026-09-02 08:00:00', '2026-09-04 10:00:00'),
(6,  8, 6,  'Nộp bản sao giấy chứng nhận đăng kiểm còn hạn đến ngày 10/10/2026.',    'accepted', 4,    'Xác minh đăng kiểm còn hiệu lực, hủy biên bản.',                 '2026-09-10 09:00:00', '2026-09-14 10:30:00'),
(7,  2, 1,  'Đèn tín hiệu đang nhấp nháy, không rõ pha đỏ.',                         'rejected', 4,    'Video cho thấy đèn đỏ đã bật trước khi xe vượt vạch dừng.',      '2026-09-20 10:00:00', '2026-09-24 16:00:00'),
(8,  6, 2,  'Đã đội mũ bảo hiểm nhưng quai mũ bị lỏng khi dừng xe.',                 'rejected', 4,    'Biên bản ghi nhận người vi phạm không đội mũ.',                  '2026-09-21 09:00:00', '2026-09-23 11:00:00'),
(9,  7, 4,  'Yêu cầu đo lại nồng độ cồn.',                                           'rejected', 3,    'Kết quả đo đúng quy trình, có chữ ký xác nhận.',                 '2026-10-14 10:00:00', '2026-10-16 14:30:00'),
(10, 7, 4,  'Nộp thêm giấy xác nhận đang dùng thuốc có chứa cồn.',                   'pending',  NULL, NULL,                                                             '2026-10-26 09:30:00', NULL);

-- ------------------------------------------------------------
-- Đồng bộ lại sequence IDENTITY (vì đã insert id thủ công),
-- để các lần INSERT sau không báo trùng khóa.
-- ------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users',           'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('vehicle_types',   'id'), (SELECT MAX(id) FROM vehicle_types));
SELECT setval(pg_get_serial_sequence('vehicle_models',  'id'), (SELECT MAX(id) FROM vehicle_models));
SELECT setval(pg_get_serial_sequence('violation_types', 'id'), (SELECT MAX(id) FROM violation_types));
SELECT setval(pg_get_serial_sequence('cameras',         'id'), (SELECT MAX(id) FROM cameras));
SELECT setval(pg_get_serial_sequence('owners',          'id'), (SELECT MAX(id) FROM owners));
SELECT setval(pg_get_serial_sequence('vehicles',        'id'), (SELECT MAX(id) FROM vehicles));
SELECT setval(pg_get_serial_sequence('registrations',   'id'), (SELECT MAX(id) FROM registrations));
SELECT setval(pg_get_serial_sequence('inspections',     'id'), (SELECT MAX(id) FROM inspections));
SELECT setval(pg_get_serial_sequence('violations',      'id'), (SELECT MAX(id) FROM violations));
SELECT setval(pg_get_serial_sequence('payments',        'id'), (SELECT MAX(id) FROM payments));
SELECT setval(pg_get_serial_sequence('appeals',         'id'), (SELECT MAX(id) FROM appeals));