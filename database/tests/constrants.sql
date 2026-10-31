--- TẠO DỮ LIỆU NỀN
INSERT INTO users (role, officer_type, username, password_hash, full_name, email)
VALUES ('officer', 'registration', 'can_bo_dk', 'x', 'Cán bộ ĐK', 'cb@test.vn'),
       ('owner',   NULL,           'chu_xe_1',  'x', 'Chủ xe 1',   'cx1@test.vn');

INSERT INTO vehicle_types (code, name, usage, max_service_years, inspection_cycle_months)
VALUES ('CAR_PERSONAL', 'Ô tô cá nhân', 'personal', NULL, 12);

INSERT INTO vehicle_models (brand, name) VALUES ('Toyota', 'Vios');

INSERT INTO owners (user_id, full_name, identity_no)
VALUES (2, 'Chủ xe 1', '001200000001'),
       (NULL, 'Chủ xe 2', '001200000002');

INSERT INTO vehicles (model_id, vehicle_type_id, chassis_no, engine_no, manufacture_year)
VALUES (1, 1, 'CHASSIS1', 'ENGINE1', 2020),
       (1, 1, 'CHASSIS2', 'ENGINE2', 2021);

--- THÀNH CÔNG
INSERT INTO registrations (vehicle_id, owner_id, registered_by, plate_number, valid_from)
VALUES (1, 1, 1, '30A-111.11', '2024-01-01');

--- LỖI
-- (a) Xe 1 có thêm đăng ký active thứ hai -> vi phạm unique partial index
INSERT INTO registrations (vehicle_id, owner_id, registered_by, plate_number, valid_from)
VALUES (1, 2, 1, '30A-222.22', '2024-06-01');

-- (b) Trùng biển số với đăng ký active khác
INSERT INTO registrations (vehicle_id, owner_id, registered_by, plate_number, valid_from)
VALUES (2, 2, 1, '30A-111.11', '2024-01-01');

-- (c) valid_to <= valid_from
INSERT INTO registrations (vehicle_id, owner_id, registered_by, plate_number, valid_from, valid_to, status)
VALUES (2, 2, 1, '30A-333.33', '2024-05-01', '2024-04-01', 'closed');

-- (d) status = 'active' nhưng có valid_to
INSERT INTO registrations (vehicle_id, owner_id, registered_by, plate_number, valid_from, valid_to, status)
VALUES (2, 2, 1, '30A-444.44', '2024-01-01', '2024-12-31', 'active');

-- (e) Chồng lấn thời gian sở hữu (đăng ký closed trùng khoảng với đăng ký của xe 1)
INSERT INTO registrations (vehicle_id, owner_id, registered_by, plate_number, valid_from, valid_to, status)
VALUES (1, 2, 1, '30A-555.55', '2024-03-01', '2024-09-01', 'closed');

-- (f) Cán bộ không có officer_type
INSERT INTO users (role, officer_type, username, password_hash, full_name, email)
VALUES ('officer', NULL, 'loi1', 'x', 'Lỗi', 'loi1@test.vn');

-- (g) Chủ xe lại có officer_type
INSERT INTO users (role, officer_type, username, password_hash, full_name, email)
VALUES ('owner', 'violation', 'loi2', 'x', 'Lỗi', 'loi2@test.vn');

-- (h) Đăng kiểm "đạt" nhưng không có ngày hết hạn
INSERT INTO inspections (vehicle_id, inspector_id, result, inspected_at)
VALUES (1, 1, 'passed', '2024-01-01');

-- (i) Đăng kiểm "không đạt" nhưng lại có ngày hết hạn
INSERT INTO inspections (vehicle_id, inspector_id, result, inspected_at, expires_at)
VALUES (1, 1, 'failed', '2024-01-01', '2025-01-01');

-- (j) Năm sản xuất ngoài khoảng
INSERT INTO vehicles (model_id, vehicle_type_id, chassis_no, engine_no, manufacture_year)
VALUES (1, 1, 'CHASSIS3', 'ENGINE3', 1900);

--- LỖI 2
INSERT INTO violation_types (code, name, detection, min_fine, max_fine)
VALUES ('RED_LIGHT', 'Vượt đèn đỏ', 'camera', 800000, 1000000);

INSERT INTO cameras (code, location_name, route, district)
VALUES ('CAM01', 'Ngã tư A', 'Đường B', 'Quận C');

INSERT INTO violations (source, camera_id, violation_type_id, vehicle_id, registration_id,
                        plate_detected, occurred_at, fine_amount)
VALUES ('camera', 1, 1, 1, 1, '30A-111.11', '2024-02-01 10:00', 900000);

-- lần 1: phải thành công
INSERT INTO payments (violation_id, paid_by, amount, method)
VALUES (1, 1, 900000, 'online_qr');

-- lần 2: phải LỖI (uq_payments_one_success_per_violation)
INSERT INTO payments (violation_id, paid_by, amount, method)
VALUES (1, 1, 900000, 'online_qr');