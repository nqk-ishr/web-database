import { api, call } from "./client";
import { db, derivePolicy, mockError, mockPolicies, wait } from "./mockData";
import { findOverlap, pendingFor, policyEnd } from "../utils/policies";
import { vnToday } from "../utils/format";

const find = (id) => db.policies.find((p) => p.policy_id === Number(id));
const vehicleType = (vehicleId) => db.vehicles.find((v) => v.vehicle_id === vehicleId)?.vehicle_type_id;
const reject = (status, detail) => wait(null).then(() => { throw mockError(status, detail); });

// Hợp đồng của tôi (kèm insurer, term_months, plate_number, is_expired)
export const getMyPolicies = () => call(() => api.get("/me/policies"), () => wait(mockPolicies()));
// Chi tiết kèm payments (giao dịch thanh toán phí) và claims
export const getPolicy = (id) =>
  call(() => api.get(`/policies/${id}`), () => {
    const p = find(id);
    return wait(p ? { ...derivePolicy(p), payments: db.policyPayments[p.policy_id] ?? [], claims: db.claims.filter((c) => c.policy_id === p.policy_id) } : null);
  });
// Gói bảo hiểm phù hợp loại xe: [{ product_id, insurer, name, premium, term_months, liability_limit, includes_theft }]
export const getProducts = (vehicleId) =>
  call(() => api.get("/insurance/products", { params: { vehicle_id: vehicleId } }),
       () => wait(db.products.filter((p) => p.vehicle_type_id === vehicleType(Number(vehicleId))).map(({ vehicle_type_id, ...rest }) => rest)));

// 201 { policy_id, status: "pending_payment", start_date, end_date, premium }. Phí/hạn mức/ngày hết hạn do backend tính.
// 400: ngày bắt đầu ở quá khứ. 409: xe không "Bình thường", không phải chủ xe, đã có hợp đồng chờ thanh toán.
export const buyPolicy = ({ vehicle_id, product_id, start_date }) =>
  call(() => api.post("/policies", { vehicle_id, product_id, start_date }), () => {
    if (start_date < vnToday()) return reject(400, "Ngày bắt đầu không được ở quá khứ");
    const veh = db.vehicles.find((v) => v.vehicle_id === vehicle_id);
    if (!veh || veh.status !== "normal") return reject(409, "Xe không ở trạng thái Bình thường, không mua được bảo hiểm");
    if (pendingFor(db.policies, vehicle_id)) return reject(409, "Mỗi xe chỉ có một hợp đồng chờ thanh toán");
    const prod = db.products.find((p) => p.product_id === product_id);
    if (!prod || prod.vehicle_type_id !== veh.vehicle_type_id) return reject(409, "Gói bảo hiểm không áp dụng cho loại xe này");
    const p = { policy_id: Date.now(), certificate_code: null, vehicle_id, product_id, start_date, end_date: policyEnd(start_date, prod.term_months),
      premium: prod.premium, liability_limit: prod.liability_limit, includes_theft: prod.includes_theft, status: "pending_payment", created_at: new Date().toISOString() };
    db.policies.push(p);
    return wait({ policy_id: p.policy_id, status: p.status, start_date: p.start_date, end_date: p.end_date, premium: p.premium });
  });

// 200 { policy_payment_id, amount, status: "success"|"failed", gateway_ref, policy_status, certificate_code }
// status "failed" vẫn là HTTP 200 (hợp đồng giữ "pending_payment"). 409 nếu đã thanh toán/đã hủy hoặc chồng hiệu lực
// (khi đó backend rollback cả giao dịch thanh toán: không có dòng nào được ghi).
export const payPolicy = (id, { simulate_fail = false } = {}) =>
  call(() => api.post(`/policies/${id}/pay`, { simulate_fail }), () => {
    const p = find(id);
    if (p.status !== "pending_payment") return reject(409, `Hợp đồng đang ở trạng thái ${p.status}, không thanh toán được`);
    const ref = `PAY-MOCK-${String(Date.now()).slice(-6)}`;
    const record = (status) => (db.policyPayments[p.policy_id] ??= []).push({ policy_payment_id: Date.now(), amount: p.premium, status, gateway_ref: ref,
      created_at: new Date().toISOString(), paid_at: status === "success" ? new Date().toISOString() : null });
    if (simulate_fail) {
      record("failed");
      return wait({ amount: p.premium, status: "failed", gateway_ref: ref, policy_status: "pending_payment", certificate_code: null });
    }
    if (findOverlap(db.policies, p.vehicle_id, p.start_date, p.end_date)) return reject(409, "Hợp đồng chồng thời gian hiệu lực với hợp đồng đang có của xe");
    record("success");
    p.status = "active";
    p.certificate_code = `GCN-MOCK-${String(Date.now()).slice(-6)}`;
    return wait({ amount: p.premium, status: "success", gateway_ref: ref, policy_status: "active", certificate_code: p.certificate_code });
  });

// Chỉ hủy được hợp đồng Chờ thanh toán
export const cancelPolicy = (id) =>
  call(() => api.post(`/policies/${id}/cancel`), () => {
    const p = find(id);
    if (p.status !== "pending_payment") return reject(409, "Chỉ hủy được hợp đồng đang Chờ thanh toán");
    p.status = "cancelled";
    return wait({ policy_id: p.policy_id, status: "cancelled" });
  });
