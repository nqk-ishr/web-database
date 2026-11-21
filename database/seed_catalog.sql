-- =====================================================================
-- seed_catalog.sql — dữ liệu danh mục mẫu (chạy SAU schema.sql)
-- Toàn bộ số liệu là GIẢ LẬP để demo; mức phạt, phí và hạn mức cần đối chiếu
-- quy định hiện hành khi nhập dữ liệu thật.
-- Chưa có dữ liệu users/vehicles: tạo bằng script sinh dữ liệu của nhóm
-- (mật khẩu phải băm ở backend nên không đặt sẵn ở đây).
-- =====================================================================

BEGIN;

INSERT INTO roles (code, name) VALUES
    ('owner',             'Chủ phương tiện'),
    ('registrar',         'Cán bộ đăng ký phương tiện'),
    ('violation_officer', 'Cán bộ xử lý vi phạm'),
    ('insurance_staff',   'Nhân viên bảo hiểm'),
    ('admin',             'Quản trị hệ thống');

INSERT INTO insurers (code, name, hotline) VALUES
    ('DEMO_A', 'Công ty Bảo hiểm Demo A', '1900000001'),
    ('DEMO_B', 'Công ty Bảo hiểm Demo B', '1900000002');

INSERT INTO vehicle_types (name, usage_purpose) VALUES
    ('Xe máy',      'cá nhân'),
    ('Ô tô con',    'cá nhân'),
    ('Ô tô con',    'kinh doanh vận tải'),
    ('Ô tô tải',    'kinh doanh vận tải');

INSERT INTO violation_types (code, description, min_fine, max_fine) VALUES
    ('SPEEDING',               'Chạy quá tốc độ quy định',          800000, 1200000),
    ('RED_LIGHT',              'Không chấp hành tín hiệu đèn giao thông', 800000, 1000000),
    ('WRONG_LANE',             'Đi sai làn đường',                  400000,  600000),
    ('NO_COMPULSORY_INSURANCE','Không có bảo hiểm bắt buộc còn hiệu lực', 200000, 600000);

INSERT INTO cameras (code, location_name) VALUES
    ('CAM-001', 'Nút giao Demo 1'),
    ('CAM-002', 'Nút giao Demo 2'),
    ('CAM-003', 'Đại lộ Demo - km 5');

-- Gói bảo hiểm: công ty A bán cho xe máy và ô tô con cá nhân (cơ bản và mở rộng có mất cắp),
-- công ty B chỉ bán gói cơ bản cho xe máy.
INSERT INTO insurance_products (insurer_id, vehicle_type_id, name, premium, term_months, liability_limit, includes_theft)
SELECT i.insurer_id, vt.vehicle_type_id, p.pname, p.premium, 12, p.lim, p.theft
FROM insurers i
JOIN vehicle_types vt ON vt.name = 'Xe máy' AND vt.usage_purpose = 'cá nhân'
CROSS JOIN (VALUES
    ('Cơ bản',               70000, 150000000, FALSE),
    ('Mở rộng (có mất cắp)', 250000, 150000000, TRUE)
) AS p(pname, premium, lim, theft)
WHERE i.code = 'DEMO_A';

INSERT INTO insurance_products (insurer_id, vehicle_type_id, name, premium, term_months, liability_limit, includes_theft)
SELECT i.insurer_id, vt.vehicle_type_id, p.pname, p.premium, 12, p.lim, p.theft
FROM insurers i
JOIN vehicle_types vt ON vt.name = 'Ô tô con' AND vt.usage_purpose = 'cá nhân'
CROSS JOIN (VALUES
    ('Cơ bản',               480000, 150000000, FALSE),
    ('Mở rộng (có mất cắp)', 1800000, 150000000, TRUE)
) AS p(pname, premium, lim, theft)
WHERE i.code = 'DEMO_A';

INSERT INTO insurance_products (insurer_id, vehicle_type_id, name, premium, term_months, liability_limit, includes_theft)
SELECT i.insurer_id, vt.vehicle_type_id, 'Cơ bản', 65000, 12, 150000000, FALSE
FROM insurers i
JOIN vehicle_types vt ON vt.name = 'Xe máy' AND vt.usage_purpose = 'cá nhân'
WHERE i.code = 'DEMO_B';

COMMIT;