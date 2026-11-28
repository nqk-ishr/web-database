// Logic thuần của yêu cầu bồi thường (dễ kiểm thử, không phụ thuộc React).
import { date } from "./format";

export const CLAIM_OPEN = ["pending_review", "needs_more_info"];

export const CLAIM_TABS = [
  { key: "all", label: "Tất cả" }, { key: "open", label: "Đang xử lý" }, { key: "info", label: "Cần bổ sung" },
  { key: "approved", label: "Đã duyệt / chi trả" }, { key: "closed", label: "Từ chối / đã hủy" },
];
export const matchClaimTab = {
  all: () => true,
  open: (c) => CLAIM_OPEN.includes(c.status),
  info: (c) => c.status === "needs_more_info",
  approved: (c) => ["approved", "paid"].includes(c.status),
  closed: (c) => ["rejected", "cancelled"].includes(c.status),
};

export const CLAIM_STEPS = ["Gửi yêu cầu", "Thẩm định", "Duyệt", "Chi trả"];
// Số bước đã hoàn thành; null nếu yêu cầu đã kết thúc không thành (bị từ chối / đã hủy)
export function claimProgress(status) {
  switch (status) {
    case "pending_review":
    case "needs_more_info": return 1;
    case "approved": return 3;
    case "paid": return 4;
    default: return null;
  }
}

// Khớp backend: chỉ rút / bổ sung / sửa tệp khi còn mở
export const decorateClaim = (c) => (!c ? c : {
  ...c,
  canWithdraw: CLAIM_OPEN.includes(c.status),
  canSupplement: c.status === "needs_more_info",
  canEditFiles: CLAIM_OPEN.includes(c.status),
  progress: claimProgress(c.status),
});

// Hợp đồng nhận yêu cầu: đang Hiệu lực và chưa quá hạn (backend: fn_claims_before_insert)
export const claimablePolicy = (p) => p.status === "active" && !p.expired;

// Mỗi hợp đồng tối đa một yêu cầu mất cắp đang mở (backend: uq_claim_one_open_theft; "Đã duyệt" chưa chi trả vẫn là đang mở)
export const hasOpenTheft = (claims, policyId) =>
  (claims ?? []).some((c) => c.policy_id === policyId && c.claim_type === "theft" && ["pending_review", "needs_more_info", "approved"].includes(c.status));

// Lý do không gửi được yêu cầu MẤT CẮP (null = được)
export function theftBlockReason(policy, vehicle, claims) {
  if (!policy.includes_theft) return "Hợp đồng này không có quyền lợi mất cắp.";
  if (vehicle && vehicle.status !== "normal") return "Chỉ gửi được yêu cầu mất cắp khi xe đang ở trạng thái Bình thường.";
  if (hasOpenTheft(claims, policy.policy_id)) return "Hợp đồng này đã có một yêu cầu mất cắp đang được xử lý.";
  return null;
}

// "5.000.000", "5,000,000 đ", "5000000" -> 5000000; sai định dạng -> NaN (VNĐ không có phần thập phân)
export function parseAmount(s) {
  const t = String(s ?? "").replace(/[\s.,đĐ]/g, "");
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

// <input type="datetime-local"> không có múi giờ; hệ thống tính theo giờ Việt Nam (UTC+7, không có giờ mùa hè)
export const toIsoVN = (local) => `${local}:00+07:00`;
export function vnNowLocal(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Kiểm tra form gửi yêu cầu, khớp luật backend. ctx: { policy, ownershipStart, theftBlock, nowMs }.
 * Backend kiểm tra lại tất cả (trigger), đây chỉ để báo lỗi sớm.
 */
export function validateClaim(f, { policy, ownershipStart, theftBlock, nowMs = Date.now() } = {}) {
  const e = {};
  if (!["accident", "theft"].includes(f.claim_type)) e.claim_type = "Vui lòng chọn loại yêu cầu";
  else if (f.claim_type === "theft" && theftBlock) e.claim_type = theftBlock;

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(f.event_time ?? "")) e.event_time = "Vui lòng chọn thời điểm xảy ra sự kiện";
  else {
    const ms = Date.parse(toIsoVN(f.event_time));
    const day = f.event_time.slice(0, 10);
    if (Number.isNaN(ms)) e.event_time = "Thời điểm không hợp lệ";
    else if (ms > nowMs) e.event_time = "Thời điểm sự kiện không được ở tương lai";
    else if (policy && (day < policy.start_date || day > policy.end_date)) e.event_time = `Sự kiện phải nằm trong thời hạn hợp đồng (${date(policy.start_date)} – ${date(policy.end_date)})`;
    else if (ownershipStart && ms < Date.parse(ownershipStart)) e.event_time = "Sự kiện xảy ra trước khi bạn đứng tên xe nên bạn không yêu cầu được";
  }
  const loc = (f.event_location ?? "").trim();
  if (!loc) e.event_location = "Vui lòng nhập địa điểm";
  else if (loc.length > 300) e.event_location = "Tối đa 300 ký tự";
  if ((f.description ?? "").length > 1000) e.description = "Tối đa 1000 ký tự";
  const amount = parseAmount(f.requested_amount);
  if (!Number.isInteger(amount) || amount <= 0) e.requested_amount = "Nhập số tiền đề nghị lớn hơn 0 (chỉ gồm chữ số)";
  return e;
}

// Dữ liệu gửi lên API (POST /claims)
export const normalizeClaim = (f, policyId) => ({
  policy_id: policyId,
  claim_type: f.claim_type,
  event_time: toIsoVN(f.event_time),
  event_location: f.event_location.trim(),
  ...((f.description ?? "").trim() ? { description: f.description.trim() } : {}),
  requested_amount: parseAmount(f.requested_amount),
});
