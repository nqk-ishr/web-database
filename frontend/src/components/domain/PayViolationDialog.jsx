import { useState } from "react";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { usePayViolation } from "../../hooks/useViolations";
import { amountDue } from "../../utils/violations";
import { money } from "../../utils/format";

/**
 * Hộp thoại nộp phạt. Render có điều kiện ({target && <PayViolationDialog violation={target} .../>})
 * để mỗi lần mở là trạng thái mới. Số tiền lấy từ backend (fine_amount + late_fee).
 */
export default function PayViolationDialog({ violation: v, onClose }) {
  const toast = useToast();
  const pay = usePayViolation();
  const [simulateFail, setSimulateFail] = useState(false);

  const confirm = () => pay.mutate({ id: v.violation_id, simulate_fail: simulateFail }, {
    onSuccess: (r) => {
      if (r.status === "success") { toast.success(`Nộp phạt thành công. Mã giao dịch ${r.gateway_ref}`); onClose(); }
      else toast.error("Thanh toán thất bại, vi phạm vẫn chưa được nộp. Vui lòng thử lại.");   // giữ hộp thoại để thử lại
    },
    onError: (e) => { toast.error(e); onClose(); },     // vd. 409 "đã nộp" (danh sách được làm mới)
  });

  return (
    <ConfirmDialog open title="Nộp phạt" confirmText={`Thanh toán ${money(amountDue(v))}`} busy={pay.isPending}
      message={`Vi phạm “${v.type}” của xe ${v.plate_number}.`} onCancel={onClose} onConfirm={confirm}>
      <dl className="kv">
        <dt>Tiền phạt</dt><dd>{money(v.fine_amount)}</dd>
        <dt>Phạt trễ hạn</dt><dd>{money(v.late_fee)}</dd>
        <dt>Tổng cộng</dt><dd><b>{money(amountDue(v))}</b></dd>
      </dl>
      {import.meta.env.DEV && (
        <label className="check"><input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} />
          Mô phỏng cổng thanh toán lỗi (chỉ có khi chạy dev, để demo rollback)</label>
      )}
    </ConfirmDialog>
  );
}
