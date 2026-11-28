// Nguồn duy nhất: mã ENUM (khớp schema.sql) -> nhãn tiếng Việt + màu badge (ok|warn|bad|info)
export const VEHICLE_STATUS = {
  normal: { label: "Bình thường", tone: "ok" },
  stolen: { label: "Báo mất", tone: "bad" },
  revoked: { label: "Đã thu hồi", tone: "bad" },
};
export const VIOLATION_STATUS = {
  recorded: { label: "Mới ghi nhận", tone: "info" },
  verified: { label: "Đã xác minh", tone: "info" },
  notified: { label: "Đã thông báo", tone: "warn" },
  paid: { label: "Đã nộp phạt", tone: "ok" },
  cancelled: { label: "Đã hủy", tone: "info" },
};
export const POLICY_STATUS = {
  pending_payment: { label: "Chờ thanh toán", tone: "warn" },
  active: { label: "Hiệu lực", tone: "ok" },
  expired: { label: "Đã hết hạn", tone: "bad" },      // suy ra từ end_date, không phải giá trị trong CSDL
  cancelled: { label: "Đã hủy", tone: "info" },
};
export const REQUEST_STATUS = {
  pending_confirmation: { label: "Chờ bên mua xác nhận", tone: "warn" },
  pending_approval: { label: "Chờ cán bộ duyệt", tone: "info" },
  needs_more_info: { label: "Cần bổ sung", tone: "warn" },
  approved: { label: "Đã duyệt", tone: "ok" },
  rejected: { label: "Bị từ chối", tone: "bad" },
  cancelled: { label: "Đã hủy", tone: "info" },
};
export const REQUEST_TYPE = {
  new_registration: { label: "Đăng ký mới", tone: "info" },
  transfer: { label: "Sang tên", tone: "info" },
};
export const CLAIM_STATUS = {
  pending_review: { label: "Chờ thẩm định", tone: "warn" },
  needs_more_info: { label: "Cần bổ sung", tone: "warn" },
  approved: { label: "Đã duyệt", tone: "ok" },
  rejected: { label: "Bị từ chối", tone: "bad" },
  paid: { label: "Đã chi trả", tone: "ok" },
  cancelled: { label: "Đã hủy", tone: "info" },
};
export const CLAIM_TYPE = {
  accident: { label: "Tai nạn", tone: "info" },
  theft: { label: "Mất cắp", tone: "bad" },
};
export const PAYMENT_STATUS = {
  success: { label: "Thành công", tone: "ok" },
  failed: { label: "Thất bại", tone: "bad" },
  pending: { label: "Đang xử lý", tone: "warn" },
};
// Sự kiện trong lịch sử trạng thái xe (vehicle_status_history.event_type)
export const VEHICLE_EVENT = {
  registered: "Đăng ký mới",
  ownership_transferred: "Sang tên",
  reported_stolen: "Báo mất",
  found: "Tìm thấy xe",
  revoked: "Thu hồi",
};
export const FILTERS = [
  { key: "all", label: "Tất cả" }, { key: "unpaid", label: "Chưa nộp" },
  { key: "overdue", label: "Quá hạn" }, { key: "paid", label: "Đã nộp" },
];
