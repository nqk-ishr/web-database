import { TRANSFER_STEPS, transferProgress } from "../../utils/requests";

// Tiến trình sang tên: Gửi hồ sơ → Bên mua xác nhận → Cán bộ duyệt → Hoàn tất
export default function TransferSteps({ status }) {
  const done = transferProgress(status);
  if (done === null) return null;           // đã bị từ chối / hủy: không hiển thị tiến trình
  return (
    <ol className="steps" aria-label="Tiến trình sang tên">
      {TRANSFER_STEPS.map((label, i) => (
        <li key={label} className={i < done ? "done" : i === done ? "current" : undefined} aria-current={i === done ? "step" : undefined}>{label}</li>
      ))}
    </ol>
  );
}
