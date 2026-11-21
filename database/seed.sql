-- =====================================================================
-- seed_new.sql — Dữ liệu mẫu (danh mục + demo) khớp với schema.sql (16 bảng)
-- Chạy:  psql -v ON_ERROR_STOP=1 -d <db> -f schema.sql
--        psql -v ON_ERROR_STOP=1 -d <db> -f seed_new.sql
-- File này THAY THẾ seed_catalog.sql (đừng chạy cả hai). Các bảng phải đang TRỐNG.
-- Bối cảnh: TP. Hồ Chí Minh. Dữ liệu mang tính minh họa, không phải số liệu thật.
-- "Hôm nay" của bộ dữ liệu: 2026-11-07 (quá hạn / sắp hết hạn tính theo ngày này).
--
-- Cách nạp: tạm tắt trigger người dùng để nạp được dữ liệu lịch sử (ví dụ hồ sơ
-- sang tên năm 2023 mà trigger kiểm "chủ hiện hành" sẽ từ chối), rồi bật lại.
-- Mọi CHECK / UNIQUE / EXCLUDE vẫn hiệu lực. Khối DO ở cuối kiểm tra lại các quy
-- tắc liên bảng mà trigger đáng lẽ kiểm; sai thì ROLLBACK toàn bộ.
--
-- Các tình huống có sẵn để demo:
--  * Xe 2 (xe máy): bị báo mất sau khi duyệt bồi thường mất cắp (yêu cầu 8);
--    hồ sơ sang tên đang mở bị hủy; vi phạm 10 phát sinh sau khi mất xe (cảnh báo).
--  * Xe 3: sang tên 2023-02-15; vi phạm 9 (ngày 10/02) vẫn thuộc người bán (user 12).
--  * Xe 6: vi phạm "không có bảo hiểm" (8) bị hủy vì lúc đó có hợp đồng hiệu lực.
--  * Xe 7: hồ sơ sang tên đang chờ duyệt nhưng đã có vi phạm 3 (Đã xác minh) =>
--          duyệt sẽ bị chặn (nợ phạt chặn sang tên).
--  * Xe 9: hợp đồng bảo hiểm đã hết hạn (suy ra từ end_date) => vi phạm 11.
--  * Xe 8: hợp đồng sắp hết hạn (17/11/2026). Xe 5: gia hạn đang chờ thanh toán.
--  * Vi phạm 2 và 5 quá hạn (Đã thông báo, quá due_date); vi phạm 6 nộp trễ có phạt trễ.
--  * Vi phạm 7: biển số không khớp xe nào (vehicle_id NULL, chờ cán bộ hủy).
-- =====================================================================

BEGIN;

ALTER TABLE users                 DISABLE TRIGGER USER;
ALTER TABLE vehicles              DISABLE TRIGGER USER;
ALTER TABLE registration_requests DISABLE TRIGGER USER;
ALTER TABLE violations            DISABLE TRIGGER USER;
ALTER TABLE payments              DISABLE TRIGGER USER;
ALTER TABLE insurance_policies    DISABLE TRIGGER USER;
ALTER TABLE policy_payments       DISABLE TRIGGER USER;
ALTER TABLE insurance_claims      DISABLE TRIGGER USER;

-- ---------------------------------------------------------------------
-- 1. roles
-- ---------------------------------------------------------------------
INSERT INTO roles (role_id, code, name) OVERRIDING SYSTEM VALUE VALUES
(1, 'owner',             'Chủ phương tiện'),
(2, 'registrar',         'Cán bộ đăng ký phương tiện'),
(3, 'violation_officer', 'Cán bộ xử lý vi phạm'),
(4, 'insurance_staff',   'Nhân viên bảo hiểm'),
(5, 'admin',             'Quản trị hệ thống');

-- ---------------------------------------------------------------------
-- 2. insurers
-- ---------------------------------------------------------------------
INSERT INTO insurers (insurer_id, code, name, hotline) OVERRIDING SYSTEM VALUE VALUES
(1, 'DEMO_A', 'Công ty Bảo hiểm Demo A', '1900000001'),
(2, 'DEMO_B', 'Công ty Bảo hiểm Demo B', '1900000002');

-- ---------------------------------------------------------------------
-- 3. users
-- 1-2: cán bộ đăng ký | 3-4: cán bộ xử lý vi phạm | 5-12: chủ xe cá nhân
-- 13-14: chủ xe là tổ chức (không có CCCD) | 15-16: nhân viên bảo hiểm | 17: quản trị
-- password_hash chỉ là chuỗi giả, thay bằng bcrypt thật khi chạy ứng dụng.
-- ---------------------------------------------------------------------
INSERT INTO users (user_id, role_id, insurer_id, username, password_hash, full_name, citizen_id, phone, email) OVERRIDING SYSTEM VALUE VALUES
(1,  2, NULL, 'canbo_dk01',    '$2b$12$demohash1000000000000000000001', 'Đỗ Minh Quân',    NULL,           '0902100001', 'quan.do@giaothong.hcm.vn'),
(2,  2, NULL, 'canbo_dk02',    '$2b$12$demohash1000000000000000000002', 'Võ Thị Hạnh',     NULL,           '0902100002', 'hanh.vo@giaothong.hcm.vn'),
(3,  3, NULL, 'canbo_vp01',    '$2b$12$demohash1000000000000000000003', 'Huỳnh Văn Tâm',   NULL,           '0902100003', 'tam.huynh@giaothong.hcm.vn'),
(4,  3, NULL, 'canbo_vp02',    '$2b$12$demohash1000000000000000000004', 'Dương Thu Trang', NULL,           '0902100004', 'trang.duong@giaothong.hcm.vn'),
(5,  1, NULL, 'bao.truong',    '$2b$12$demohash1000000000000000000005', 'Trương Gia Bảo',  '079090011111', '0933400001', 'bao.truong@example.com'),
(6,  1, NULL, 'diep.lam',      '$2b$12$demohash1000000000000000000006', 'Lâm Ngọc Diệp',   '079095022222', '0933400002', 'diep.lam@example.com'),
(7,  1, NULL, 'vinh.cao',      '$2b$12$demohash1000000000000000000007', 'Cao Thế Vinh',    '079082033333', '0933400003', 'vinh.cao@example.com'),
(8,  1, NULL, 'tuan.mai',      '$2b$12$demohash1000000000000000000008', 'Mai Anh Tuấn',    '079088044444', '0933400004', 'tuan.mai@example.com'),
(9,  1, NULL, 'kim.dinh',      '$2b$12$demohash1000000000000000000009', 'Đinh Thị Kim',    '079076055555', '0933400005', 'kim.dinh@example.com'),
(10, 1, NULL, 'nghia.ta',      '$2b$12$demohash1000000000000000000010', 'Tạ Hữu Nghĩa',    '079093066666', '0933400006', 'nghia.ta@example.com'),
(11, 1, NULL, 'hieu.chau',     '$2b$12$demohash1000000000000000000011', 'Châu Minh Hiếu',  '079099077777', '0933400007', 'hieu.chau@example.com'),
(12, 1, NULL, 'le.quach',      '$2b$12$demohash1000000000000000000012', 'Quách Thị Lệ',    '079084088888', '0933400008', 'le.quach@example.com'),
(13, 1, NULL, 'saigonxanh',    '$2b$12$demohash1000000000000000000013', 'Công ty CP Xe điện Sài Gòn Xanh', NULL, '0283900001', 'info@saigonxanh.vn'),
(14, 1, NULL, 'vantaidongnam', '$2b$12$demohash1000000000000000000014', 'Công ty TNHH Vận tải Đông Nam',   NULL, '0283900002', 'info@vantaidongnam.vn'),
(15, 4, 1,    'bh_demoa01',    '$2b$12$demohash1000000000000000000015', 'Phạm Quốc Việt',  NULL,           '0283900011', 'viet.pham@demoa.example.com'),
(16, 4, 2,    'bh_demob01',    '$2b$12$demohash1000000000000000000016', 'Ngô Thanh Hà',    NULL,           '0283900012', 'ha.ngo@demob.example.com'),
(17, 5, NULL, 'admin01',       '$2b$12$demohash1000000000000000000017', 'Lý Hoàng Nam',    NULL,           '0902100099', 'admin@giaothong.hcm.vn');

-- ---------------------------------------------------------------------
-- 4. vehicle_types
-- ---------------------------------------------------------------------
INSERT INTO vehicle_types (vehicle_type_id, name, usage_purpose) OVERRIDING SYSTEM VALUE VALUES
(1,  'Xe máy dưới 175cc',     'cá nhân'),
(2,  'Mô tô phân khối lớn',   'cá nhân'),
(3,  'Ô tô sedan',            'cá nhân'),
(4,  'Ô tô SUV',              'cá nhân'),
(5,  'Ô tô MPV 7 chỗ',        'cá nhân'),
(6,  'Taxi điện',             'kinh doanh vận tải'),
(7,  'Xe hợp đồng công nghệ', 'kinh doanh vận tải'),
(8,  'Xe khách 45 chỗ',       'kinh doanh vận tải'),
(9,  'Xe tải 5 tấn',          'kinh doanh vận tải'),
(10, 'Xe đầu kéo',            'kinh doanh vận tải');

-- ---------------------------------------------------------------------
-- 5. violation_types (chỉ giữ lỗi phạt nguội qua camera; mức phạt minh họa)
-- ---------------------------------------------------------------------
INSERT INTO violation_types (violation_type_id, code, description, min_fine, max_fine) OVERRIDING SYSTEM VALUE VALUES
(1, 'RED_LIGHT_CAR',            'Ô tô vượt đèn đỏ: không chấp hành tín hiệu đèn giao thông',          18000000, 20000000),
(2, 'RED_LIGHT_MOTO',           'Xe máy, mô tô vượt đèn đỏ: không chấp hành tín hiệu đèn giao thông',  4000000,  6000000),
(3, 'SPEED_OVER_20',            'Ô tô quá tốc độ trên 20 đến 35 km/h',                                12000000, 14000000),
(4, 'RESERVED_LANE',            'Đi vào làn đường dành riêng',                                         2000000,  3000000),
(5, 'STOP_LINE',                'Dừng xe quá vạch dừng',                                                400000,   600000),
(6, 'NO_COMPULSORY_INSURANCE',  'Không có bảo hiểm bắt buộc còn hiệu lực',                              200000,   600000);

-- ---------------------------------------------------------------------
-- 6. cameras (tuyến đường và quận ghép vào location_name)
-- ---------------------------------------------------------------------
INSERT INTO cameras (camera_id, code, location_name) OVERRIDING SYSTEM VALUE VALUES
(1,  'CAM-SG-001', 'Ngã tư Hàng Xanh, Điện Biên Phủ, Bình Thạnh'),
(2,  'CAM-SG-002', 'Vòng xoay Dân Chủ, Võ Văn Tần, Quận 3'),
(3,  'CAM-SG-003', 'Cầu Sài Gòn, Xa lộ Hà Nội, Thành phố Thủ Đức'),
(4,  'CAM-SG-004', 'Ngã sáu Phù Đổng, Trần Hưng Đạo, Quận 1'),
(5,  'CAM-SG-005', 'Ngã tư Bảy Hiền, Cách Mạng Tháng Tám, Tân Bình'),
(6,  'CAM-SG-006', 'Cầu Phú Mỹ, Nguyễn Văn Linh, Quận 7'),
(7,  'CAM-SG-007', 'Ngã tư An Sương, Quốc lộ 22, Quận 12'),
(8,  'CAM-SG-008', 'Nút giao Mỹ Thủy, Mai Chí Thọ, Thành phố Thủ Đức'),
(9,  'CAM-SG-009', 'Ngã ba Cát Lái, Đồng Văn Cống, Thành phố Thủ Đức'),
(10, 'CAM-SG-010', 'Ngã tư Thủ Đức, Võ Văn Ngân, Thành phố Thủ Đức');

-- ---------------------------------------------------------------------
-- 7. vehicles (xe 10 "đầu kéo" chưa có biển nên chưa là xe: xem hồ sơ đăng ký 5)
-- Xe 2 đang ở trạng thái Báo mất (stolen).
-- ---------------------------------------------------------------------
INSERT INTO vehicles (vehicle_id, plate_number, chassis_number, engine_number, manufacture_year, vehicle_type_id, status, created_at) OVERRIDING SYSTEM VALUE VALUES
(1, '59X3-123.45', 'RLHJF6320MY100001', 'JF63E-1000001',  2021, 1, 'normal', '2021-04-20 09:00:00+07'),
(2, '59T1-234.56', 'RLHJK0110NY100002', 'JK01E-1000002',  2022, 1, 'stolen', '2022-07-11 09:00:00+07'),
(3, '59P2-345.67', 'RLCAB1010LY100003', 'E3N1E-1000003',  2020, 1, 'normal', '2020-09-01 09:00:00+07'),
(4, '59A1-456.78', 'JKAZR900XPA100004', 'ZR900AE-100004', 2023, 2, 'normal', '2023-09-05 09:00:00+07'),
(5, '51K-567.89',  'JTNBF3HK0M3100005', 'A25A-1000005',   2021, 3, 'normal', '2021-12-01 09:00:00+07'),
(6, '51G-678.90',  'PA4NC5HKAKA100006', '4A91-1000006',   2019, 5, 'normal', '2019-10-14 09:00:00+07'),
(7, '51H-789.01',  'KMHS381ABNU100007', 'D4HB-1000007',   2022, 4, 'normal', '2022-05-30 09:00:00+07'),
(8, '51B-890.12',  'RLVVE3400NH100008', 'EV-E34-100008',  2022, 6, 'normal', '2022-11-18 09:00:00+07'),
(9, '51B-901.23',  'RPTU45A00KB100009', 'WP10-1000009',   2019, 8, 'normal', '2019-08-02 09:00:00+07');

-- ---------------------------------------------------------------------
-- 8. ownership_history (xe 3: user 12 sở hữu đến 2023-02-15, sau đó user 7)
-- ---------------------------------------------------------------------
INSERT INTO ownership_history (ownership_id, vehicle_id, owner_id, valid_from, valid_to) OVERRIDING SYSTEM VALUE VALUES
(1,  1, 5,  '2021-04-20 09:00:00+07', NULL),
(2,  2, 6,  '2022-07-11 09:00:00+07', NULL),
(3,  3, 12, '2020-09-01 09:00:00+07', '2023-02-15 09:00:00+07'),
(4,  3, 7,  '2023-02-15 09:00:00+07', NULL),
(5,  4, 8,  '2023-09-05 09:00:00+07', NULL),
(6,  5, 9,  '2021-12-01 09:00:00+07', NULL),
(7,  6, 10, '2019-10-14 09:00:00+07', NULL),
(8,  7, 11, '2022-05-30 09:00:00+07', NULL),
(9,  8, 13, '2022-11-18 09:00:00+07', NULL),
(10, 9, 14, '2019-08-02 09:00:00+07', NULL);

-- ---------------------------------------------------------------------
-- 9. registration_requests
-- Hồ sơ mở (chưa ở trạng thái cuối): 5, 6, 8, 9. Mỗi xe tối đa một hồ sơ mở.
-- ---------------------------------------------------------------------
INSERT INTO registration_requests
    (request_id, request_type, status, vehicle_id, requester_id, buyer_id,
     declared_vehicle_type_id, declared_chassis_number, declared_engine_number, declared_manufacture_year,
     reviewer_id, review_note, cancel_reason, submitted_at) OVERRIDING SYSTEM VALUE VALUES
(1,  'new_registration', 'approved',             1,    5,  NULL, 1,    'RLHJF6320MY100001', 'JF63E-1000001', 2021, 1,    NULL, NULL, '2021-04-18 09:30:00+07'),
(2,  'new_registration', 'approved',             2,    6,  NULL, 1,    'RLHJK0110NY100002', 'JK01E-1000002', 2022, 1,    NULL, NULL, '2022-07-09 09:30:00+07'),
(3,  'transfer',         'approved',             3,    12, 7,    NULL, NULL,                NULL,            NULL, 2,    NULL, NULL, '2023-02-12 10:00:00+07'),
(4,  'new_registration', 'approved',             8,    13, NULL, 6,    'RLVVE3400NH100008', 'EV-E34-100008', 2022, 2,    NULL, NULL, '2022-11-16 09:00:00+07'),
(5,  'new_registration', 'pending_approval',     NULL, 14, NULL, 10,   'JHFM7K0000K100010', 'J08E-1000010',  2018, NULL, NULL, NULL, '2026-10-28 10:00:00+07'),
(6,  'new_registration', 'needs_more_info',      NULL, 12, NULL, 1,    'RLHJF6320PY200011', 'JF63E-2000011', 2023, 1,    'Thiếu bản sao giấy tờ nguồn gốc xe', NULL, '2026-10-15 09:00:00+07'),
(7,  'new_registration', 'rejected',             NULL, 11, NULL, 1,    'RLCAB1010XY300012', 'E3N1E-3000012', 2022, 2,    'Số khung không khớp giấy tờ nguồn gốc', NULL, '2026-09-18 09:00:00+07'),
(8,  'transfer',         'pending_confirmation', 6,    10, 8,    NULL, NULL,                NULL,            NULL, NULL, NULL, NULL, '2026-11-03 14:00:00+07'),
(9,  'transfer',         'pending_approval',     7,    11, 12,   NULL, NULL,                NULL,            NULL, NULL, NULL, NULL, '2026-09-10 11:00:00+07'),
(10, 'transfer',         'cancelled',            2,    6,  9,    NULL, NULL,                NULL,            NULL, NULL, NULL, 'Xe đã được báo mất', '2026-10-12 15:00:00+07');

-- ---------------------------------------------------------------------
-- 10. violations (toàn bộ là phạt nguội: camera_id bắt buộc)
-- Quá hạn = status 'notified' mà due_date < 2026-11-07 (vi phạm 2, 5, 11).
-- ---------------------------------------------------------------------
INSERT INTO violations
    (violation_id, vehicle_id, plate_number_captured, liable_owner_id, violation_type_id, camera_id,
     occurred_at, status, fine_amount, decision_number, due_date,
     handled_by, verified_at, notified_at, cancelled_reason) OVERRIDING SYSTEM VALUE VALUES
(1,  5,    '51K-567.89',  9,    1, 1, '2026-08-05 07:35:00+07', 'paid',      18000000, 'QD-2026-0001', '2026-09-07', 3,    '2026-08-06 09:00:00+07', '2026-08-07 08:00:00+07', NULL),
(2,  1,    '59X3-123.45', 5,    2, 5, '2026-09-14 18:20:00+07', 'notified',   5000000, 'QD-2026-0002', '2026-10-16', 3,    '2026-09-15 10:00:00+07', '2026-09-16 08:00:00+07', NULL),
(3,  7,    '51H-789.01',  11,   3, 3, '2026-09-22 05:50:00+07', 'verified',  13000000, NULL,           NULL,         4,    '2026-09-23 09:30:00+07', NULL,                    NULL),
(4,  8,    '51B-890.12',  13,   4, 2, '2026-10-03 09:10:00+07', 'recorded',   NULL,     NULL,           NULL,         NULL, NULL,                    NULL,                    NULL),
(5,  9,    '51B-901.23',  14,   1, 6, '2026-07-15 20:45:00+07', 'notified',  19000000, 'QD-2026-0003', '2026-08-17', 4,    '2026-07-16 09:00:00+07', '2026-07-17 08:00:00+07', NULL),
(6,  8,    '51B-890.12',  13,   3, 7, '2026-06-10 06:30:00+07', 'paid',      12000000, 'QD-2026-0004', '2026-07-12', 3,    '2026-06-11 09:00:00+07', '2026-06-12 08:00:00+07', NULL),
(7,  NULL, '59Z9-999.99', NULL, 5, 8, '2026-10-27 16:55:00+07', 'recorded',   NULL,     NULL,           NULL,         NULL, NULL,                    NULL,                    NULL),
(8,  6,    '51G-678.90',  10,   6, 4, '2026-08-28 10:15:00+07', 'cancelled',  NULL,     NULL,           NULL,         4,    NULL,                    NULL,
     'Xe có hợp đồng bảo hiểm hiệu lực tại thời điểm vi phạm (BH-0000000006)'),
(9,  3,    '59P2-345.67', 12,   4, 4, '2023-02-10 08:10:00+07', 'paid',       2500000, 'QD-2023-0001', '2023-03-15', 3,    '2023-02-13 09:00:00+07', '2023-02-14 08:00:00+07', NULL),
(10, 2,    '59T1-234.56', 6,    2, 9, '2026-10-10 21:30:00+07', 'recorded',   NULL,     NULL,           NULL,         NULL, NULL,                    NULL,                    NULL),
(11, 9,    '51B-901.23',  14,   6, 7, '2026-09-05 11:20:00+07', 'notified',    400000, 'QD-2026-0005', '2026-10-20', 4,    '2026-09-06 09:00:00+07', '2026-09-07 08:00:00+07', NULL);

-- ---------------------------------------------------------------------
-- 11. payments (nộp phạt). failed => paid_at NULL (thời điểm thử nằm ở created_at).
-- Phạt trễ = 0,05% x số tiền phạt x số ngày quá hạn (cách tính đơn giản hóa).
-- Vi phạm 6: hạn 12/07, nộp 20/07 => 8 ngày x 6.000 = 48.000.
-- ---------------------------------------------------------------------
INSERT INTO payments (payment_id, violation_id, paid_by, fine_amount, late_fee, status, gateway_ref, created_at, paid_at) OVERRIDING SYSTEM VALUE VALUES
(1, 6, 13, 12000000, 18000, 'failed',  'TXN20260715001', '2026-07-15 15:45:00+07', NULL),
(2, 6, 13, 12000000, 48000, 'success', 'TXN20260720001', '2026-07-20 13:50:00+07', '2026-07-20 14:00:00+07'),
(3, 5, 14, 19000000, 0,     'failed',  'TXN20260802001', '2026-08-02 11:20:00+07', NULL),
(4, 1, 9,  18000000, 0,     'failed',  'TXN20260818001', '2026-08-18 21:05:00+07', NULL),
(5, 1, 9,  18000000, 0,     'success', 'TXN20260820001', '2026-08-20 09:10:00+07', '2026-08-20 09:12:00+07'),
(6, 2, 5,  5000000,  0,     'failed',  'TXN20261002001', '2026-10-02 08:15:00+07', NULL),
(7, 9, 12, 2500000,  0,     'success', 'TXN20230301001', '2023-03-01 09:55:00+07', '2023-03-01 10:00:00+07'),
(8, 2, 5,  5000000,  10000, 'failed',  'TXN20261020001', '2026-10-20 09:00:00+07', NULL);

-- ---------------------------------------------------------------------
-- 12. insurance_products (phí, hạn mức giả lập)
-- ---------------------------------------------------------------------
INSERT INTO insurance_products (product_id, insurer_id, vehicle_type_id, name, premium, term_months, liability_limit, includes_theft) OVERRIDING SYSTEM VALUE VALUES
(1,  1, 1, 'Cơ bản',               70000,   12, 150000000, FALSE),
(2,  1, 1, 'Mở rộng (có mất cắp)', 250000,  12, 150000000, TRUE),
(3,  1, 3, 'Cơ bản',               480000,  12, 150000000, FALSE),
(4,  1, 3, 'Mở rộng (có mất cắp)', 1800000, 12, 150000000, TRUE),
(5,  1, 4, 'Cơ bản',               520000,  12, 150000000, FALSE),
(6,  1, 5, 'Cơ bản',               500000,  12, 150000000, FALSE),
(7,  2, 1, 'Cơ bản',               65000,   12, 150000000, FALSE),
(8,  2, 2, 'Cơ bản',               180000,  12, 150000000, FALSE),
(9,  2, 6, 'Cơ bản',               1100000, 12, 150000000, FALSE),
(10, 2, 8, 'Cơ bản',               3000000, 12, 150000000, FALSE);

-- ---------------------------------------------------------------------
-- 13. insurance_policies (end_date = start_date + 12 tháng - 1 ngày)
-- 9: đã hết hạn (end_date < 2026-11-07, vẫn status active) | 8: sắp hết hạn
-- 10: gia hạn xe 5, chờ thanh toán | 11: hợp đồng đã hủy khi còn chờ thanh toán
-- ---------------------------------------------------------------------
INSERT INTO insurance_policies
    (policy_id, certificate_code, vehicle_id, product_id, buyer_id, start_date, end_date,
     premium, liability_limit, includes_theft, status, created_at, cancelled_at) OVERRIDING SYSTEM VALUE VALUES
(1,  'BH-0000000001', 1, 1,  5,  '2026-03-01', '2027-02-28', 70000,   150000000, FALSE, 'active',          '2026-02-27 10:00:00+07', NULL),
(2,  'BH-0000000002', 2, 2,  6,  '2026-01-15', '2027-01-14', 250000,  150000000, TRUE,  'active',          '2026-01-13 09:00:00+07', NULL),
(3,  'BH-0000000003', 3, 7,  7,  '2026-04-10', '2027-04-09', 65000,   150000000, FALSE, 'active',          '2026-04-08 09:00:00+07', NULL),
(4,  'BH-0000000004', 4, 8,  8,  '2026-06-01', '2027-05-31', 180000,  150000000, FALSE, 'active',          '2026-05-29 09:00:00+07', NULL),
(5,  'BH-0000000005', 5, 4,  9,  '2025-12-01', '2026-11-30', 1800000, 150000000, TRUE,  'active',          '2025-11-28 09:00:00+07', NULL),
(6,  'BH-0000000006', 6, 6,  10, '2026-02-20', '2027-02-19', 500000,  150000000, FALSE, 'active',          '2026-02-18 09:00:00+07', NULL),
(7,  'BH-0000000007', 7, 5,  11, '2026-05-12', '2027-05-11', 520000,  150000000, FALSE, 'active',          '2026-05-10 09:00:00+07', NULL),
(8,  'BH-0000000008', 8, 9,  13, '2025-11-18', '2026-11-17', 1100000, 150000000, FALSE, 'active',          '2025-11-16 09:00:00+07', NULL),
(9,  'BH-0000000009', 9, 10, 14, '2025-08-02', '2026-08-01', 3000000, 150000000, FALSE, 'active',          '2025-07-31 09:00:00+07', NULL),
(10, NULL,            5, 4,  9,  '2026-12-01', '2027-11-30', 1800000, 150000000, TRUE,  'pending_payment', '2026-11-05 20:00:00+07', NULL),
(11, NULL,            3, 7,  7,  '2026-03-20', '2027-03-19', 65000,   150000000, FALSE, 'cancelled',       '2026-03-22 10:00:00+07', '2026-03-25 09:00:00+07');

-- ---------------------------------------------------------------------
-- 14. policy_payments (mỗi hợp đồng Hiệu lực có đúng một giao dịch thành công = phí)
-- ---------------------------------------------------------------------
INSERT INTO policy_payments (policy_payment_id, policy_id, paid_by, amount, status, gateway_ref, created_at, paid_at) OVERRIDING SYSTEM VALUE VALUES
(1,  1,  5,  70000,   'success', 'PAY20260227001', '2026-02-27 10:00:00+07', '2026-02-27 10:02:00+07'),
(2,  2,  6,  250000,  'failed',  'PAY20260113001', '2026-01-13 09:00:00+07', NULL),
(3,  2,  6,  250000,  'success', 'PAY20260113002', '2026-01-13 09:05:00+07', '2026-01-13 09:06:00+07'),
(4,  3,  7,  65000,   'success', 'PAY20260408001', '2026-04-08 09:00:00+07', '2026-04-08 09:02:00+07'),
(5,  4,  8,  180000,  'success', 'PAY20260529001', '2026-05-29 09:00:00+07', '2026-05-29 09:02:00+07'),
(6,  5,  9,  1800000, 'success', 'PAY20251128001', '2025-11-28 09:00:00+07', '2025-11-28 09:03:00+07'),
(7,  6,  10, 500000,  'success', 'PAY20260218001', '2026-02-18 09:00:00+07', '2026-02-18 09:02:00+07'),
(8,  7,  11, 520000,  'success', 'PAY20260510001', '2026-05-10 09:00:00+07', '2026-05-10 09:02:00+07'),
(9,  8,  13, 1100000, 'success', 'PAY20251116001', '2025-11-16 09:00:00+07', '2025-11-16 09:03:00+07'),
(10, 9,  14, 3000000, 'success', 'PAY20250731001', '2025-07-31 09:00:00+07', '2025-07-31 09:03:00+07'),
(11, 10, 9,  1800000, 'failed',  'PAY20261105001', '2026-11-05 20:00:00+07', NULL),
(12, 11, 7,  65000,   'failed',  'PAY20260322001', '2026-03-22 10:00:00+07', NULL);

-- ---------------------------------------------------------------------
-- 15. insurance_claims
-- Mỗi hợp đồng tối đa một yêu cầu mất cắp đang mở (yêu cầu 9). Đủ các trạng thái:
-- pending_review (2, 9), needs_more_info (5), approved (4, 10), paid (1, 6, 8),
-- rejected (3), cancelled (7).
-- ---------------------------------------------------------------------
INSERT INTO insurance_claims
    (claim_id, policy_id, claim_type, claimant_id, event_time, event_location, description,
     requested_amount, approved_amount, status, reviewer_id, review_note, cancel_reason, paid_at) OVERRIDING SYSTEM VALUE VALUES
(1,  1, 'accident', 5,  '2026-06-14 17:30:00+07', 'Ngã tư Bảy Hiền, Tân Bình',                 'Va chạm với ô tô, hư hỏng đầu xe',             8000000,   6500000,  'paid',            15, NULL, NULL, '2026-07-05 10:00:00+07'),
(2,  1, 'accident', 5,  '2026-09-02 08:15:00+07', 'Đường Cách Mạng Tháng Tám, Quận 3',         'Va chạm nhẹ với xe máy khác',                   5000000,   NULL,     'pending_review',  NULL, NULL, NULL, NULL),
(3,  3, 'accident', 7,  '2026-08-20 19:00:00+07', 'Đường Nguyễn Thị Minh Khai, Quận 1',        'Xe tự ngã khi trời mưa',                        4200000,   NULL,     'rejected',        16, 'Sự kiện nằm ngoài phạm vi bảo hiểm', NULL, NULL),
(4,  6, 'accident', 10, '2026-07-30 14:20:00+07', 'Quốc lộ 1, Gò Vấp',                         'Va chạm liên hoàn, hư hỏng cản sau',            20000000,  18000000, 'approved',        15, NULL, NULL, NULL),
(5,  7, 'accident', 11, '2026-10-10 06:45:00+07', 'Cầu Sài Gòn, Thành phố Thủ Đức',            'Va chạm với xe tải',                            12000000,  NULL,     'needs_more_info', 15, 'Thiếu biên bản xác nhận của cơ quan chức năng', NULL, NULL),
(6,  9, 'accident', 14, '2026-06-05 23:10:00+07', 'Quốc lộ 22, Quận 12',                       'Va chạm với dải phân cách',                     30000000,  25000000, 'paid',            16, NULL, NULL, '2026-06-30 11:00:00+07'),
(7,  8, 'accident', 13, '2026-05-14 12:30:00+07', 'Đường Mai Chí Thọ, Thành phố Thủ Đức',      'Trầy xước do va quẹt',                          10000000,  NULL,     'cancelled',       NULL, NULL, 'Chủ xe rút yêu cầu', NULL),
(8,  2, 'theft',    6,  '2026-10-05 22:00:00+07', 'Bãi gửi xe đường Võ Văn Tần, Quận 3',       'Mất xe tại bãi gửi, đã trình báo cơ quan công an', 30000000, 28000000, 'paid',           15, NULL, NULL, '2026-10-28 09:00:00+07'),
(9,  5, 'theft',    9,  '2026-10-30 23:00:00+07', 'Hầm để xe chung cư, Bình Thạnh',            'Mất xe tại hầm để xe',                          140000000, NULL,     'pending_review',  NULL, NULL, NULL, NULL),
(10, 4, 'accident', 8,  '2026-09-12 18:40:00+07', 'Đường Võ Văn Kiệt, Quận 5',                 'Va chạm với xe máy cùng chiều',                 7500000,   7500000,  'approved',        16, NULL, NULL, NULL);

-- ---------------------------------------------------------------------
-- 16. vehicle_status_history
-- ---------------------------------------------------------------------
INSERT INTO vehicle_status_history
    (history_id, vehicle_id, event_type, old_status, new_status, reason, actor_id, request_id, claim_id, changed_at) OVERRIDING SYSTEM VALUE VALUES
(1,  1, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        1,  1,    NULL, '2021-04-20 09:00:00+07'),
(2,  2, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        1,  2,    NULL, '2022-07-11 09:00:00+07'),
(3,  3, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        2,  NULL, NULL, '2020-09-01 09:00:00+07'),
(4,  3, 'ownership_transferred', 'normal', 'normal', 'Sang tên từ Quách Thị Lệ sang Cao Thế Vinh',        2,  3,    NULL, '2023-02-15 09:00:00+07'),
(5,  4, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        2,  NULL, NULL, '2023-09-05 09:00:00+07'),
(6,  5, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        1,  NULL, NULL, '2021-12-01 09:00:00+07'),
(7,  6, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        2,  NULL, NULL, '2019-10-14 09:00:00+07'),
(8,  7, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        1,  NULL, NULL, '2022-05-30 09:00:00+07'),
(9,  8, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        2,  4,    NULL, '2022-11-18 09:00:00+07'),
(10, 9, 'registered',            NULL,     'normal', 'Đăng ký mới',                                        1,  NULL, NULL, '2019-08-02 09:00:00+07'),
(11, 2, 'reported_stolen',       'normal', 'stolen', 'Duyệt bồi thường mất cắp',                          15, NULL, 8,    '2026-10-20 10:00:00+07');

-- ---------------------------------------------------------------------
-- Đồng bộ lại sequence IDENTITY (đã insert id thủ công) để INSERT sau không trùng khóa
-- ---------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('roles',                  'role_id'),           (SELECT MAX(role_id) FROM roles));
SELECT setval(pg_get_serial_sequence('insurers',               'insurer_id'),        (SELECT MAX(insurer_id) FROM insurers));
SELECT setval(pg_get_serial_sequence('users',                  'user_id'),           (SELECT MAX(user_id) FROM users));
SELECT setval(pg_get_serial_sequence('vehicle_types',          'vehicle_type_id'),   (SELECT MAX(vehicle_type_id) FROM vehicle_types));
SELECT setval(pg_get_serial_sequence('violation_types',        'violation_type_id'), (SELECT MAX(violation_type_id) FROM violation_types));
SELECT setval(pg_get_serial_sequence('cameras',                'camera_id'),         (SELECT MAX(camera_id) FROM cameras));
SELECT setval(pg_get_serial_sequence('vehicles',               'vehicle_id'),        (SELECT MAX(vehicle_id) FROM vehicles));
SELECT setval(pg_get_serial_sequence('ownership_history',      'ownership_id'),      (SELECT MAX(ownership_id) FROM ownership_history));
SELECT setval(pg_get_serial_sequence('registration_requests',  'request_id'),        (SELECT MAX(request_id) FROM registration_requests));
SELECT setval(pg_get_serial_sequence('violations',             'violation_id'),      (SELECT MAX(violation_id) FROM violations));
SELECT setval(pg_get_serial_sequence('payments',               'payment_id'),        (SELECT MAX(payment_id) FROM payments));
SELECT setval(pg_get_serial_sequence('insurance_products',     'product_id'),        (SELECT MAX(product_id) FROM insurance_products));
SELECT setval(pg_get_serial_sequence('insurance_policies',     'policy_id'),         (SELECT MAX(policy_id) FROM insurance_policies));
SELECT setval(pg_get_serial_sequence('policy_payments',        'policy_payment_id'), (SELECT MAX(policy_payment_id) FROM policy_payments));
SELECT setval(pg_get_serial_sequence('insurance_claims',       'claim_id'),          (SELECT MAX(claim_id) FROM insurance_claims));
SELECT setval(pg_get_serial_sequence('vehicle_status_history', 'history_id'),        (SELECT MAX(history_id) FROM vehicle_status_history));

-- ---------------------------------------------------------------------
-- Kiểm tra lại các quy tắc liên bảng (thay cho trigger đã tạm tắt).
-- Có lỗi => RAISE EXCEPTION => toàn bộ file bị ROLLBACK.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    n INT;
BEGIN
    SELECT count(*) INTO n FROM violations v
    WHERE v.vehicle_id IS NOT NULL AND v.liable_owner_id IS NOT NULL
      AND fn_owner_at(v.vehicle_id, v.occurred_at) IS DISTINCT FROM v.liable_owner_id;
    IF n > 0 THEN
        RAISE EXCEPTION 'Seed lỗi: % vi phạm có người chịu phạt không phải chủ xe tại thời điểm vi phạm', n;
    END IF;

    SELECT count(*) INTO n FROM violations v JOIN violation_types t USING (violation_type_id)
    WHERE v.fine_amount IS NOT NULL AND (v.fine_amount < t.min_fine OR v.fine_amount > t.max_fine);
    IF n > 0 THEN
        RAISE EXCEPTION 'Seed lỗi: % vi phạm có mức phạt ngoài khung danh mục lỗi', n;
    END IF;

    SELECT count(*) INTO n FROM violations v
    WHERE v.status = 'paid'
      AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.violation_id = v.violation_id AND p.status = 'success');
    IF n > 0 THEN
        RAISE EXCEPTION 'Seed lỗi: % vi phạm Đã nộp phạt nhưng chưa có giao dịch thành công', n;
    END IF;

    SELECT count(*) INTO n FROM payments p JOIN violations v ON v.violation_id = p.violation_id
    WHERE p.fine_amount <> v.fine_amount;
    IF n > 0 THEN
        RAISE EXCEPTION 'Seed lỗi: % giao dịch nộp phạt có số tiền không khớp quyết định xử phạt', n;
    END IF;

    SELECT count(*) INTO n
    FROM insurance_policies po
    JOIN insurance_products pr ON pr.product_id = po.product_id
    JOIN vehicles ve ON ve.vehicle_id = po.vehicle_id
    WHERE pr.vehicle_type_id <> ve.vehicle_type_id
       OR po.premium <> pr.premium
       OR po.liability_limit <> pr.liability_limit
       OR po.includes_theft <> pr.includes_theft
       OR po.end_date <> (po.start_date + make_interval(months => pr.term_months))::date - 1
       OR fn_owner_at(po.vehicle_id, po.created_at) IS DISTINCT FROM po.buyer_id;
    IF n > 0 THEN
        RAISE EXCEPTION 'Seed lỗi: % hợp đồng bảo hiểm không khớp gói, loại xe, ngày kết thúc hoặc người mua', n;
    END IF;

    SELECT count(*) INTO n FROM insurance_policies po
    WHERE po.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM policy_payments pp
                      WHERE pp.policy_id = po.policy_id AND pp.status = 'success' AND pp.amount = po.premium);
    IF n > 0 THEN
        RAISE EXCEPTION 'Seed lỗi: % hợp đồng Hiệu lực chưa có giao dịch phí thành công đúng số tiền', n;
    END IF;

    SELECT count(*) INTO n
    FROM insurance_claims c
    JOIN insurance_policies po ON po.policy_id = c.policy_id
    JOIN insurance_products pr ON pr.product_id = po.product_id
    WHERE (c.event_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date NOT BETWEEN po.start_date AND po.end_date
       OR fn_owner_at(po.vehicle_id, c.event_time) IS DISTINCT FROM c.claimant_id
       OR (c.claim_type = 'theft' AND NOT po.includes_theft)
       OR (c.reviewer_id IS NOT NULL
           AND (SELECT u.insurer_id FROM users u WHERE u.user_id = c.reviewer_id) IS DISTINCT FROM pr.insurer_id);
    IF n > 0 THEN
        RAISE EXCEPTION 'Seed lỗi: % yêu cầu bồi thường vi phạm điều kiện hiệu lực, chủ xe hoặc công ty thẩm định', n;
    END IF;

    SELECT count(*) INTO n FROM (
        SELECT po.policy_id
        FROM insurance_policies po JOIN insurance_claims c ON c.policy_id = po.policy_id
        WHERE c.status IN ('approved', 'paid')
        GROUP BY po.policy_id, po.liability_limit
        HAVING sum(c.approved_amount) > po.liability_limit
    ) x;
    IF n > 0 THEN
        RAISE EXCEPTION 'Seed lỗi: % hợp đồng có tổng bồi thường vượt hạn mức', n;
    END IF;
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
