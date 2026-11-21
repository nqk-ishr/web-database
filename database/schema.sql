-- =====================================================================
-- schema.sql
-- Hệ thống web quản lý phương tiện giao thông (PostgreSQL 12+)
-- 16 bảng: đăng ký/sang tên, vi phạm/nộp phạt, bảo hiểm TNDS.
--
-- Chạy:  psql -v ON_ERROR_STOP=1 -d <tên_db> -f schema.sql
-- Sau đó nạp danh mục mẫu:  psql -d <tên_db> -f seed_catalog.sql
--
-- Quy ước:
--  * Tên bảng/cột dùng snake_case (Roles -> roles, VehicleTypes -> vehicle_types...).
--  * Trạng thái là kiểu ENUM mã tiếng Anh; nhãn tiếng Việt ghi ở COMMENT ON TYPE.
--  * Ràng buộc liên bảng (CHECK không làm được) viết bằng trigger.
--  * Các thao tác duyệt nhiều bảng (transaction) do backend thực hiện; thứ tự
--    đã gợi ý ở cuối file.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;   -- cho EXCLUDE (vehicle_id WITH =, range WITH &&)

-- ---------------------------------------------------------------------
-- 1. KIỂU ENUM
-- ---------------------------------------------------------------------
CREATE TYPE vehicle_status   AS ENUM ('normal', 'stolen', 'revoked');
CREATE TYPE request_type     AS ENUM ('new_registration', 'transfer');
CREATE TYPE request_status   AS ENUM ('pending_confirmation', 'pending_approval', 'needs_more_info',
                                      'approved', 'rejected', 'cancelled');
CREATE TYPE violation_status AS ENUM ('recorded', 'verified', 'notified', 'paid', 'cancelled');
CREATE TYPE txn_status       AS ENUM ('success', 'failed');
CREATE TYPE policy_status    AS ENUM ('pending_payment', 'active', 'cancelled');
CREATE TYPE claim_type       AS ENUM ('accident', 'theft');
CREATE TYPE claim_status     AS ENUM ('pending_review', 'needs_more_info', 'approved',
                                      'rejected', 'paid', 'cancelled');
CREATE TYPE vehicle_event    AS ENUM ('registered', 'ownership_transferred', 'reported_stolen',
                                      'found', 'revoked');

COMMENT ON TYPE vehicle_status   IS 'normal=Bình thường, stolen=Báo mất, revoked=Đã thu hồi (cuối)';
COMMENT ON TYPE request_type     IS 'new_registration=Đăng ký mới, transfer=Sang tên';
COMMENT ON TYPE request_status   IS 'pending_confirmation=Chờ xác nhận (bên mua), pending_approval=Chờ duyệt, needs_more_info=Cần bổ sung, approved=Đã duyệt, rejected=Từ chối, cancelled=Đã hủy';
COMMENT ON TYPE violation_status IS 'recorded=Mới ghi nhận, verified=Đã xác minh, notified=Đã thông báo, paid=Đã nộp phạt, cancelled=Đã hủy. "Quá hạn" không lưu: suy ra từ due_date';
COMMENT ON TYPE txn_status       IS 'success=Thành công, failed=Thất bại';
COMMENT ON TYPE policy_status    IS 'pending_payment=Chờ thanh toán, active=Hiệu lực, cancelled=Đã hủy. "Hết hạn" không lưu: suy ra từ end_date';
COMMENT ON TYPE claim_type       IS 'accident=Tai nạn, theft=Mất cắp';
COMMENT ON TYPE claim_status     IS 'pending_review=Chờ thẩm định, needs_more_info=Cần bổ sung, approved=Đã duyệt, rejected=Từ chối, paid=Đã chi trả, cancelled=Đã hủy';
COMMENT ON TYPE vehicle_event    IS 'registered=Đăng ký mới, ownership_transferred=Sang tên, reported_stolen=Báo mất, found=Tìm thấy, revoked=Thu hồi';

-- ---------------------------------------------------------------------
-- 2. NGƯỜI DÙNG VÀ DANH MỤC
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    role_id   SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      VARCHAR(30)  NOT NULL UNIQUE,
    name      VARCHAR(100) NOT NULL
);

CREATE TABLE insurers (
    insurer_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       VARCHAR(30)  NOT NULL UNIQUE,
    name       VARCHAR(150) NOT NULL UNIQUE,
    hotline    VARCHAR(20),
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE users (
    user_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id       SMALLINT     NOT NULL REFERENCES roles(role_id),
    insurer_id    INT          REFERENCES insurers(insurer_id),   -- chỉ nhân viên bảo hiểm
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    citizen_id    VARCHAR(20)  UNIQUE,
    phone         VARCHAR(20),
    email         VARCHAR(150) UNIQUE,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_citizen_format CHECK (citizen_id IS NULL OR citizen_id ~ '^[0-9]{9,12}$')
);

CREATE TABLE vehicle_types (
    vehicle_type_id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    usage_purpose   VARCHAR(50)  NOT NULL,          -- công năng
    CONSTRAINT uq_vehicle_types UNIQUE (name, usage_purpose)
);

CREATE TABLE violation_types (
    violation_type_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(40)   NOT NULL UNIQUE,
    description VARCHAR(300)  NOT NULL,
    min_fine    NUMERIC(12,0) NOT NULL,
    max_fine    NUMERIC(12,0) NOT NULL,
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_violation_types_fine CHECK (min_fine >= 0 AND max_fine >= min_fine)
);

CREATE TABLE cameras (
    camera_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          VARCHAR(30)  NOT NULL UNIQUE,
    location_name VARCHAR(200) NOT NULL
);

-- ---------------------------------------------------------------------
-- 3. PHƯƠNG TIỆN VÀ CHỦ SỞ HỮU
-- ---------------------------------------------------------------------
CREATE TABLE vehicles (
    vehicle_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate_number      VARCHAR(15) NOT NULL UNIQUE,
    chassis_number    VARCHAR(30) NOT NULL UNIQUE,
    engine_number     VARCHAR(30) NOT NULL UNIQUE,
    manufacture_year  SMALLINT    NOT NULL,
    vehicle_type_id   SMALLINT    NOT NULL REFERENCES vehicle_types(vehicle_type_id),
    status            vehicle_status NOT NULL DEFAULT 'normal',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_vehicles_plate CHECK (plate_number = upper(btrim(plate_number)) AND plate_number <> ''),
    CONSTRAINT ck_vehicles_year  CHECK (manufacture_year BETWEEN 1950 AND 2100)
);

CREATE TABLE ownership_history (
    ownership_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id   BIGINT      NOT NULL REFERENCES vehicles(vehicle_id),
    owner_id     BIGINT      NOT NULL REFERENCES users(user_id),
    valid_from   TIMESTAMPTZ NOT NULL,
    valid_to     TIMESTAMPTZ,                         -- NULL = chủ hiện hành
    CONSTRAINT ck_ownership_range CHECK (valid_to IS NULL OR valid_to > valid_from),
    -- các khoảng sở hữu [valid_from, valid_to) của một xe không chồng lấn
    CONSTRAINT ex_ownership_no_overlap
        EXCLUDE USING gist (vehicle_id WITH =, tstzrange(valid_from, valid_to) WITH &&)
);
-- một xe chỉ có một chủ hiện hành
CREATE UNIQUE INDEX uq_ownership_one_current ON ownership_history (vehicle_id) WHERE valid_to IS NULL;

CREATE TABLE registration_requests (
    request_id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_type              request_type   NOT NULL,
    status                    request_status NOT NULL,
    vehicle_id                BIGINT   REFERENCES vehicles(vehicle_id),   -- sang tên: bắt buộc; đăng ký mới: gán khi duyệt
    requester_id              BIGINT   NOT NULL REFERENCES users(user_id), -- chủ xe gửi (bên bán nếu sang tên)
    buyer_id                  BIGINT   REFERENCES users(user_id),          -- chỉ sang tên
    declared_vehicle_type_id  SMALLINT REFERENCES vehicle_types(vehicle_type_id),   -- chỉ đăng ký mới
    declared_chassis_number   VARCHAR(30),
    declared_engine_number    VARCHAR(30),
    declared_manufacture_year SMALLINT,
    reviewer_id               BIGINT   REFERENCES users(user_id),
    review_note               VARCHAR(500),
    cancel_reason             VARCHAR(500),
    submitted_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_req_new_fields CHECK (
        request_type <> 'new_registration' OR (
            buyer_id IS NULL AND declared_vehicle_type_id IS NOT NULL
            AND declared_chassis_number IS NOT NULL AND declared_engine_number IS NOT NULL
            AND declared_manufacture_year IS NOT NULL)),
    CONSTRAINT ck_req_transfer_fields CHECK (
        request_type <> 'transfer' OR (
            vehicle_id IS NOT NULL AND buyer_id IS NOT NULL AND buyer_id <> requester_id
            AND declared_vehicle_type_id IS NULL AND declared_chassis_number IS NULL
            AND declared_engine_number IS NULL AND declared_manufacture_year IS NULL)),
    CONSTRAINT ck_req_confirm_only_transfer CHECK (request_type = 'transfer' OR status <> 'pending_confirmation'),
    CONSTRAINT ck_req_approved_new_has_vehicle CHECK (
        NOT (request_type = 'new_registration' AND status = 'approved') OR vehicle_id IS NOT NULL),
    CONSTRAINT ck_req_reviewer CHECK (status NOT IN ('approved', 'rejected') OR reviewer_id IS NOT NULL),
    CONSTRAINT ck_req_note CHECK (status NOT IN ('rejected', 'needs_more_info') OR review_note IS NOT NULL),
    CONSTRAINT ck_req_cancel_reason CHECK (status <> 'cancelled' OR cancel_reason IS NOT NULL)
);
-- mỗi xe tối đa một hồ sơ đang mở
CREATE UNIQUE INDEX uq_req_one_open_per_vehicle ON registration_requests (vehicle_id)
    WHERE vehicle_id IS NOT NULL AND status IN ('pending_confirmation', 'pending_approval', 'needs_more_info');
-- hai hồ sơ đăng ký mới đang mở không được cùng số khung / số máy
CREATE UNIQUE INDEX uq_req_open_new_chassis ON registration_requests (declared_chassis_number)
    WHERE request_type = 'new_registration' AND status IN ('pending_approval', 'needs_more_info');
CREATE UNIQUE INDEX uq_req_open_new_engine ON registration_requests (declared_engine_number)
    WHERE request_type = 'new_registration' AND status IN ('pending_approval', 'needs_more_info');

-- ---------------------------------------------------------------------
-- 4. VI PHẠM VÀ NỘP PHẠT
-- ---------------------------------------------------------------------
CREATE TABLE violations (
    violation_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id            BIGINT REFERENCES vehicles(vehicle_id),            -- NULL nếu biển số không khớp xe nào
    plate_number_captured VARCHAR(15) NOT NULL,                              -- biển số camera đọc được
    liable_owner_id       BIGINT REFERENCES users(user_id),                  -- chủ xe TẠI THỜI ĐIỂM vi phạm
    violation_type_id     INT    NOT NULL REFERENCES violation_types(violation_type_id),
    camera_id             INT    NOT NULL REFERENCES cameras(camera_id),
    occurred_at           TIMESTAMPTZ NOT NULL,
    status                violation_status NOT NULL DEFAULT 'recorded',
    fine_amount           NUMERIC(12,0),                                     -- chốt khi lập quyết định, không đổi theo danh mục
    decision_number       VARCHAR(40) UNIQUE,
    due_date              DATE,
    handled_by            BIGINT REFERENCES users(user_id),                  -- cán bộ xử lý vi phạm
    verified_at           TIMESTAMPTZ,
    notified_at           TIMESTAMPTZ,
    cancelled_reason      VARCHAR(500),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_vio_fine_nonneg CHECK (fine_amount IS NULL OR fine_amount >= 0),
    CONSTRAINT ck_vio_owner_needs_vehicle CHECK (liable_owner_id IS NULL OR vehicle_id IS NOT NULL),
    -- biển số không khớp xe nào thì chỉ được ở Mới ghi nhận hoặc Đã hủy (buộc cán bộ xử lý)
    CONSTRAINT ck_vio_vehicle_required CHECK (vehicle_id IS NOT NULL OR status IN ('recorded', 'cancelled')),
    CONSTRAINT ck_vio_owner_required CHECK (
        status NOT IN ('verified', 'notified', 'paid') OR liable_owner_id IS NOT NULL),
    CONSTRAINT ck_vio_notice_fields CHECK (
        status NOT IN ('notified', 'paid')
        OR (fine_amount IS NOT NULL AND decision_number IS NOT NULL AND due_date IS NOT NULL)),
    CONSTRAINT ck_vio_cancel_reason CHECK (status <> 'cancelled' OR cancelled_reason IS NOT NULL)
);

CREATE TABLE payments (
    payment_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    violation_id BIGINT NOT NULL REFERENCES violations(violation_id),
    paid_by      BIGINT NOT NULL REFERENCES users(user_id),
    fine_amount  NUMERIC(12,0) NOT NULL,
    late_fee     NUMERIC(12,0) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,0) GENERATED ALWAYS AS (fine_amount + late_fee) STORED,
    status       txn_status NOT NULL,
    gateway_ref  VARCHAR(64) NOT NULL UNIQUE,         -- mã giao dịch cổng mô phỏng
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at      TIMESTAMPTZ,
    CONSTRAINT ck_pay_amounts CHECK (fine_amount >= 0 AND late_fee >= 0),
    CONSTRAINT ck_pay_paid_at CHECK ((status = 'success') = (paid_at IS NOT NULL))
);
-- mỗi vi phạm tối đa một giao dịch thành công
CREATE UNIQUE INDEX uq_payment_one_success ON payments (violation_id) WHERE status = 'success';

-- ---------------------------------------------------------------------
-- 5. BẢO HIỂM
-- ---------------------------------------------------------------------
CREATE TABLE insurance_products (
    product_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    insurer_id      INT      NOT NULL REFERENCES insurers(insurer_id),
    vehicle_type_id SMALLINT NOT NULL REFERENCES vehicle_types(vehicle_type_id),
    name            VARCHAR(150)  NOT NULL,
    premium         NUMERIC(12,0) NOT NULL,
    term_months     SMALLINT      NOT NULL,
    liability_limit NUMERIC(14,0) NOT NULL,           -- hạn mức bồi thường tổng theo hợp đồng
    includes_theft  BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_products UNIQUE (insurer_id, vehicle_type_id, name),
    CONSTRAINT ck_products_values CHECK (premium > 0 AND liability_limit > 0 AND term_months BETWEEN 1 AND 36)
);

CREATE TABLE insurance_policies (
    policy_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    certificate_code VARCHAR(40) UNIQUE,              -- sinh khi hợp đồng có hiệu lực
    vehicle_id       BIGINT NOT NULL REFERENCES vehicles(vehicle_id),
    product_id       INT    NOT NULL REFERENCES insurance_products(product_id),
    buyer_id         BIGINT NOT NULL REFERENCES users(user_id),
    start_date       DATE   NOT NULL,
    end_date         DATE   NOT NULL,                  -- suy ra từ gói khi tạo (đã gồm cả ngày cuối)
    premium          NUMERIC(12,0) NOT NULL,           -- sao chép từ gói tại lúc mua
    liability_limit  NUMERIC(14,0) NOT NULL,           -- sao chép từ gói
    includes_theft   BOOLEAN       NOT NULL,           -- sao chép từ gói
    status           policy_status NOT NULL DEFAULT 'pending_payment',
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    cancelled_at     TIMESTAMPTZ,
    CONSTRAINT ck_policy_dates  CHECK (end_date > start_date),
    CONSTRAINT ck_policy_values CHECK (premium > 0 AND liability_limit > 0),
    CONSTRAINT ck_policy_active_cert CHECK (status <> 'active' OR certificate_code IS NOT NULL),
    CONSTRAINT ck_policy_cancelled CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
    -- các hợp đồng Hiệu lực của một xe không chồng khoảng ngày (gia hạn: bắt đầu liền sau ngày hết hạn)
    CONSTRAINT ex_policy_no_overlap
        EXCLUDE USING gist (vehicle_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
        WHERE (status = 'active')
);
-- mỗi xe tối đa một hợp đồng đang chờ thanh toán
CREATE UNIQUE INDEX uq_policy_one_pending ON insurance_policies (vehicle_id) WHERE status = 'pending_payment';

CREATE TABLE policy_payments (
    policy_payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    policy_id   BIGINT NOT NULL REFERENCES insurance_policies(policy_id),
    paid_by     BIGINT NOT NULL REFERENCES users(user_id),
    amount      NUMERIC(12,0) NOT NULL,
    status      txn_status NOT NULL,
    gateway_ref VARCHAR(64) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at     TIMESTAMPTZ,
    CONSTRAINT ck_polpay_amount  CHECK (amount > 0),
    CONSTRAINT ck_polpay_paid_at CHECK ((status = 'success') = (paid_at IS NOT NULL))
);
-- mỗi hợp đồng tối đa một giao dịch phí thành công
CREATE UNIQUE INDEX uq_policy_payment_one_success ON policy_payments (policy_id) WHERE status = 'success';

CREATE TABLE insurance_claims (
    claim_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    policy_id        BIGINT NOT NULL REFERENCES insurance_policies(policy_id),
    claim_type       claim_type   NOT NULL,
    claimant_id      BIGINT NOT NULL REFERENCES users(user_id),
    event_time       TIMESTAMPTZ  NOT NULL,
    event_location   VARCHAR(300) NOT NULL,
    description      VARCHAR(1000),
    requested_amount NUMERIC(14,0) NOT NULL,
    approved_amount  NUMERIC(14,0),
    status           claim_status NOT NULL DEFAULT 'pending_review',
    reviewer_id      BIGINT REFERENCES users(user_id),   -- nhân viên bảo hiểm
    review_note      VARCHAR(500),
    cancel_reason    VARCHAR(500),
    paid_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_claim_amounts CHECK (
        requested_amount > 0
        AND (approved_amount IS NULL OR (approved_amount >= 0 AND approved_amount <= requested_amount))),
    CONSTRAINT ck_claim_approved CHECK (
        status NOT IN ('approved', 'paid') OR (approved_amount IS NOT NULL AND reviewer_id IS NOT NULL)),
    CONSTRAINT ck_claim_reviewed CHECK (
        status NOT IN ('rejected', 'needs_more_info') OR (reviewer_id IS NOT NULL AND review_note IS NOT NULL)),
    CONSTRAINT ck_claim_paid CHECK ((status = 'paid') = (paid_at IS NOT NULL)),
    CONSTRAINT ck_claim_cancel_reason CHECK (status <> 'cancelled' OR cancel_reason IS NOT NULL)
);
-- mỗi hợp đồng tối đa một yêu cầu mất cắp đang mở (Đã duyệt chưa chi trả vẫn là đang mở)
CREATE UNIQUE INDEX uq_claim_one_open_theft ON insurance_claims (policy_id)
    WHERE claim_type = 'theft' AND status IN ('pending_review', 'needs_more_info', 'approved');

-- ---------------------------------------------------------------------
-- 6. LỊCH SỬ TRẠNG THÁI XE (tạo sau vì tham chiếu hồ sơ và yêu cầu bồi thường)
-- ---------------------------------------------------------------------
CREATE TABLE vehicle_status_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(vehicle_id),
    event_type vehicle_event NOT NULL,
    old_status vehicle_status,
    new_status vehicle_status NOT NULL,
    reason     VARCHAR(500),
    actor_id   BIGINT REFERENCES users(user_id),
    request_id BIGINT REFERENCES registration_requests(request_id),
    claim_id   BIGINT REFERENCES insurance_claims(claim_id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_vsh_event_shape CHECK (COALESCE(
        CASE event_type
            WHEN 'registered'            THEN old_status IS NULL     AND new_status = 'normal'
            WHEN 'ownership_transferred' THEN old_status = 'normal'  AND new_status = 'normal'
            WHEN 'reported_stolen'       THEN old_status = 'normal'  AND new_status = 'stolen'
            WHEN 'found'                 THEN old_status = 'stolen'  AND new_status = 'normal'
            WHEN 'revoked'               THEN old_status = 'stolen'  AND new_status = 'revoked'
        END, FALSE))
);

-- ---------------------------------------------------------------------
-- 7. CHỈ MỤC (khóa ngoại và truy vấn nghiệp vụ)
-- ---------------------------------------------------------------------
CREATE INDEX ix_users_role            ON users (role_id);
CREATE INDEX ix_users_insurer         ON users (insurer_id) WHERE insurer_id IS NOT NULL;
CREATE INDEX ix_vehicles_type         ON vehicles (vehicle_type_id);
CREATE INDEX ix_ownership_owner       ON ownership_history (owner_id, valid_to);
CREATE INDEX ix_req_status            ON registration_requests (status, submitted_at);
CREATE INDEX ix_req_requester         ON registration_requests (requester_id);
CREATE INDEX ix_req_buyer             ON registration_requests (buyer_id) WHERE buyer_id IS NOT NULL;
CREATE INDEX ix_vio_liable            ON violations (liable_owner_id, status);
CREATE INDEX ix_vio_type              ON violations (violation_type_id);
CREATE INDEX ix_vio_camera            ON violations (camera_id);
CREATE INDEX ix_vio_status_due        ON violations (status, due_date);
CREATE INDEX ix_pay_violation         ON payments (violation_id);
CREATE INDEX ix_products_insurer      ON insurance_products (insurer_id);
CREATE INDEX ix_products_vehicle_type ON insurance_products (vehicle_type_id);
CREATE INDEX ix_policies_vehicle_end  ON insurance_policies (vehicle_id, end_date);
CREATE INDEX ix_policies_active_end   ON insurance_policies (end_date) WHERE status = 'active';
CREATE INDEX ix_policy_pay_policy     ON policy_payments (policy_id);
CREATE INDEX ix_claims_policy_status  ON insurance_claims (policy_id, status);
CREATE INDEX ix_claims_status         ON insurance_claims (status);
CREATE INDEX ix_vsh_vehicle_time      ON vehicle_status_history (vehicle_id, changed_at DESC);

-- ---------------------------------------------------------------------
-- 8. HÀM DÙNG CHUNG
-- ---------------------------------------------------------------------
-- Ném lỗi quy tắc nghiệp vụ (SQLSTATE 23514) để backend bắt thống nhất.
CREATE FUNCTION fn_rule_fail(p_msg TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '%', p_msg USING ERRCODE = 'check_violation';
END $$;

-- Chủ xe tại một thời điểm, theo lịch sử sở hữu (khoảng [valid_from, valid_to)).
CREATE FUNCTION fn_owner_at(p_vehicle BIGINT, p_ts TIMESTAMPTZ) RETURNS BIGINT
LANGUAGE sql STABLE AS $$
    SELECT owner_id
    FROM ownership_history
    WHERE vehicle_id = p_vehicle AND valid_from <= p_ts AND (valid_to IS NULL OR p_ts < valid_to)
    LIMIT 1
$$;

CREATE FUNCTION fn_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

-- Kiểm tra đường chuyển trạng thái; TG_ARGV[0] là JSON {"trạng_thái_cũ": ["trạng_thái_mới", ...]}.
-- Trạng thái cuối không có khóa trong JSON nên không chuyển đi đâu được.
CREATE FUNCTION fn_enforce_status_transitions() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_allowed jsonb := TG_ARGV[0]::jsonb;
BEGIN
    IF NOT (COALESCE(v_allowed -> OLD.status::text, '[]'::jsonb) @> to_jsonb(NEW.status::text)) THEN
        PERFORM fn_rule_fail(format('Chuyển trạng thái không hợp lệ ở bảng %s: %s -> %s',
                                    TG_TABLE_NAME, OLD.status, NEW.status));
    END IF;
    RETURN NEW;
END $$;

-- ---------------------------------------------------------------------
-- 9. TRIGGER: NGƯỜI DÙNG
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_users_check_insurer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_code TEXT;
BEGIN
    SELECT code INTO v_code FROM roles WHERE role_id = NEW.role_id;
    IF v_code = 'insurance_staff' AND NEW.insurer_id IS NULL THEN
        PERFORM fn_rule_fail('Nhân viên bảo hiểm phải thuộc một công ty bảo hiểm');
    ELSIF v_code <> 'insurance_staff' AND NEW.insurer_id IS NOT NULL THEN
        PERFORM fn_rule_fail('Chỉ nhân viên bảo hiểm mới thuộc công ty bảo hiểm');
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_users_check_insurer
    BEFORE INSERT OR UPDATE OF role_id, insurer_id ON users
    FOR EACH ROW EXECUTE FUNCTION fn_users_check_insurer();

-- ---------------------------------------------------------------------
-- 10. TRIGGER: XE VÀ HỒ SƠ ĐĂNG KÝ / SANG TÊN
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_vehicles_transitions
    BEFORE UPDATE OF status ON vehicles
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION fn_enforce_status_transitions(
        '{"normal":["stolen"],"stolen":["normal","revoked"]}');

CREATE TRIGGER trg_requests_transitions
    BEFORE UPDATE OF status ON registration_requests
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION fn_enforce_status_transitions(
        '{"pending_confirmation":["pending_approval","cancelled"],
          "pending_approval":["approved","rejected","needs_more_info","cancelled"],
          "needs_more_info":["pending_approval","cancelled"]}');

-- Xe chỉ sang tên khi đang Bình thường và chủ không còn phạt chưa nộp
-- (vi phạm từ trạng thái Đã xác minh trở đi). Khóa hàng xe để tránh tranh chấp
-- với thao tác duyệt khác (ví dụ báo mất) trên cùng xe.
CREATE FUNCTION fn_assert_transfer_allowed(p_vehicle BIGINT, p_seller BIGINT) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_status vehicle_status;
BEGIN
    SELECT status INTO v_status FROM vehicles WHERE vehicle_id = p_vehicle FOR UPDATE;
    IF NOT FOUND THEN
        PERFORM fn_rule_fail('Xe không tồn tại');
    END IF;
    IF v_status <> 'normal' THEN
        PERFORM fn_rule_fail(format('Xe đang ở trạng thái %s, không được sang tên', v_status));
    END IF;
    IF EXISTS (SELECT 1 FROM violations
               WHERE vehicle_id = p_vehicle AND liable_owner_id = p_seller
                 AND status IN ('verified', 'notified')) THEN
        PERFORM fn_rule_fail('Chủ xe còn vi phạm chưa nộp phạt, không được sang tên');
    END IF;
END $$;

CREATE FUNCTION fn_requests_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.request_type = 'transfer' THEN
        IF NEW.status <> 'pending_confirmation' THEN
            PERFORM fn_rule_fail('Hồ sơ sang tên phải bắt đầu ở trạng thái Chờ xác nhận');
        END IF;
        IF fn_owner_at(NEW.vehicle_id, now()) IS DISTINCT FROM NEW.requester_id THEN
            PERFORM fn_rule_fail('Chỉ chủ hiện hành mới được gửi hồ sơ sang tên');
        END IF;
        PERFORM fn_assert_transfer_allowed(NEW.vehicle_id, NEW.requester_id);
    ELSIF NEW.status <> 'pending_approval' THEN
        PERFORM fn_rule_fail('Hồ sơ đăng ký mới phải bắt đầu ở trạng thái Chờ duyệt');
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_requests_before_insert
    BEFORE INSERT ON registration_requests
    FOR EACH ROW EXECUTE FUNCTION fn_requests_before_insert();

-- Kiểm tra lại lúc duyệt sang tên: vi phạm hoặc báo mất có thể phát sinh trong lúc hồ sơ chờ.
CREATE FUNCTION fn_requests_before_approve() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_assert_transfer_allowed(NEW.vehicle_id, NEW.requester_id);
    RETURN NEW;
END $$;

CREATE TRIGGER trg_requests_before_approve
    BEFORE UPDATE OF status ON registration_requests
    FOR EACH ROW WHEN (NEW.request_type = 'transfer' AND NEW.status = 'approved'
                       AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION fn_requests_before_approve();

CREATE TRIGGER trg_requests_touch
    BEFORE UPDATE ON registration_requests
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- ---------------------------------------------------------------------
-- 11. TRIGGER: VI PHẠM VÀ NỘP PHẠT
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_violations_transitions
    BEFORE UPDATE OF status ON violations
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION fn_enforce_status_transitions(
        '{"recorded":["verified","cancelled"],
          "verified":["notified","cancelled"],
          "notified":["paid"]}');

CREATE FUNCTION fn_violations_checks() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    t violation_types%ROWTYPE;
BEGIN
    -- người chịu phạt phải là chủ xe tại thời điểm vi phạm
    IF NEW.vehicle_id IS NOT NULL AND NEW.liable_owner_id IS NOT NULL THEN
        IF fn_owner_at(NEW.vehicle_id, NEW.occurred_at) IS DISTINCT FROM NEW.liable_owner_id THEN
            PERFORM fn_rule_fail('Người chịu phạt phải là chủ xe tại thời điểm vi phạm');
        END IF;
    END IF;
    -- mức phạt nằm trong khung của danh mục lỗi
    IF NEW.fine_amount IS NOT NULL THEN
        SELECT * INTO t FROM violation_types WHERE violation_type_id = NEW.violation_type_id;
        IF NEW.fine_amount < t.min_fine OR NEW.fine_amount > t.max_fine THEN
            PERFORM fn_rule_fail(format('Mức phạt %s ngoài khung %s - %s của lỗi %s',
                                        NEW.fine_amount, t.min_fine, t.max_fine, t.code));
        END IF;
    END IF;
    -- chỉ chuyển sang Đã nộp phạt khi đã có giao dịch thành công
    IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status <> 'paid' THEN
        IF NOT EXISTS (SELECT 1 FROM payments WHERE violation_id = NEW.violation_id AND status = 'success') THEN
            PERFORM fn_rule_fail('Chưa có giao dịch thanh toán thành công cho vi phạm này');
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_violations_checks
    BEFORE INSERT OR UPDATE OF vehicle_id, liable_owner_id, occurred_at, fine_amount,
                               violation_type_id, status ON violations
    FOR EACH ROW EXECUTE FUNCTION fn_violations_checks();

CREATE TRIGGER trg_violations_touch
    BEFORE UPDATE ON violations
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- Giao dịch nộp phạt: vi phạm phải đang Đã thông báo và số tiền phạt khớp.
-- Khóa hàng vi phạm để hai lần bấm nộp đồng thời bị tuần tự hóa.
-- Thứ tự cho backend: INSERT payments (success) -> UPDATE violations SET status='paid'.
CREATE FUNCTION fn_payments_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v violations%ROWTYPE;
BEGIN
    SELECT * INTO v FROM violations WHERE violation_id = NEW.violation_id FOR UPDATE;
    IF v.status <> 'notified' THEN
        PERFORM fn_rule_fail('Vi phạm không ở trạng thái Đã thông báo, không nộp phạt được');
    END IF;
    IF NEW.fine_amount <> v.fine_amount THEN
        PERFORM fn_rule_fail('Số tiền phạt không khớp quyết định xử phạt');
    END IF;
    IF NEW.status = 'success' AND NEW.paid_at IS NULL THEN
        NEW.paid_at := now();
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_payments_before_insert
    BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_payments_before_insert();

-- ---------------------------------------------------------------------
-- 12. TRIGGER: HỢP ĐỒNG BẢO HIỂM
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_policies_transitions
    BEFORE UPDATE OF status ON insurance_policies
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION fn_enforce_status_transitions(
        '{"pending_payment":["active","cancelled"]}');

-- Tạo hợp đồng: gói đúng loại xe, xe Bình thường, người mua là chủ hiện hành.
-- Phí, hạn mức, quyền lợi mất cắp được sao chép từ gói; end_date luôn suy ra từ thời hạn gói.
CREATE FUNCTION fn_policies_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    pr insurance_products%ROWTYPE;
    v  vehicles%ROWTYPE;
BEGIN
    SELECT * INTO pr FROM insurance_products WHERE product_id = NEW.product_id;
    IF NOT FOUND OR NOT pr.is_active THEN
        PERFORM fn_rule_fail('Gói bảo hiểm không tồn tại hoặc đã ngừng bán');
    END IF;
    SELECT * INTO v FROM vehicles WHERE vehicle_id = NEW.vehicle_id FOR UPDATE;
    IF NOT FOUND THEN
        PERFORM fn_rule_fail('Xe không tồn tại');
    END IF;
    IF pr.vehicle_type_id <> v.vehicle_type_id THEN
        PERFORM fn_rule_fail('Gói bảo hiểm không đúng loại xe');
    END IF;
    IF v.status <> 'normal' THEN
        PERFORM fn_rule_fail(format('Xe đang ở trạng thái %s, không nhận hợp đồng mới', v.status));
    END IF;
    IF fn_owner_at(NEW.vehicle_id, now()) IS DISTINCT FROM NEW.buyer_id THEN
        PERFORM fn_rule_fail('Chỉ chủ hiện hành mới được mua hoặc gia hạn bảo hiểm');
    END IF;
    IF NEW.status <> 'pending_payment' THEN
        PERFORM fn_rule_fail('Hợp đồng mới phải bắt đầu ở trạng thái Chờ thanh toán');
    END IF;
    NEW.premium         := pr.premium;
    NEW.liability_limit := pr.liability_limit;
    NEW.includes_theft  := pr.includes_theft;
    NEW.end_date        := (NEW.start_date + make_interval(months => pr.term_months))::date - 1;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_policies_before_insert
    BEFORE INSERT ON insurance_policies
    FOR EACH ROW EXECUTE FUNCTION fn_policies_before_insert();

-- Kích hoạt hợp đồng: phải có giao dịch phí thành công; tự sinh mã giấy chứng nhận.
CREATE FUNCTION fn_policies_before_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
        IF NOT EXISTS (SELECT 1 FROM policy_payments WHERE policy_id = NEW.policy_id AND status = 'success') THEN
            PERFORM fn_rule_fail('Chưa có giao dịch thanh toán phí thành công cho hợp đồng này');
        END IF;
        IF NEW.certificate_code IS NULL THEN
            NEW.certificate_code := 'BH-' || lpad(NEW.policy_id::text, 10, '0');
        END IF;
    ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at := now();
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_policies_before_update
    BEFORE UPDATE OF status ON insurance_policies
    FOR EACH ROW EXECUTE FUNCTION fn_policies_before_update();

-- Giao dịch phí: hợp đồng phải Chờ thanh toán và số tiền bằng phí đã chốt.
-- Thứ tự cho backend: INSERT policy_payments (success) -> UPDATE insurance_policies SET status='active'.
CREATE FUNCTION fn_policy_payments_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    p insurance_policies%ROWTYPE;
BEGIN
    SELECT * INTO p FROM insurance_policies WHERE policy_id = NEW.policy_id FOR UPDATE;
    IF p.status <> 'pending_payment' THEN
        PERFORM fn_rule_fail('Hợp đồng không ở trạng thái Chờ thanh toán');
    END IF;
    IF NEW.amount <> p.premium THEN
        PERFORM fn_rule_fail('Số tiền thanh toán không khớp phí hợp đồng');
    END IF;
    IF NEW.status = 'success' AND NEW.paid_at IS NULL THEN
        NEW.paid_at := now();
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_policy_payments_before_insert
    BEFORE INSERT ON policy_payments
    FOR EACH ROW EXECUTE FUNCTION fn_policy_payments_before_insert();

-- ---------------------------------------------------------------------
-- 13. TRIGGER: YÊU CẦU BỒI THƯỜNG
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_claims_transitions
    BEFORE UPDATE OF status ON insurance_claims
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION fn_enforce_status_transitions(
        '{"pending_review":["approved","rejected","needs_more_info","cancelled"],
          "needs_more_info":["pending_review","cancelled"],
          "approved":["paid"]}');

-- Tạo yêu cầu: hợp đồng Hiệu lực, sự kiện trong hiệu lực và không ở tương lai,
-- người yêu cầu là chủ xe tại thời điểm xảy ra; mất cắp thêm: gói có quyền lợi
-- mất cắp, xe đang Bình thường, người yêu cầu là chủ hiện hành.
CREATE FUNCTION fn_claims_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    p        insurance_policies%ROWTYPE;
    v_status vehicle_status;
    v_day    DATE;
BEGIN
    SELECT * INTO p FROM insurance_policies WHERE policy_id = NEW.policy_id FOR UPDATE;
    IF NOT FOUND OR p.status <> 'active' THEN
        PERFORM fn_rule_fail('Chỉ nhận yêu cầu bồi thường khi hợp đồng đang Hiệu lực');
    END IF;
    IF NEW.event_time > now() THEN
        PERFORM fn_rule_fail('Thời điểm sự kiện không được ở tương lai');
    END IF;
    v_day := (NEW.event_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    IF v_day < p.start_date OR v_day > p.end_date THEN
        PERFORM fn_rule_fail('Thời điểm sự kiện nằm ngoài khoảng hiệu lực của hợp đồng');
    END IF;
    IF fn_owner_at(p.vehicle_id, NEW.event_time) IS DISTINCT FROM NEW.claimant_id THEN
        PERFORM fn_rule_fail('Người yêu cầu không phải chủ xe tại thời điểm xảy ra sự kiện');
    END IF;
    IF NEW.claim_type = 'theft' THEN
        IF NOT p.includes_theft THEN
            PERFORM fn_rule_fail('Hợp đồng không có quyền lợi mất cắp');
        END IF;
        SELECT status INTO v_status FROM vehicles WHERE vehicle_id = p.vehicle_id;
        IF v_status <> 'normal' THEN
            PERFORM fn_rule_fail('Yêu cầu mất cắp chỉ nhận khi xe đang Bình thường');
        END IF;
        IF fn_owner_at(p.vehicle_id, now()) IS DISTINCT FROM NEW.claimant_id THEN
            PERFORM fn_rule_fail('Yêu cầu mất cắp chỉ do chủ hiện hành gửi');
        END IF;
    END IF;
    IF NEW.status <> 'pending_review' THEN
        PERFORM fn_rule_fail('Yêu cầu mới phải bắt đầu ở trạng thái Chờ thẩm định');
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_claims_before_insert
    BEFORE INSERT ON insurance_claims
    FOR EACH ROW EXECUTE FUNCTION fn_claims_before_insert();

-- Thẩm định: người duyệt thuộc đúng công ty bảo hiểm; số tiền duyệt cố định sau khi duyệt;
-- tổng đã duyệt của hợp đồng không vượt hạn mức (khóa hàng hợp đồng để tuần tự hóa).
CREATE FUNCTION fn_claims_before_update() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    p          insurance_policies%ROWTYPE;
    v_used     NUMERIC;
    v_staff    INT;
    v_company  INT;
BEGIN
    IF OLD.status IN ('approved', 'paid') AND NEW.approved_amount IS DISTINCT FROM OLD.approved_amount THEN
        PERFORM fn_rule_fail('Không được sửa số tiền đã duyệt');
    END IF;

    IF NEW.reviewer_id IS NOT NULL AND NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
        SELECT insurer_id INTO v_staff FROM users WHERE user_id = NEW.reviewer_id;
        SELECT pr.insurer_id INTO v_company
        FROM insurance_policies po JOIN insurance_products pr ON pr.product_id = po.product_id
        WHERE po.policy_id = NEW.policy_id;
        IF v_staff IS DISTINCT FROM v_company THEN
            PERFORM fn_rule_fail('Người thẩm định không thuộc công ty bảo hiểm của hợp đồng');
        END IF;
    END IF;

    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
        SELECT * INTO p FROM insurance_policies WHERE policy_id = NEW.policy_id FOR UPDATE;
        SELECT COALESCE(SUM(approved_amount), 0) INTO v_used
        FROM insurance_claims
        WHERE policy_id = NEW.policy_id AND status IN ('approved', 'paid') AND claim_id <> NEW.claim_id;
        IF v_used + NEW.approved_amount > p.liability_limit THEN
            PERFORM fn_rule_fail(format('Vượt hạn mức: đã duyệt %s, đề nghị thêm %s, hạn mức %s',
                                        v_used, NEW.approved_amount, p.liability_limit));
        END IF;
    END IF;

    IF NEW.status = 'paid' AND NEW.paid_at IS NULL THEN
        NEW.paid_at := now();
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_claims_before_update
    BEFORE UPDATE ON insurance_claims
    FOR EACH ROW EXECUTE FUNCTION fn_claims_before_update();

CREATE TRIGGER trg_claims_touch
    BEFORE UPDATE ON insurance_claims
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- ---------------------------------------------------------------------
-- 14. MÔ TẢ BẢNG
-- ---------------------------------------------------------------------
COMMENT ON TABLE roles                  IS 'Vai trò: owner, registrar, violation_officer, insurance_staff, admin';
COMMENT ON TABLE insurers               IS 'Công ty bảo hiểm (danh mục)';
COMMENT ON TABLE users                  IS 'Chủ xe, cán bộ, nhân viên bảo hiểm, quản trị dùng chung; phân biệt bằng role_id';
COMMENT ON TABLE vehicle_types          IS 'Loại xe và công năng (danh mục)';
COMMENT ON TABLE violation_types        IS 'Danh mục lỗi và khung mức phạt';
COMMENT ON TABLE cameras                IS 'Camera phạt nguội: mã và địa điểm lắp đặt';
COMMENT ON TABLE vehicles               IS 'Phương tiện; status theo vòng đời normal -> stolen -> normal/revoked';
COMMENT ON TABLE ownership_history      IS 'Lịch sử sở hữu theo khoảng [valid_from, valid_to); valid_to NULL là chủ hiện hành';
COMMENT ON TABLE registration_requests  IS 'Hồ sơ đăng ký mới và sang tên';
COMMENT ON TABLE violations             IS 'Vi phạm phạt nguội; liable_owner_id là chủ xe tại thời điểm vi phạm';
COMMENT ON TABLE payments               IS 'Giao dịch nộp phạt qua cổng mô phỏng';
COMMENT ON TABLE insurance_products     IS 'Gói bảo hiểm TNDS của từng công ty theo loại xe';
COMMENT ON TABLE insurance_policies     IS 'Hợp đồng bảo hiểm gắn với xe, không gắn với chủ';
COMMENT ON TABLE policy_payments        IS 'Giao dịch thanh toán phí bảo hiểm qua cổng mô phỏng';
COMMENT ON TABLE insurance_claims       IS 'Yêu cầu bồi thường (tai nạn, mất cắp)';
COMMENT ON TABLE vehicle_status_history IS 'Mọi thay đổi trạng thái xe và sự kiện đăng ký, sang tên';

COMMIT;

-- =====================================================================
-- CHỈ MỤC HIỆU NĂNG CHO PHẦN EXPLAIN (ANALYZE, BUFFERS)
-- Chạy EXPLAIN cho các truy vấn trên bảng violations từ 100.000 dòng TRƯỚC,
-- rồi mới bỏ comment hai lệnh dưới đây và đo lại.
-- =====================================================================
-- CREATE INDEX ix_violations_vehicle_status ON violations (vehicle_id, status);
-- CREATE INDEX ix_violations_occurred_at    ON violations (occurred_at);

-- =====================================================================
-- THỨ TỰ THAO TÁC GỢI Ý CHO BACKEND (mỗi mục là MỘT transaction)
--  * Duyệt đăng ký mới : INSERT vehicles -> INSERT ownership_history (valid_to NULL)
--                        -> UPDATE registration_requests (vehicle_id, status='approved')
--                        -> INSERT vehicle_status_history ('registered').
--  * Duyệt sang tên    : UPDATE registration_requests SET status='approved' (trigger kiểm tra lại)
--                        -> UPDATE ownership_history SET valid_to = t (chủ cũ)
--                        -> INSERT ownership_history (valid_from = t, chủ mới)
--                        -> INSERT vehicle_status_history ('ownership_transferred').
--  * Nộp phạt          : INSERT payments (success) -> UPDATE violations SET status='paid'.
--  * Mua bảo hiểm      : INSERT insurance_policies -> INSERT policy_payments (success)
--                        -> UPDATE insurance_policies SET status='active'.
--  * Duyệt bồi thường mất cắp (các bước nên chạy theo thứ tự cố định):
--      SELECT ... FOR UPDATE vehicles, rồi insurance_policies
--      -> UPDATE insurance_claims SET status='approved', approved_amount, reviewer_id
--      -> UPDATE vehicles SET status='stolen'
--      -> UPDATE registration_requests SET status='cancelled', cancel_reason='xe báo mất'
--         WHERE vehicle_id = ? AND status IN ('pending_confirmation','pending_approval','needs_more_info')
--      -> UPDATE insurance_policies SET status='cancelled'
--         WHERE vehicle_id = ? AND status='pending_payment'
--      -> INSERT vehicle_status_history ('reported_stolen', claim_id).
-- =====================================================================
