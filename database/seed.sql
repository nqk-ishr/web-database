-- ============================================================
-- seed.sql - Dữ liệu mẫu (10 dòng / bảng) cho schema.sql
-- Chạy:  psql -U <user> -d <db> -f seed.sql
-- Thứ tự insert đã xếp theo khóa ngoại. Dữ liệu mang tính minh họa
-- (mức phạt, tọa độ, biển số... không phải số liệu thật).
-- ============================================================



-- ------------------------------------------------------------
-- 1. users (id 1-2: cán bộ đăng ký, 3-4: cán bộ vi phạm, 5-10: chủ xe)
-- password_hash chỉ là chuỗi giả, thay bằng hash thật (bcrypt) khi chạy app
-- ------------------------------------------------------------
INSERT INTO users (id, role, officer_type, username, password_hash, full_name, email, phone) VALUES
(1,  'officer', 'registration', 'officer_reg1', '$2b$12$demohash0000000000000000000001', 'Lê Thanh Hương',  'huong.le@traffic.gov.vn',  '0901000001'),
(2,  'officer', 'registration', 'officer_reg2', '$2b$12$demohash0000000000000000000002', 'Trần Văn Khoa',   'khoa.tran@traffic.gov.vn', '0901000002'),
(3,  'officer', 'violation',    'officer_vio1', '$2b$12$demohash0000000000000000000003', 'Phạm Đức Long',   'long.pham@traffic.gov.vn', '0901000003'),
(4,  'officer', 'violation',    'officer_vio2', '$2b$12$demohash0000000000000000000004', 'Ngô Thị Mai',     'mai.ngo@traffic.gov.vn',   '0901000004'),
(5,  'owner',   NULL,           'an.nguyen',    '$2b$12$demohash0000000000000000000005', 'Nguyễn Văn An',   'an.nguyen@example.com',    '0912345001'),
(6,  'owner',   NULL,           'binh.tran',    '$2b$12$demohash0000000000000000000006', 'Trần Thị Bình',   'binh.tran@example.com',    '0912345002'),
(7,  'owner',   NULL,           'cuong.le',     '$2b$12$demohash0000000000000000000007', 'Lê Hoàng Cường',  'cuong.le@example.com',     '0912345003'),
(8,  'owner',   NULL,           'duc.pham',     '$2b$12$demohash0000000000000000000008', 'Phạm Minh Đức',   'duc.pham@example.com',     '0912345004'),
(9,  'owner',   NULL,           'em.hoang',     '$2b$12$demohash0000000000000000000009', 'Hoàng Thị Em',    'em.hoang@example.com',     '0912345005'),
(10, 'owner',   NULL,           'phong.vu',     '$2b$12$demohash0000000000000000000010', 'Vũ Quốc Phong',   'phong.vu@example.com',     '0912345006');

-- ------------------------------------------------------------
-- 2. vehicle_types
-- ------------------------------------------------------------
INSERT INTO vehicle_types (id, code, name, usage, max_service_years, inspection_cycle_months, description) VALUES
(1,  'MOTORBIKE',   'Xe máy',                    'personal',   NULL, 24, 'Xe mô tô, xe gắn máy'),
(2,  'CAR_4',       'Ô tô con (dưới 7 chỗ)',     'personal',   NULL, 12, 'Ô tô chở người đến 6 chỗ'),
(3,  'CAR_7',       'Ô tô 7 chỗ',                'personal',   NULL, 12, 'Ô tô chở người 7-9 chỗ'),
(4,  'PICKUP',      'Xe bán tải',                'personal',   NULL, 12, 'Ô tô bán tải'),
(5,  'TAXI',        'Xe taxi',                   'commercial', 8,    6,  'Ô tô kinh doanh vận tải hành khách theo đồng hồ'),
(6,  'BUS',         'Xe buýt',                   'commercial', 20,   6,  'Ô tô khách tuyến cố định'),
(7,  'MINIBUS',     'Xe khách 16 chỗ',           'commercial', 15,   6,  'Ô tô khách từ 10 đến 16 chỗ'),
(8,  'TRUCK_LIGHT', 'Xe tải nhẹ',                'commercial', 25,   12, 'Xe tải dưới 3,5 tấn'),
(9,  'TRUCK_HEAVY', 'Xe tải nặng',               'commercial', 25,   6,  'Xe tải trên 7 tấn'),
(10, 'CONTAINER',   'Xe đầu kéo container',      'commercial', 20,   6,  'Xe đầu kéo sơ mi rơ moóc');

-- ------------------------------------------------------------
-- 3. vehicle_models
-- ------------------------------------------------------------
INSERT INTO vehicle_models (id, brand, name) VALUES
(1,  'Honda',    'Wave Alpha'),
(2,  'Honda',    'Vision'),
(3,  'Yamaha',   'Exciter'),
(4,  'Toyota',   'Vios'),
(5,  'Toyota',   'Innova'),
(6,  'Hyundai',  'Accent'),
(7,  'Kia',      'Morning'),
(8,  'Ford',     'Ranger'),
(9,  'VinFast',  'VF8'),
(10, 'Mazda',    'CX-5');

-- ------------------------------------------------------------
-- 4. violation_types
-- ------------------------------------------------------------
INSERT INTO violation_types (id, code, name, detection, min_fine, max_fine, points, description) VALUES
(1,  'RED_LIGHT',       'Vượt đèn đỏ',                         'camera',  4000000, 6000000, 4,  'Không chấp hành tín hiệu đèn giao thông'),
(2,  'SPEED_5_10',      'Quá tốc độ từ 5 đến dưới 10 km/h',    'camera',  600000,  800000,  2,  NULL),
(3,  'SPEED_10_20',     'Quá tốc độ từ 10 đến 20 km/h',        'camera',  4000000, 6000000, 4,  NULL),
(4,  'WRONG_LANE',      'Đi sai làn đường',                    'camera',  400000,  600000,  2,  NULL),
(5,  'ILLEGAL_PARKING', 'Dừng đỗ xe sai quy định',             'camera',  400000,  600000,  0,  NULL),
(6,  'NO_HELMET',       'Không đội mũ bảo hiểm',               'on_site', 400000,  600000,  2,  'Áp dụng cho người điều khiển xe máy'),
(7,  'DRUNK_DRIVING',   'Vi phạm nồng độ cồn',                 'on_site', 6000000, 8000000, 10, NULL),
(8,  'NO_LICENSE',      'Không có giấy phép lái xe',           'on_site', 2000000, 4000000, 0,  NULL),
(9,  'NO_INSPECTION',   'Không có giấy chứng nhận đăng kiểm',  'on_site', 3000000, 5000000, 0,  NULL),
(10, 'NO_SEATBELT',     'Không thắt dây an toàn',              'on_site', 800000,  1000000, 2,  NULL);

-- ------------------------------------------------------------
-- 5. cameras
-- ------------------------------------------------------------
INSERT INTO cameras (id, code, location_name, route, district, latitude, longitude, is_active) VALUES
(1,  'CAM-HN-001', 'Ngã tư Láng Hạ - Thái Hà',            'Láng Hạ',            'Đống Đa',      21.012300, 105.812800, TRUE),
(2,  'CAM-HN-002', 'Ngã tư Nguyễn Trãi - Khuất Duy Tiến', 'Nguyễn Trãi',        'Thanh Xuân',   20.994500, 105.802500, TRUE),
(3,  'CAM-HN-003', 'Cầu Chương Dương',                    'Quốc lộ 5',          'Long Biên',    21.033000, 105.863000, TRUE),
(4,  'CAM-HN-004', 'Phố Huế - Đại Cồ Việt',               'Phố Huế',            'Hai Bà Trưng', 21.014400, 105.850500, TRUE),
(5,  'CAM-HN-005', 'Ngã tư Sở',                           'Đường Láng',         'Đống Đa',      21.007600, 105.820600, TRUE),
(6,  'CAM-HN-006', 'Đại lộ Thăng Long km 5',              'Đại lộ Thăng Long',  'Nam Từ Liêm',  21.019000, 105.764000, TRUE),
(7,  'CAM-HN-007', 'Nút giao Pháp Vân',                   'Quốc lộ 1A',         'Hoàng Mai',    20.965000, 105.847000, TRUE),
(8,  'CAM-HN-008', 'Phạm Văn Đồng - Xuân Thủy',           'Phạm Văn Đồng',      'Cầu Giấy',     21.039000, 105.783000, TRUE),
(9,  'CAM-HN-009', 'Thanh Niên - Hồ Tây',                 'Thanh Niên',         'Tây Hồ',       21.048000, 105.842000, TRUE),
(10, 'CAM-HN-010', 'Giải Phóng - Kim Đồng',               'Giải Phóng',         'Hoàng Mai',    20.985000, 105.841000, FALSE);

-- ------------------------------------------------------------
-- 6. owners (1-6 có tài khoản user 5-10; 7-10 chưa có tài khoản; 9, 10 là tổ chức)
-- ------------------------------------------------------------
INSERT INTO owners (id, user_id, kind, full_name, identity_no, date_of_birth, phone, email, address) VALUES
(1,  5,    'individual',   'Nguyễn Văn An',                    '001085012345', '1985-03-12', '0912345001', 'an.nguyen@example.com',  '12 Trần Đại Nghĩa, Hai Bà Trưng, Hà Nội'),
(2,  6,    'individual',   'Trần Thị Bình',                    '001090023456', '1990-07-25', '0912345002', 'binh.tran@example.com',  '45 Láng Hạ, Đống Đa, Hà Nội'),
(3,  7,    'individual',   'Lê Hoàng Cường',                   '001078034567', '1978-11-02', '0912345003', 'cuong.le@example.com',   '8 Khuất Duy Tiến, Thanh Xuân, Hà Nội'),
(4,  8,    'individual',   'Phạm Minh Đức',                    '001095045678', '1995-01-30', '0912345004', 'duc.pham@example.com',   '23 Cầu Giấy, Cầu Giấy, Hà Nội'),
(5,  9,    'individual',   'Hoàng Thị Em',                     '001088056789', '1988-09-14', '0912345005', 'em.hoang@example.com',   '67 Nguyễn Chí Thanh, Đống Đa, Hà Nội'),
(6,  10,   'individual',   'Vũ Quốc Phong',                    '001082067890', '1982-05-19', '0912345006', 'phong.vu@example.com',   '15 Giải Phóng, Hoàng Mai, Hà Nội'),
(7,  NULL, 'individual',   'Đặng Thu Giang',                   '001092078901', '1992-12-08', '0912345007', 'giang.dang@example.com', '90 Xuân Thủy, Cầu Giấy, Hà Nội'),
(8,  NULL, 'individual',   'Bùi Văn Hải',                      '001075089012', '1975-04-21', '0912345008', 'hai.bui@example.com',    '34 Phố Huế, Hai Bà Trưng, Hà Nội'),
(9,  NULL, 'organization', 'Công ty TNHH Taxi Thành Công',     '0101234567',   NULL,         '0243800001', 'info@taxithanhcong.vn',  '100 Nguyễn Trãi, Thanh Xuân, Hà Nội'),
(10, NULL, 'organization', 'Công ty CP Vận tải Việt Á',        '0109876543',   NULL,         '0243800002', 'info@vantaivieta.vn',    '5 Phạm Hùng, Nam Từ Liêm, Hà Nội');

-- ------------------------------------------------------------
-- 7. vehicles
-- ------------------------------------------------------------
INSERT INTO vehicles (id, model_id, vehicle_type_id, chassis_no, engine_no, color, manufacture_year) VALUES
(1,  1,  1, 'RLHJA3920JY000001', 'JA39E-0000001', 'Đen',    2018),
(2,  2,  1, 'RLHJF4120LY000002', 'JF41E-0000002', 'Trắng',  2020),
(3,  3,  1, 'RLCUG1010MY000003', 'G3D1E-0000003', 'Xanh',   2021),
(4,  4,  2, 'MHFBB3F3X0K000004', '2NR-0000004',   'Bạc',    2019),
(5,  5,  3, 'MHFXW8CS7H0000005', '2TR-0000005',   'Trắng',  2017),
(6,  6,  5, 'KMHCT41DBLU000006', 'G4LC-0000006',  'Trắng',  2020),
(7,  7,  2, 'KNABX512AGT000007', 'G3LA-0000007',  'Đỏ',     2016),
(8,  8,  4, 'MNCLMFF80NW000008', 'PUMA-0000008',  'Xám',    2022),
(9,  9,  2, 'RLVVF8000PH000009', 'EV-0000009',    'Xanh',   2023),
(10, 10, 2, 'JMZKF2W7A00000010', 'PY-VPS-0000010','Đỏ',     2021);

-- ------------------------------------------------------------
-- 8. registrations
-- Xe 1 và xe 4 có lịch sử: 1 đăng ký cũ (closed) + 1 đăng ký hiện hành (active)
-- Xe 9, 10 chưa đăng ký biển số.
-- ------------------------------------------------------------
INSERT INTO registrations (id, vehicle_id, owner_id, registered_by, plate_number, valid_from, valid_to, status) VALUES
(1,  1, 6,  1, '29B1-123.45', '2021-06-01', NULL,         'active'),
(2,  2, 2,  1, '29E1-456.78', '2020-08-15', NULL,         'active'),
(3,  3, 3,  2, '29G1-789.01', '2021-09-20', NULL,         'active'),
(4,  4, 4,  2, '30K-567.89',  '2022-01-10', NULL,         'active'),
(5,  5, 5,  1, '30L-234.56',  '2017-11-03', NULL,         'active'),
(6,  6, 9,  2, '29F-345.67',  '2020-03-01', NULL,         'active'),
(7,  7, 7,  1, '51A-678.90',  '2016-07-22', NULL,         'active'),
(8,  8, 10, 2, '30H-890.12',  '2022-10-05', NULL,         'active'),
(9,  1, 8,  1, '29B1-111.22', '2018-03-10', '2021-06-01', 'closed'),
(10, 4, 1,  2, '30H-123.45',  '2019-05-12', '2022-01-10', 'closed');

-- ------------------------------------------------------------
-- 9. inspections (đạt => có expires_at, không đạt => NULL)
-- ------------------------------------------------------------
INSERT INTO inspections (id, vehicle_id, inspector_id, result, certificate_no, inspected_at, expires_at, notes) VALUES
(1,  4, 1, 'passed', 'DK-2025-0001', '2025-02-10', '2026-02-10', NULL),
(2,  4, 1, 'passed', 'DK-2026-0001', '2026-02-05', '2027-02-05', NULL),
(3,  5, 2, 'passed', 'DK-2025-0002', '2025-06-18', '2026-06-18', NULL),
(4,  6, 2, 'passed', 'DK-2025-0003', '2025-09-01', '2026-03-01', NULL),
(5,  6, 2, 'failed', NULL,           '2026-03-02', NULL,         'Phanh không đạt yêu cầu'),
(6,  6, 1, 'passed', 'DK-2026-0002', '2026-03-09', '2026-09-09', 'Đã khắc phục hệ thống phanh'),
(7,  7, 1, 'failed', NULL,           '2025-12-12', NULL,         'Khí thải vượt mức cho phép'),
(8,  7, 1, 'passed', 'DK-2025-0004', '2025-12-20', '2026-12-20', NULL),
(9,  8, 2, 'passed', 'DK-2025-0005', '2025-11-11', '2026-11-11', NULL),
(10, 9, 2, 'passed', 'DK-2026-0003', '2026-01-20', '2027-01-20', 'Xe mới, kiểm định lần đầu');

-- ------------------------------------------------------------
-- 10. violations
-- Vi phạm camera (source='camera') phải có camera_id; tại chỗ thì camera_id NULL.
-- Vi phạm 10: camera đọc được biển nhưng chưa khớp xe => vehicle_id/registration_id NULL.
-- ------------------------------------------------------------
INSERT INTO violations
    (id, source, camera_id, violation_type_id, vehicle_id, registration_id, plate_detected,
     occurred_at, location_detail, fine_amount, status, evidence_url,
     verified_by, verified_at, notified_at, due_date)
VALUES
(1,  'camera',  1,    1, 4,    4,    '30K-567.89',  '2026-08-12 08:15:00', 'Ngã tư Láng Hạ - Thái Hà',            5000000, 'paid',
     'https://storage.example.com/evidence/v001.jpg', 3, '2026-08-13 09:00:00', '2026-08-14 08:00:00', '2026-09-14'),
(2,  'camera',  2,    2, 3,    3,    '29G1-789.01', '2026-09-03 17:40:00', 'Ngã tư Nguyễn Trãi - Khuất Duy Tiến', 700000,  'notified',
     'https://storage.example.com/evidence/v002.jpg', 3, '2026-09-04 09:30:00', '2026-09-05 08:00:00', '2026-10-05'),
(3,  'camera',  3,    4, 5,    5,    '30L-234.56',  '2026-09-10 11:05:00', 'Cầu Chương Dương',                    500000,  'verified',
     'https://storage.example.com/evidence/v003.jpg', 4, '2026-09-11 10:00:00', NULL,                  NULL),
(4,  'camera',  4,    5, 7,    7,    '51A-678.90',  '2026-10-02 14:20:00', 'Phố Huế - Đại Cồ Việt',               450000,  'new',
     'https://storage.example.com/evidence/v004.jpg', NULL, NULL,              NULL,                  NULL),
(5,  'camera',  5,    1, 6,    6,    '29F-345.67',  '2026-07-21 19:30:00', 'Ngã tư Sở',                           6000000, 'appealing',
     'https://storage.example.com/evidence/v005.jpg', 4, '2026-07-22 09:00:00', '2026-07-23 08:00:00', '2026-08-23'),
(6,  'on_site', NULL, 6, 1,    1,    '29B1-123.45', '2026-09-18 07:50:00', 'Đường Nguyễn Trãi, Thanh Xuân',       400000,  'paid',
     NULL,                                            4, '2026-09-18 08:10:00', '2026-09-18 08:10:00', '2026-10-18'),
(7,  'on_site', NULL, 7, 8,    8,    '30H-890.12',  '2026-10-10 23:10:00', 'Đường Phạm Hùng, Nam Từ Liêm',        7000000, 'appealing',
     NULL,                                            3, '2026-10-11 09:00:00', '2026-10-12 08:00:00', '2026-11-12'),
(8,  'on_site', NULL, 9, 5,    5,    '30L-234.56',  '2026-08-20 10:30:00', 'Đường Nguyễn Chí Thanh, Đống Đa',     3500000, 'cancelled',
     NULL,                                            4, '2026-08-21 09:00:00', '2026-08-22 08:00:00', '2026-09-22'),
(9,  'camera',  6,    3, 8,    8,    '30H-890.12',  '2026-06-15 06:45:00', 'Đại lộ Thăng Long km 5',              5000000, 'paid',
     'https://storage.example.com/evidence/v009.jpg', 3, '2026-06-16 09:00:00', '2026-06-17 08:00:00', '2026-07-17'),
(10, 'camera',  7,    2, NULL, NULL, '29A-999.99',  '2026-10-25 21:15:00', 'Nút giao Pháp Vân',                   700000,  'new',
     'https://storage.example.com/evidence/v010.jpg', NULL, NULL,              NULL,                  NULL);

-- ------------------------------------------------------------
-- 11. payments
-- Online: có paid_by (chủ xe). Tiền mặt: có recorded_by (cán bộ).
-- Mỗi vi phạm tối đa 1 lần 'success' (vi phạm 1, 6, 9); các lần còn lại là 'failed'.
-- ------------------------------------------------------------
INSERT INTO payments (id, violation_id, paid_by, recorded_by, amount, method, status, transaction_ref, paid_at) VALUES
(1,  1, 4,    NULL, 5000000, 'online_qr', 'failed',  'TXN20260825000', '2026-08-25 10:05:00'),
(2,  1, 4,    NULL, 5000000, 'online_qr', 'success', 'TXN20260825001', '2026-08-25 10:12:00'),
(3,  6, 6,    NULL, 400000,  'online_qr', 'failed',  'TXN20260922001', '2026-09-22 15:30:00'),
(4,  6, NULL, 4,    400000,  'cash',      'success', 'CASH20260923001','2026-09-23 09:20:00'),
(5,  9, 10,   NULL, 5000000, 'online_qr', 'failed',  'TXN20260702000', '2026-07-02 08:50:00'),
(6,  9, 10,   NULL, 5000000, 'online_qr', 'success', 'TXN20260702001', '2026-07-02 08:58:00'),
(7,  2, 3,    NULL, 700000,  'online_qr', 'failed',  'TXN20260910001', '2026-09-10 20:00:00'),
(8,  5, 9,    NULL, 6000000, 'online_qr', 'failed',  'TXN20260810001', '2026-08-10 14:25:00'),
(9,  7, 10,   NULL, 7000000, 'online_qr', 'failed',  'TXN20261015001', '2026-10-15 16:40:00'),
(10, 8, 5,    NULL, 3500000, 'online_qr', 'failed',  'TXN20260824001', '2026-08-24 11:10:00');

-- ------------------------------------------------------------
-- 12. appeals
-- pending <=> resolved_at IS NULL; mỗi vi phạm tối đa 1 khiếu nại đang chờ (vi phạm 5, 7).
-- ------------------------------------------------------------
INSERT INTO appeals (id, violation_id, owner_id, reason, status, resolved_by, resolution_note, created_at, resolved_at) VALUES
(1,  1, 4,  'Tôi không điều khiển xe vào thời điểm này.',                     'rejected', 3,    'Hình ảnh camera thể hiện rõ biển số và hành vi vi phạm.', '2026-08-16 09:00:00', '2026-08-20 14:00:00'),
(2,  2, 3,  'Đoạn đường biển báo tốc độ bị che khuất.',                       'rejected', 3,    'Biển báo hợp lệ, không bị che khuất theo kiểm tra thực địa.', '2026-09-08 10:00:00', '2026-09-12 16:00:00'),
(3,  5, 9,  'Tài xế đang nhường đường cho xe ưu tiên.',                       'rejected', 4,    'Không có xe ưu tiên trong hình ảnh ghi nhận.',            '2026-07-28 08:30:00', '2026-07-30 15:00:00'),
(4,  5, 9,  'Bổ sung video hành trình từ thiết bị giám sát của xe.',          'pending',  NULL, NULL,                                                      '2026-08-05 09:15:00', NULL),
(5,  6, 6,  'Đã đội mũ bảo hiểm nhưng bị bung quai khi dừng xe.',             'rejected', 4,    'Biên bản ghi nhận người vi phạm không đội mũ.',           '2026-09-19 09:00:00', '2026-09-21 11:00:00'),
(6,  7, 10, 'Yêu cầu kiểm tra lại kết quả đo nồng độ cồn.',                   'rejected', 3,    'Kết quả đo đúng quy trình, có xác nhận của người vi phạm.', '2026-10-20 10:00:00', '2026-10-22 14:30:00'),
(7,  7, 10, 'Nộp thêm giấy tờ chứng minh lái xe đang dùng thuốc có cồn.',     'pending',  NULL, NULL,                                                      '2026-10-28 09:00:00', NULL),
(8,  8, 5,  'Xe đã đăng kiểm, giấy chứng nhận để quên tại nhà.',              'rejected', 4,    'Chưa cung cấp được giấy chứng nhận hợp lệ.',              '2026-08-25 08:00:00', '2026-08-28 10:00:00'),
(9,  8, 5,  'Nộp bản sao giấy chứng nhận đăng kiểm còn hạn tại thời điểm vi phạm.', 'accepted', 4, 'Xác minh đăng kiểm còn hiệu lực, hủy biên bản.',         '2026-09-01 09:00:00', '2026-09-05 10:30:00'),
(10, 9, 10, 'Xe bị sai số liệu tốc độ do camera chưa hiệu chuẩn.',            'rejected', 3,    'Camera đã được kiểm định định kỳ.',                       '2026-06-20 09:00:00', '2026-06-24 15:00:00');

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

