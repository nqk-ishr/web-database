// Dữ liệu giả khi VITE_USE_MOCK=true (không cần backend). Cùng hình dạng với API thật.
import { dayDiff, vnToday } from "../utils/format";
import { policyEnd } from "../utils/policies";

const rel = (days) => { const d = new Date(vnToday() + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const LATE_RATE = 0.0005;          // 0,05%/ngày, khớp backend (LATE_FEE_RATE)

export const db = {
  vehicles: [
    { vehicle_id: 1, vehicle_type_id: 1, plate_number: "30A-123.45", status: "normal", vehicle_type: "Ô tô con", manufacture_year: 2021, chassis_number: "RLVA2K9X21", engine_number: "EN5521098", current_owner: "Nguyễn Văn An" },
    { vehicle_id: 2, vehicle_type_id: 3, plate_number: "29B1-567.89", status: "normal", vehicle_type: "Xe máy", manufacture_year: 2019, chassis_number: "RLHJF1234K", engine_number: "EN7788", current_owner: "Nguyễn Văn An" },
    { vehicle_id: 3, vehicle_type_id: 1, plate_number: "30F-888.01", status: "stolen", vehicle_type: "Ô tô con", manufacture_year: 2020, chassis_number: "RLVB3M0Y20", engine_number: "EN1204", current_owner: "Nguyễn Văn An", policy: null },
    { vehicle_id: 4, vehicle_type_id: 1, plate_number: "51H-246.80", status: "normal", vehicle_type: "Ô tô con", manufacture_year: 2018, chassis_number: "RLVC4N1Z18", engine_number: "EN3377", current_owner: "Nguyễn Văn An" },
  ],
  owners: { 1: [
    { ownership_id: 2, owner_name: "Nguyễn Văn An", valid_from: "2024-06-10", valid_to: null },
    { ownership_id: 1, owner_name: "Trần Thị Bình", valid_from: "2021-03-20", valid_to: "2024-06-10" } ] },
  history: { 1: [
    { history_id: 2, event_type: "ownership_transferred", old_status: null, new_status: null, reason: null, changed_at: "2024-06-10T09:00:00+07:00", actor_name: "Đỗ Minh Quân" },
    { history_id: 1, event_type: "registered", old_status: null, new_status: "normal", reason: null, changed_at: "2021-03-20T09:00:00+07:00", actor_name: "Võ Thị Hạnh" } ],
    3: [{ history_id: 3, event_type: "reported_stolen", old_status: "normal", new_status: "stolen", reason: "Bồi thường mất cắp", changed_at: "2026-10-01T10:00:00+07:00", actor_name: "Phạm Quốc Việt" }] },
  violations: [
    { violation_id: 11, vehicle_id: 1, occurred_at: "2026-10-05T08:12:00+07:00", plate_number: "30A-123.45", type: "Vượt đèn đỏ", location_name: "Ngã tư Hàng Xanh", decision_number: "QD-2026-0011", status: "notified", fine_amount: 4000000, due_date: rel(-12) },
    { violation_id: 12, vehicle_id: 1, occurred_at: "2026-10-21T17:40:00+07:00", plate_number: "30A-123.45", type: "Dừng đỗ sai quy định", location_name: "Đường Nguyễn Huệ", decision_number: "QD-2026-0012", status: "notified", fine_amount: 800000, due_date: rel(9) },
    { violation_id: 13, vehicle_id: 2, occurred_at: "2026-11-03T09:05:00+07:00", plate_number: "29B1-567.89", type: "Chạy quá tốc độ", location_name: "Đại lộ Võ Văn Kiệt", decision_number: null, status: "verified", fine_amount: null, due_date: null },
    { violation_id: 14, vehicle_id: 1, occurred_at: "2026-08-12T14:30:00+07:00", plate_number: "30A-123.45", type: "Đi sai làn đường", location_name: "Cầu Sài Gòn", decision_number: "QD-2026-0014", status: "paid", fine_amount: 600000, due_date: "2026-09-05" },
  ],
  products: [
    { product_id: 1, vehicle_type_id: 1, insurer: "Bảo hiểm Demo A", name: "Cơ bản", premium: 70000, term_months: 12, liability_limit: 150000000, includes_theft: false },
    { product_id: 2, vehicle_type_id: 1, insurer: "Bảo hiểm Demo A", name: "Mở rộng (có mất cắp)", premium: 250000, term_months: 12, liability_limit: 150000000, includes_theft: true },
    { product_id: 7, vehicle_type_id: 1, insurer: "Bảo hiểm Demo B", name: "Cơ bản", premium: 65000, term_months: 12, liability_limit: 150000000, includes_theft: false },
    { product_id: 3, vehicle_type_id: 3, insurer: "Bảo hiểm Demo A", name: "Cơ bản", premium: 480000, term_months: 12, liability_limit: 150000000, includes_theft: false },
    { product_id: 4, vehicle_type_id: 3, insurer: "Bảo hiểm Demo A", name: "Mở rộng (có mất cắp)", premium: 1800000, term_months: 12, liability_limit: 150000000, includes_theft: true },
  ],
  // status trong CSDL: pending_payment | active | cancelled (is_expired suy ra từ end_date)
  policies: [
    { policy_id: 1, certificate_code: "GCN-A-0001", vehicle_id: 1, product_id: 2, start_date: rel(-300), end_date: rel(65), premium: 250000, liability_limit: 150000000, includes_theft: true, status: "active", created_at: "2026-01-20T09:00:00+07:00" },
    { policy_id: 2, certificate_code: "GCN-A-0002", vehicle_id: 2, product_id: 3, start_date: rel(-353), end_date: rel(12), premium: 480000, liability_limit: 150000000, includes_theft: false, status: "active", created_at: "2025-12-01T09:00:00+07:00" },
    { policy_id: 3, certificate_code: "GCN-A-0003", vehicle_id: 4, product_id: 1, start_date: rel(-400), end_date: rel(-35), premium: 70000, liability_limit: 150000000, includes_theft: false, status: "active", created_at: "2025-10-10T09:00:00+07:00" },
    { policy_id: 4, certificate_code: null, vehicle_id: 2, product_id: 3, start_date: rel(13), end_date: policyEnd(rel(13), 12), premium: 480000, liability_limit: 150000000, includes_theft: false, status: "pending_payment", created_at: new Date().toISOString() },
    { policy_id: 6, certificate_code: "GCN-A-0006", vehicle_id: 3, product_id: 2, start_date: rel(-200), end_date: rel(165), premium: 250000, liability_limit: 150000000, includes_theft: true, status: "active", created_at: "2026-05-01T09:00:00+07:00" },
    { policy_id: 5, certificate_code: null, vehicle_id: 1, product_id: 1, start_date: rel(-30), end_date: policyEnd(rel(-30), 12), premium: 70000, liability_limit: 150000000, includes_theft: false, status: "cancelled", created_at: "2026-10-20T09:00:00+07:00" },
  ],
  // status: pending_review | needs_more_info | approved | rejected | paid | cancelled
  claims: [
    { claim_id: 31, policy_id: 1, claim_type: "accident", status: "pending_review", event_time: `${rel(-10)}T08:30:00+07:00`, event_location: "Ngã tư Hàng Xanh, TP.HCM", description: "Va chạm giao thông, trầy xước cản trước.", requested_amount: 5000000, approved_amount: null, reviewer_id: null, reviewer_name: null, review_note: null, cancel_reason: null, paid_at: null, created_at: `${rel(-9)}T10:00:00+07:00`, updated_at: `${rel(-9)}T10:00:00+07:00` },
    { claim_id: 32, policy_id: 2, claim_type: "accident", status: "needs_more_info", event_time: `${rel(-20)}T19:15:00+07:00`, event_location: "Đường Giải Phóng, Hà Nội", description: "Bị xe khác tông từ phía sau.", requested_amount: 3200000, approved_amount: null, reviewer_id: 9, reviewer_name: "Phạm Quốc Việt", review_note: "Vui lòng bổ sung biên bản của cơ quan công an và ảnh hiện trường.", cancel_reason: null, paid_at: null, created_at: `${rel(-18)}T09:00:00+07:00`, updated_at: `${rel(-3)}T14:00:00+07:00` },
    { claim_id: 33, policy_id: 6, claim_type: "theft", status: "approved", event_time: `${rel(-60)}T22:00:00+07:00`, event_location: "Bãi đỗ xe Quận 7, TP.HCM", description: "Mất xe khi đỗ qua đêm.", requested_amount: 250000000, approved_amount: 150000000, reviewer_id: 9, reviewer_name: "Phạm Quốc Việt", review_note: "Duyệt theo hạn mức hợp đồng.", cancel_reason: null, paid_at: null, created_at: `${rel(-58)}T09:00:00+07:00`, updated_at: `${rel(-40)}T09:00:00+07:00` },
    { claim_id: 34, policy_id: 1, claim_type: "accident", status: "paid", event_time: `${rel(-120)}T07:45:00+07:00`, event_location: "Cầu Sài Gòn", description: null, requested_amount: 3000000, approved_amount: 2500000, reviewer_id: 9, reviewer_name: "Phạm Quốc Việt", review_note: "Đã thẩm định.", cancel_reason: null, paid_at: `${rel(-100)}T10:00:00+07:00`, created_at: `${rel(-118)}T09:00:00+07:00`, updated_at: `${rel(-100)}T10:00:00+07:00` },
    { claim_id: 35, policy_id: 1, claim_type: "accident", status: "rejected", event_time: `${rel(-150)}T12:00:00+07:00`, event_location: "Quốc lộ 1A", description: null, requested_amount: 8000000, approved_amount: null, reviewer_id: 9, reviewer_name: "Phạm Quốc Việt", review_note: "Thiệt hại thuộc loại trừ bảo hiểm theo điều khoản.", cancel_reason: null, paid_at: null, created_at: `${rel(-148)}T09:00:00+07:00`, updated_at: `${rel(-140)}T09:00:00+07:00` },
    { claim_id: 36, policy_id: 1, claim_type: "accident", status: "cancelled", event_time: `${rel(-200)}T09:00:00+07:00`, event_location: "Đường Láng", description: null, requested_amount: 1000000, approved_amount: null, reviewer_id: null, reviewer_name: null, review_note: null, cancel_reason: "Chủ xe rút yêu cầu", paid_at: null, created_at: `${rel(-199)}T09:00:00+07:00`, updated_at: `${rel(-198)}T09:00:00+07:00` },
  ],
  policyPayments: {
    1: [{ policy_payment_id: 1, amount: 250000, status: "success", gateway_ref: "PAY-DEMO-0001", created_at: "2026-01-20T09:05:00+07:00", paid_at: "2026-01-20T09:05:00+07:00" }],
    2: [{ policy_payment_id: 2, amount: 480000, status: "success", gateway_ref: "PAY-DEMO-0002", created_at: "2025-12-01T09:05:00+07:00", paid_at: "2025-12-01T09:05:00+07:00" }],
    3: [{ policy_payment_id: 3, amount: 70000, status: "success", gateway_ref: "PAY-DEMO-0003", created_at: "2025-10-10T09:05:00+07:00", paid_at: "2025-10-10T09:05:00+07:00" }],
  },
  vehicleTypes: [
    { vehicle_type_id: 1, name: "Ô tô con", usage_purpose: "Cá nhân" },
    { vehicle_type_id: 2, name: "Ô tô con", usage_purpose: "Kinh doanh vận tải" },
    { vehicle_type_id: 3, name: "Xe máy", usage_purpose: "Cá nhân" },
    { vehicle_type_id: 4, name: "Xe tải nhẹ", usage_purpose: null },
  ],
  // Cùng hình dạng với GET /me/requests (người dùng demo có user_id = 1)
  requests: [
    { request_id: 21, request_type: "new_registration", status: "pending_approval", vehicle_id: null, plate_number: null, declared_chassis_number: "RLVD5P2A24", declared_engine_number: "EN9001", declared_manufacture_year: 2024, declared_vehicle_type: "Ô tô con", requester_id: 1, requester_name: "Nguyễn Văn An", buyer_id: null, buyer_name: null, review_note: null, submitted_at: "2026-11-18T09:00:00+07:00", updated_at: "2026-11-18T09:00:00+07:00" },
    { request_id: 22, request_type: "new_registration", status: "needs_more_info", vehicle_id: null, plate_number: null, declared_chassis_number: "RLVE6Q3B23", declared_engine_number: "EN9002", declared_manufacture_year: 2023, declared_vehicle_type: "Xe máy", requester_id: 1, requester_name: "Nguyễn Văn An", buyer_id: null, buyer_name: null, review_note: "Ảnh giấy chứng nhận nguồn gốc bị mờ, vui lòng chụp lại rõ số khung.", submitted_at: "2026-11-15T10:30:00+07:00", updated_at: "2026-11-17T14:00:00+07:00" },
    { request_id: 23, request_type: "transfer", status: "pending_confirmation", vehicle_id: 7, plate_number: "51G-111.22", declared_chassis_number: null, declared_engine_number: null, declared_manufacture_year: null, declared_vehicle_type: null, requester_id: 77, requester_name: "Lê Quang Huy", buyer_id: 1, buyer_name: "Nguyễn Văn An", review_note: null, submitted_at: "2026-11-19T08:15:00+07:00", updated_at: "2026-11-19T08:15:00+07:00" },
    { request_id: 24, request_type: "new_registration", status: "approved", vehicle_id: 1, plate_number: "30A-123.45", declared_chassis_number: "RLVA2K9X21", declared_engine_number: "EN5521098", declared_manufacture_year: 2021, declared_vehicle_type: "Ô tô con", requester_id: 1, requester_name: "Nguyễn Văn An", buyer_id: null, buyer_name: null, review_note: null, submitted_at: "2021-03-18T09:00:00+07:00", updated_at: "2021-03-20T09:00:00+07:00" },
    { request_id: 25, request_type: "new_registration", status: "rejected", vehicle_id: null, plate_number: null, declared_chassis_number: "RLVF7R4C22", declared_engine_number: "EN9003", declared_manufacture_year: 2022, declared_vehicle_type: "Ô tô con", requester_id: 1, requester_name: "Nguyễn Văn An", buyer_id: null, buyer_name: null, review_note: "Số khung khai báo không khớp giấy tờ nguồn gốc.", submitted_at: "2026-10-02T09:00:00+07:00", updated_at: "2026-10-04T16:00:00+07:00" },
  ],
  attachments: { "requests:22": [{ attachment_id: 501, original_name: "giay-chung-nhan-nguon-goc.jpg", content_type: "image/jpeg", size_bytes: 842000, uploaded_by: 1, created_at: "2026-11-15T10:35:00+07:00" }] },
  payments: { 14: [{ payment_id: 1, fine_amount: 600000, late_fee: 0, total_amount: 600000, status: "success", gateway_ref: "TXN-DEMO-0001", created_at: "2026-08-20T10:00:00+07:00", paid_at: "2026-08-20T10:00:00+07:00" }] },
};

// Suy ra is_overdue / late_fee như backend
export const derive = (v) => {
  const days = v.status === "notified" && v.due_date ? Math.max(0, dayDiff(v.due_date, vnToday())) : 0;
  return { ...v, is_overdue: days > 0, late_fee: v.status === "notified" ? Math.round((v.fine_amount ?? 0) * LATE_RATE * days) : 0 };
};
// Hợp đồng hiển thị trên xe: Hiệu lực hoặc Chờ thanh toán có end_date muộn nhất (khớp truy vấn của backend)
const vehiclePolicy = (vehicleId) => {
  const p = db.policies.filter((x) => x.vehicle_id === vehicleId && ["active", "pending_payment"].includes(x.status))
    .sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
  return p ? { policy_id: p.policy_id, status: p.status, product_name: db.products.find((r) => r.product_id === p.product_id)?.name, start_date: p.start_date,
    end_date: p.end_date, liability_limit: p.liability_limit, includes_theft: p.includes_theft } : null;
};
// Hợp đồng đầy đủ như GET /me/policies và GET /policies/{id}
export const derivePolicy = (p) => {
  const prod = db.products.find((r) => r.product_id === p.product_id);
  const veh = db.vehicles.find((v) => v.vehicle_id === p.vehicle_id);
  return { ...p, product_name: prod?.name, insurer: prod?.insurer, term_months: prod?.term_months, plate_number: veh?.plate_number,
    is_expired: p.status === "active" && p.end_date < vnToday() };
};
// Yêu cầu bồi thường kèm thông tin hợp đồng/xe như GET /me/claims và GET /claims/{id}
export const deriveClaim = (c) => {
  const p = db.policies.find((x) => x.policy_id === c.policy_id);
  const prod = db.products.find((r) => r.product_id === p.product_id);
  const veh = db.vehicles.find((v) => v.vehicle_id === p.vehicle_id);
  return { ...c, certificate_code: p.certificate_code, vehicle_id: p.vehicle_id, plate_number: veh?.plate_number, product_name: prod?.name, insurer: prod?.insurer,
    liability_limit: p.liability_limit, includes_theft: p.includes_theft, policy_start: p.start_date, policy_end: p.end_date, claimant_name: "Nguyễn Văn An" };
};
export const mockClaims = () => db.claims.map(deriveClaim).sort((a, b) => b.created_at.localeCompare(a.created_at));

export const mockPolicies = () => db.policies.map(derivePolicy).sort((a, b) => b.created_at.localeCompare(a.created_at));

export const mockVehicles = () => db.vehicles.map((x) => ({ ...x, policy: vehiclePolicy(x.vehicle_id),
  unpaid_violations: db.violations.filter((v) => v.vehicle_id === x.vehicle_id && v.status === "notified").length,
  // chặn sang tên: đã xác minh HOẶC đã thông báo (khớp backend)
  blocking_violations: db.violations.filter((v) => v.vehicle_id === x.vehicle_id && ["verified", "notified"].includes(v.status)).length }));

// Lỗi giả cùng hình dạng với lỗi axios từ backend ({ response: { status, data: { detail } } })
export const mockError = (status, detail) => Object.assign(new Error(detail), { response: { status, data: { detail } } });
// Danh bạ người mua theo CCCD (chỉ dùng cho chế độ mock)
export const buyers = { "079095022222": { user_id: 6, full_name: "Lâm Ngọc Diệp" }, "079088003333": { user_id: 7, full_name: "Cao Quốc Vinh" } };
export const mockViolations = () => db.violations.map(derive);

export const mockRequests = () => db.requests.map((r) => ({ ...r }));
export const mockRequestDetail = (id) => {
  const r = db.requests.find((x) => x.request_id === Number(id));
  return r ? { ...r, reviewer_name: r.review_note ? "Đỗ Minh Quân" : null, unpaid_violations: 0, history: [] } : null;
};

export const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 250));
