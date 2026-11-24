import { dayDiff, vnToday } from "./format";

// Thêm các trường tiện cho giao diện. "Quá hạn" và phạt trễ do BACKEND tính (is_overdue, late_fee),
// frontend không tự tính tiền để tránh lệch số với lúc thanh toán.
export function decorate(v, today = vnToday()) {
  if (!v) return v;
  const overdueDays = v.is_overdue && v.due_date ? Math.max(0, dayDiff(v.due_date, today)) : 0;
  return { ...v, overdueDays, isOverdue: Boolean(v.is_overdue), canPay: v.status === "notified" };
}

// GET /violations/{id} đặt tên trường khác với GET /violations/mine
export function normalizeDetail(d, today) {
  if (!d) return d;
  return decorate({ ...d, type: d.violation_type ?? d.type, plate_number: d.plate_number ?? d.plate_number_captured }, today);
}

export const amountDue = (v) => (v.fine_amount ?? 0) + (v.late_fee ?? 0);
