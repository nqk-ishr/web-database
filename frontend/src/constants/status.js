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
  cancelled: { label: "Đã hủy", tone: "info" },
};
export const FILTERS = [
  { key: "all", label: "Tất cả" }, { key: "unpaid", label: "Chưa nộp" },
  { key: "overdue", label: "Quá hạn" }, { key: "paid", label: "Đã nộp" },
];
