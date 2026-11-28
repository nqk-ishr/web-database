import { dayDiff, vnToday, date } from "../../utils/format";

// Số ngày còn lại của hợp đồng (âm = đã hết hạn). Hợp đồng "active" nhưng quá end_date vẫn có status "active" trong CSDL.
export const policyDaysLeft = (policy) => (policy ? dayDiff(vnToday(), policy.end_date) : null);
export const policyState = (policy) =>
  policy && policy.status === "active" && policyDaysLeft(policy) < 0 ? "expired" : policy?.status;

// Dòng tóm tắt bảo hiểm ở thẻ xe
export default function PolicyLine({ policy }) {
  if (!policy) return <p className="muted">Bảo hiểm: chưa có hợp đồng</p>;
  const left = policyDaysLeft(policy);
  if (policy.status === "pending_payment") return <p className="muted">Bảo hiểm: <b className="warn-text">đang chờ thanh toán</b></p>;
  if (left < 0) return <p className="muted">Bảo hiểm: <b className="bad-text">đã hết hạn ngày {date(policy.end_date)}</b></p>;
  if (left <= 30) return <p className="muted">Bảo hiểm: <b className="warn-text">hết hạn sau {left} ngày</b></p>;
  return <p className="muted">Bảo hiểm: hiệu lực đến {date(policy.end_date)}</p>;
}
