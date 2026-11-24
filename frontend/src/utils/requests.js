// Logic thuần của hồ sơ đăng ký / sang tên (dễ kiểm thử, không phụ thuộc React).
import { VEHICLE_STATUS } from "../constants/status";

export const OPEN = ["pending_confirmation", "pending_approval", "needs_more_info"];

export const REQUEST_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "open", label: "Đang xử lý" },
  { key: "info", label: "Cần bổ sung" },
  { key: "done", label: "Đã kết thúc" },
];
export const matchTab = {
  all: () => true,
  open: (r) => OPEN.includes(r.status),
  info: (r) => r.status === "needs_more_info",
  done: (r) => !OPEN.includes(r.status),
};

// Hồ sơ đăng ký mới chưa có biển số cho tới khi được duyệt
export const vehicleLabel = (r) => r.plate_number ?? (r.declared_chassis_number ? `Số khung ${r.declared_chassis_number}` : "–");
export const myRole = (r, userId) => (r.requester_id === userId ? "requester" : r.buyer_id === userId ? "buyer" : null);
const isRequester = (r, uid) => r.requester_id === uid;
export const canEditFiles = (r, uid) => isRequester(r, uid) && OPEN.includes(r.status);
export const canResubmit = (r, uid) => isRequester(r, uid) && r.status === "needs_more_info";
export const canWithdraw = (r, uid) => isRequester(r, uid) && OPEN.includes(r.status);
export const waitingForMe = (r, uid) => r.buyer_id === uid && r.status === "pending_confirmation";

// Khớp schemas/registration.py (NewRegistration)
export function validateRegistration(f, year = new Date().getFullYear()) {
  const e = {};
  if (!f.vehicle_type_id) e.vehicle_type_id = "Vui lòng chọn loại xe";
  for (const [key, label] of [["chassis_number", "số khung"], ["engine_number", "số máy"]]) {
    const v = String(f[key] ?? "").trim();
    if (!v) e[key] = `Vui lòng nhập ${label}`;
    else if (v.length > 30) e[key] = `Tối đa 30 ký tự`;
  }
  const y = Number(f.manufacture_year);
  if (!Number.isInteger(y) || y < 1950 || y > year + 1) e.manufacture_year = `Năm sản xuất từ 1950 đến ${year + 1}`;
  return e;
}

// Số khung/số máy chuẩn hóa chữ hoa để việc kiểm tra trùng của hệ thống không bị lọt vì khác hoa/thường
export const normalizeRegistration = (f) => ({
  vehicle_type_id: Number(f.vehicle_type_id),
  chassis_number: f.chassis_number.trim().toUpperCase(),
  engine_number: f.engine_number.trim().toUpperCase(),
  manufacture_year: Number(f.manufacture_year),
});

export const vehicleTypeLabel = (t) => (t.usage_purpose ? `${t.name} – ${t.usage_purpose}` : t.name);

// ---------- sang tên ----------
// Khớp backend (fn_assert_transfer_allowed): xe phải "Bình thường" và chủ không còn vi phạm đã xác minh/đã thông báo chưa nộp.
export function transferBlockReason(v) {
  if (v.status !== "normal") return `Xe đang ở trạng thái “${VEHICLE_STATUS[v.status]?.label ?? v.status}”, không sang tên được.`;
  if (v.blocking_violations > 0) {
    return `Xe còn ${v.blocking_violations} vi phạm chưa hoàn tất (chưa nộp phạt hoặc đang chờ quyết định xử phạt). Xử lý xong mới sang tên được.`;
  }
  return null;
}

// Mỗi xe chỉ có một hồ sơ mở tại một thời điểm (backend: uq_req_one_open_per_vehicle)
export const openRequestFor = (requests, vehicleId) =>
  (requests ?? []).find((r) => r.vehicle_id === vehicleId && OPEN.includes(r.status)) ?? null;

export const validateCitizenId = (s) => (/^[0-9]{9,12}$/.test(String(s).trim()) ? null : "CCCD/CMND gồm 9 đến 12 chữ số");

export const TRANSFER_STEPS = ["Gửi hồ sơ", "Bên mua xác nhận", "Cán bộ duyệt", "Hoàn tất"];
// Số bước đã hoàn thành (1..4); null nếu hồ sơ đã kết thúc không thành (bị từ chối / hủy)
export function transferProgress(status) {
  switch (status) {
    case "pending_confirmation": return 1;
    case "pending_approval":
    case "needs_more_info": return 2;
    case "approved": return 4;
    default: return null;
  }
}
