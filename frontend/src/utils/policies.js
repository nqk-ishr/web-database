// Logic thuần của hợp đồng bảo hiểm (dễ kiểm thử, không phụ thuộc React). Ngày là chuỗi "YYYY-MM-DD".
import { vnToday } from "./format";

const pad = (n) => String(n).padStart(2, "0");
const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const parts = (s) => String(s).slice(0, 10).split("-").map(Number);

export function addDays(s, n) {
  const [y, m, d] = parts(s);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
// Giống PostgreSQL: ngày 31 + 1 tháng = ngày cuối tháng sau (không tràn sang tháng kế)
export function addMonths(s, months) {
  const [y, m, d] = parts(s);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12), nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return fmt(ny, nm + 1, Math.min(d, last));
}
// Ngày hết hạn (gồm cả ngày cuối): start + term tháng - 1 ngày. Backend do trigger tính; đây chỉ để xem trước.
export const policyEnd = (start, months) => addDays(addMonths(start, months), -1);

export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && aEnd >= bStart;

// Các hợp đồng Hiệu lực của một xe không được chồng ngày (backend: ex_policy_no_overlap, kiểm tra lúc thanh toán)
export const findOverlap = (policies, vehicleId, start, end) =>
  (policies ?? []).find((p) => p.vehicle_id === vehicleId && p.status === "active" && rangesOverlap(start, end, p.start_date, p.end_date)) ?? null;

// Mỗi xe chỉ một hợp đồng chờ thanh toán (backend: uq_policy_one_pending)
export const pendingFor = (policies, vehicleId) =>
  (policies ?? []).find((p) => p.vehicle_id === vehicleId && p.status === "pending_payment") ?? null;

// Ngày bắt đầu gợi ý: nếu còn hợp đồng hiệu lực thì gia hạn liền sau ngày hết hạn, ngược lại là hôm nay
export function suggestedStart(policies, vehicleId, today = vnToday()) {
  const ends = (policies ?? []).filter((p) => p.vehicle_id === vehicleId && p.status === "active" && p.end_date >= today).map((p) => p.end_date);
  return ends.length ? addDays(ends.sort().at(-1), 1) : today;
}

export function startDateError(start, today = vnToday()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? "")) return "Vui lòng chọn ngày bắt đầu";
  if (start < today) return "Ngày bắt đầu không được ở quá khứ";
  return null;
}

// Trạng thái hiển thị: "active" nhưng quá end_date => "expired" (CSDL vẫn lưu "active"; backend trả is_expired)
export const policyView = (p) => (p.is_expired ? "expired" : p.status);

export function decoratePolicy(p, today = vnToday()) {
  if (!p) return p;            // không tìm thấy: để trang hiện thông báo lỗi thay vì dữ liệu rỗng
  const expired = Boolean(p.is_expired);
  const left = p.status === "active" ? Math.round((Date.parse(p.end_date) - Date.parse(today)) / 86400000) : null;
  return { ...p, expired, viewState: policyView(p), daysLeft: left, canPay: p.status === "pending_payment", canCancel: p.status === "pending_payment",
    expiringSoon: p.status === "active" && !expired && left <= 30 };
}

export const POLICY_TABS = [
  { key: "all", label: "Tất cả" }, { key: "active", label: "Đang hiệu lực" }, { key: "pending", label: "Chờ thanh toán" },
  { key: "expired", label: "Hết hạn" }, { key: "cancelled", label: "Đã hủy" },
];
export const matchPolicyTab = {
  all: () => true,
  active: (p) => p.status === "active" && !p.expired,
  pending: (p) => p.status === "pending_payment",
  expired: (p) => p.expired,
  cancelled: (p) => p.status === "cancelled",
};
