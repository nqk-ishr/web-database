import { api, call } from "./client";
import { db, deriveClaim, derivePolicy, mockClaims, mockError, wait } from "./mockData";
import { claimablePolicy, hasOpenTheft } from "../utils/claims";

const find = (id) => db.claims.find((c) => c.claim_id === Number(id));
const touch = (c, status, extra = {}) => { Object.assign(c, { status, updated_at: new Date().toISOString() }, extra); return c; };
const reject = (status, detail) => wait(null).then(() => { throw mockError(status, detail); });

// Yêu cầu của tôi (kèm biển số, công ty bảo hiểm, ghi chú thẩm định)
export const getMyClaims = () => call(() => api.get("/me/claims"), () => wait(mockClaims()));
// Chi tiết: thêm liability_limit, includes_theft, policy_start, policy_end, claimant_name, reviewer_name
export const getClaim = (id) => call(() => api.get(`/claims/${id}`), () => wait(find(id) ? deriveClaim(find(id)) : null));

// 201 { claim_id, status: "pending_review" }. Backend (trigger) trả 409 khi: hợp đồng không Hiệu lực, sự kiện ở tương lai hoặc
// ngoài hạn hợp đồng, người gửi không phải chủ xe lúc xảy ra; mất cắp: gói không có quyền lợi, xe không Bình thường, đã có yêu cầu mở.
export const submitClaim = (body) =>
  call(() => api.post("/claims", body), () => {
    const p = db.policies.find((x) => x.policy_id === body.policy_id);
    const dp = p && derivePolicy(p);
    if (!p || !claimablePolicy({ status: p.status, expired: dp.is_expired })) return reject(409, "Chỉ nhận yêu cầu bồi thường khi hợp đồng đang Hiệu lực");
    if (Date.parse(body.event_time) > Date.now()) return reject(409, "Thời điểm sự kiện không được ở tương lai");
    const day = new Date(Date.parse(body.event_time) + 7 * 3600e3).toISOString().slice(0, 10);       // ngày theo giờ Việt Nam
    if (day < p.start_date || day > p.end_date) return reject(409, "Thời điểm sự kiện nằm ngoài khoảng hiệu lực của hợp đồng");
    const since = db.owners[p.vehicle_id]?.find((o) => o.valid_to === null)?.valid_from;
    if (since && Date.parse(body.event_time) < Date.parse(since)) return reject(409, "Người yêu cầu không phải chủ xe tại thời điểm xảy ra sự kiện");
    if (body.claim_type === "theft") {
      if (!p.includes_theft) return reject(409, "Hợp đồng không có quyền lợi mất cắp");
      if (db.vehicles.find((v) => v.vehicle_id === p.vehicle_id).status !== "normal") return reject(409, "Yêu cầu mất cắp chỉ nhận khi xe đang Bình thường");
      if (hasOpenTheft(db.claims, p.policy_id)) return reject(409, "duplicate key value violates unique constraint \"uq_claim_one_open_theft\"");
    }
    const c = { claim_id: Date.now(), policy_id: body.policy_id, claim_type: body.claim_type, status: "pending_review", event_time: body.event_time,
      event_location: body.event_location, description: body.description ?? null, requested_amount: body.requested_amount, approved_amount: null,
      reviewer_id: null, reviewer_name: null, review_note: null, cancel_reason: null, paid_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    db.claims.unshift(c);
    return wait({ claim_id: c.claim_id, status: c.status });
  });

// needs_more_info -> pending_review; description (không bắt buộc) ghi đè mô tả
export const supplementClaim = (id, description) =>
  call(() => api.post(`/claims/${id}/supplement`, description ? { description } : {}), () => {
    const c = find(id);
    if (c.status !== "needs_more_info") return reject(409, `Yêu cầu đang ở trạng thái ${c.status}, không thực hiện được`);
    touch(c, "pending_review", description ? { description } : {});
    return wait({ claim_id: c.claim_id, status: c.status });
  });

// Rút yêu cầu (pending_review / needs_more_info); lý do không bắt buộc, chỉ gửi khi có
export const withdrawClaim = (id, reason) =>
  call(() => api.post(`/claims/${id}/cancel`, reason ? { reason } : undefined), () => {
    const c = find(id);
    if (!["pending_review", "needs_more_info"].includes(c.status)) return reject(409, `Yêu cầu đang ở trạng thái ${c.status}, không thực hiện được`);
    touch(c, "cancelled", { cancel_reason: reason || "Chủ xe rút yêu cầu" });
    return wait({ claim_id: c.claim_id, status: c.status });
  });
