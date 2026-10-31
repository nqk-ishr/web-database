-- ============================================================
-- seed.sql - Dữ liệu giả lập nhỏ cho schema.sql (PostgreSQL)
-- Chạy sau schema.sql:  psql -U <user> -d <db> -f seed.sql
-- Dùng id cố định để các khóa ngoại dễ đọc; cuối file có setval
-- để sequence của identity tiếp tục đúng.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- NHÓM 1: NGƯỜI DÙNG VÀ DANH MỤC
-- ------------------------------------------------------------
INSERT INTO users (id, role, officer_type, username, password_hash, full_name, email, phone) VALUES
(1, 'officer', 'registration', 'cb_dangky',  'hash_demo', 'Nguyễn Văn An',  'an.cb@demo.vn',    '0901000001'),
(2, 'officer', 'violation',    'cb_vipham',  'hash_demo', 'Trần Thị Bình',  'binh.cb@demo.vn',  '0901000002'),
(3, 'owner',   NULL,           'chu_xe_1',   'hash_demo', 'Lê Minh Cường',  'cuong@demo.vn',    '0902000003'),
(4, 'owner',   NULL,           'chu_xe_2',   'hash_demo', 'Phạm Thu Dung',  'dung@demo.vn',     '0902000004'),
(5, 'owner',   NULL,           'chu_xe_3',   'hash_demo', 'Hoàng Gia Huy',  'huy@demo.vn',      '0902000005');

INSERT INTO vehicle_types (id, code, name, usage, max_service_years, inspection_cycle_months, description) VALUES
(1, 'CAR_PERSONAL', 'Ô tô cá nhân',        'personal',   NULL, 12, 'Ô tô dưới 9 chỗ không kinh doanh'),
(2, 'CAR_TAXI',     'Ô tô taxi',           'commercial', 8,    6,  'Ô tô kinh doanh vận tải hành khách'),
(3, 'MOTORBIKE',    'Xe máy',              'personal',   NULL, 24, 'Xe mô tô, xe gắn máy');

INSERT INTO vehicle_models (id, brand, name) VALUES
(1, 'Toyota',  'Vios'),
(2, 'Honda',   'City'),
(3, 'Hyundai', 'Accent'),
(4, 'Honda',   'Wave Alpha');

INSERT INTO violation_types (id, code, name, detection, min_fine, max_fine, points, description) VALUES
(1, 'RED_LIGHT',     'Vượt đèn đỏ',                    'camera',  800000, 1000000, 2, 'Ô tô đi qua vạch dừng khi đèn đỏ'),
(2, 'SPEEDING',      'Quá tốc độ từ 5 đến dưới 10 km/h', 'camera', 600000,  800000, 0, 'Phát hiện bằng camera đo tốc độ'),
(3, 'NO_HELMET',     'Không đội mũ bảo hiểm',          'on_site', 400000,  600000, 0, 'Người điều khiển xe máy'),
(4, 'WRONG_PARKING', 'Dừng đỗ sai quy định',           'on_site', 400000,  600000, 0, 'Dừng đỗ nơi có biển cấm');

INSERT INTO cameras (id, code, location_name, route, district, latitude, longitude, is_active) VALUES
(1, 'CAM01', 'Ngã tư Xã Đàn - Đặng Văn Ngữ', 'Đường Xã Đàn',     'Đống Đa',    21.012300, 105.832100, TRUE),
(2, 'CAM02', 'Nút giao Nguyễn Trãi - Khuất Duy Tiến', 'Đường Nguyễn Trãi', 'Thanh Xuân', 20.995800, 105.806400, TRUE),
(3, 'CAM03', 'Cầu Chương Dương',              'Đường Trần Nhân Tông', 'Hoàn Kiếm', NULL, NULL, FALSE);

-- ------------------------------------------------------------
-- NHÓM 2: PHƯƠNG TIỆN VÀ CHỦ SỞ HỮU
-- ------------------------------------------------------------
INSERT INTO owners (id, user_id, kind, full_name, identity_no, date_of_birth, phone, email, address) VALUES
(1, 3,    'individual',   'Lê Minh Cường',          '001200000001', '1990-05-12', '0902000003', 'cuong@demo.vn', '12 Xã Đàn, Đống Đa, Hà Nội'),
(2, 4,    'individual',   'Phạm Thu Dung',          '001200000002', '1992-09-30', '0902000004', 'dung@demo.vn',  '45 Nguyễn Trãi, Thanh Xuân, Hà Nội'),
(3, NULL, 'organization', 'Công ty Taxi Thăng Long','0101234567',   NULL,         '0243000000', 'taxi@demo.vn',  '1 Láng Hạ, Ba Đình, Hà Nội'),
(4, 5,    'individual',   'Hoàng Gia Huy',          '001200000004', '1998-01-20', '0902000005', 'huy@demo.vn',   '8 Bạch Mai, Hai Bà Trưng, Hà Nội');

INSERT INTO vehicles (id, model_id, vehicle_type_id, chassis_no, engine_no, color, manufacture_year) VALUES
(1, 1, 1, 'CHASSIS0001', 'ENGINE0001', 'Trắng', 2020),
(2, 2, 1, 'CHASSIS0002', 'ENGINE0002', 'Đen',   2021),
(3, 3, 2, 'CHASSIS0003', 'ENGINE0003', 'Vàng',  2019),
(4, 4, 3, 'CHASSIS0004', 'ENGINE0004', 'Đỏ',    2018),
(5, 1, 1, 'CHASSIS0005', 'ENGINE0005', 'Bạc',   2022),
(6, 2, 1, 'CHASSIS0006', 'ENGINE0006', 'Xanh',  2023);

-- Xe 5: đổi chủ (đăng ký cũ closed, đăng ký mới active, không chồng lấn).
-- Xe 6: đăng ký đã bị thu hồi, hiện không có đăng ký active.
INSERT INTO registrations (id, vehicle_id, owner_id, registered_by, plate_number, valid_from, valid_to, status) VALUES
(1, 1, 1, 1, '30A-111.11',  '2024-01-01', NULL,         'active'),
(2, 2, 2, 1, '30A-222.22',  '2024-02-01', NULL,         'active'),
(3, 3, 3, 1, '30E-333.33',  '2024-01-15', NULL,         'active'),
(4, 4, 4, 1, '29B1-444.44', '2024-03-01', NULL,         'active'),
(5, 5, 1, 1, '30A-555.55',  '2022-06-01', '2023-12-31', 'closed'),
(6, 5, 2, 1, '30A-666.66',  '2023-12-31', NULL,         'active'),
(7, 6, 4, 1, '30A-777.77',  '2023-03-01', '2023-09-01', 'revoked');

-- ------------------------------------------------------------
-- NHÓM 3: ĐĂNG KIỂM
-- ------------------------------------------------------------
INSERT INTO inspections (id, vehicle_id, inspector_id, result, certificate_no, inspected_at, expires_at, notes) VALUES
(1, 1, 1, 'passed', 'KD-0001', '2024-01-10', '2025-01-10', NULL),
(2, 2, 1, 'failed', NULL,      '2024-03-01', NULL,         'Khí thải vượt mức cho phép'),
(3, 2, 1, 'passed', 'KD-0002', '2024-03-08', '2025-03-08', 'Đạt sau khi khắc phục'),
(4, 3, 1, 'passed', 'KD-0003', '2024-05-01', '2024-11-01', NULL),
(5, 4, 1, 'passed', 'KD-0004', '2023-09-01', '2025-09-01', NULL);

-- ------------------------------------------------------------
-- NHÓM 4: VI PHẠM VÀ XỬ LÝ
-- ------------------------------------------------------------
INSERT INTO violations (id, source, camera_id, violation_type_id, vehicle_id, registration_id,
                        plate_detected, occurred_at, location_detail, fine_amount, status,
                        evidence_url, verified_by, verified_at, notified_at, due_date, created_at) VALUES
-- 1: camera, đã nộp online
(1, 'camera', 1, 1, 1, 1, '30A-111.11',  '2024-02-01 10:00', NULL, 900000, 'paid',
    'https://demo.vn/evidence/1.jpg', 2, '2024-02-02 09:00', '2024-02-03 08:00', '2024-03-15', '2024-02-01 10:05'),
-- 2: camera, đã thông báo, lần nộp online thất bại
(2, 'camera', 2, 2, 2, 2, '30A-222.22',  '2024-03-10 08:30', NULL, 700000, 'notified',
    'https://demo.vn/evidence/2.jpg', 2, '2024-03-11 09:00', '2024-03-12 08:00', '2024-04-25', '2024-03-10 08:35'),
-- 3: tại chỗ, đã thông báo, khiếu nại bị bác
(3, 'on_site', NULL, 3, 4, 4, '29B1-444.44', '2024-04-02 14:00', 'Trước số 20 Bạch Mai', 500000, 'notified',
    NULL, 2, '2024-04-02 15:00', '2024-04-03 08:00', '2024-05-20', '2024-04-02 14:10'),
-- 4: camera, đang khiếu nại
(4, 'camera', 1, 1, 3, 3, '30E-333.33',  '2024-04-15 18:20', NULL, 1000000, 'appealing',
    'https://demo.vn/evidence/4.jpg', 2, '2024-04-16 09:00', '2024-04-17 08:00', '2024-05-30', '2024-04-15 18:25'),
-- 5: camera, chưa nhận diện được xe, mới ghi nhận
(5, 'camera', 2, 2, NULL, NULL, '30A-999.99', '2024-05-05 07:45', NULL, 600000, 'new',
    'https://demo.vn/evidence/5.jpg', NULL, NULL, NULL, NULL, '2024-05-05 07:50'),
-- 6: tại chỗ, đã hủy do khiếu nại được chấp nhận
(6, 'on_site', NULL, 4, 1, 1, '30A-111.11', '2024-05-20 11:00', 'Đường Xã Đàn, biển cấm đỗ', 450000, 'cancelled',
    NULL, 2, '2024-05-20 12:00', '2024-05-21 08:00', '2024-06-30', '2024-05-20 11:10'),
-- 7: camera, đã nộp tiền mặt
(7, 'camera', 1, 1, 2, 2, '30A-222.22',  '2024-06-01 09:15', NULL, 850000, 'paid',
    'https://demo.vn/evidence/7.jpg', 2, '2024-06-02 09:00', '2024-06-03 08:00', '2024-07-15', '2024-06-01 09:20');

INSERT INTO payments (id, violation_id, paid_by, recorded_by, amount, method, status, transaction_ref, paid_at) VALUES
(1, 1, 1,    NULL, 900000, 'online_qr', 'success', 'TX0001', '2024-02-10 20:00'),
(2, 2, 2,    NULL, 700000, 'online_qr', 'failed',  'TX0002', '2024-03-20 21:00'),
(3, 7, NULL, 2,    850000, 'cash',      'success', NULL,     '2024-06-10 10:30');

INSERT INTO appeals (id, violation_id, owner_id, reason, status, resolved_by, resolution_note, created_at, resolved_at) VALUES
(1, 4, 3, 'Xe đang trong tình trạng nhường đường cho xe ưu tiên.', 'pending',  NULL, NULL,
    '2024-04-20 09:00', NULL),
(2, 6, 1, 'Biển cấm đỗ bị cây che khuất.',                         'accepted', 2,    'Đã kiểm tra hiện trường, hủy biên bản.',
    '2024-05-25 10:00', '2024-06-01 15:00'),
(3, 3, 4, 'Tôi không điều khiển xe tại thời điểm đó.',            'rejected', 2,    'Chưa có chứng cứ chứng minh.',
    '2024-04-10 09:00', '2024-04-18 16:00');

-- ------------------------------------------------------------
-- Đưa sequence identity về sau id lớn nhất đã chèn
-- ------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'id'),           (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('vehicle_types', 'id'),   (SELECT MAX(id) FROM vehicle_types));
SELECT setval(pg_get_serial_sequence('vehicle_models', 'id'),  (SELECT MAX(id) FROM vehicle_models));
SELECT setval(pg_get_serial_sequence('violation_types', 'id'), (SELECT MAX(id) FROM violation_types));
SELECT setval(pg_get_serial_sequence('cameras', 'id'),         (SELECT MAX(id) FROM cameras));
SELECT setval(pg_get_serial_sequence('owners', 'id'),          (SELECT MAX(id) FROM owners));
SELECT setval(pg_get_serial_sequence('vehicles', 'id'),        (SELECT MAX(id) FROM vehicles));
SELECT setval(pg_get_serial_sequence('registrations', 'id'),   (SELECT MAX(id) FROM registrations));
SELECT setval(pg_get_serial_sequence('inspections', 'id'),     (SELECT MAX(id) FROM inspections));
SELECT setval(pg_get_serial_sequence('violations', 'id'),      (SELECT MAX(id) FROM violations));
SELECT setval(pg_get_serial_sequence('payments', 'id'),        (SELECT MAX(id) FROM payments));
SELECT setval(pg_get_serial_sequence('appeals', 'id'),         (SELECT MAX(id) FROM appeals));

COMMIT;