import { useState } from "react";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { usePayPolicy } from "../../hooks/usePolicies";
import { money, date } from "../../utils/format";

/** Thanh toán phí bảo hiểm. Render có điều kiện ({target && <PayPolicyDialog policy={target} .../>}). */
export default function PayPolicyDialog({ policy: p, onClose }) {
  const toast = useToast();
  const pay = usePayPolicy();
  const [simulateFail, setSimulateFail] = useState(false);

  const confirm = () => pay.mutate({ id: p.policy_id, simulate_fail: simulateFail }, {
    onSuccess: (r) => {
      if (r.status === "success") { toast.success(`Thanh toán thành công. Mã giấy chứng nhận ${r.certificate_code}`); onClose(); }
      else toast.error("Thanh toán thất bại, hợp đồng vẫn chưa có hiệu lực. Vui lòng thử lại.");   // giữ hộp thoại để thử lại
    },
    onError: (e) => { toast.error(e); onClose(); },     // vd. 409 chồng hiệu lực: backend đã hoàn tác giao dịch
  });

  return (
    <ConfirmDialog open title="Thanh toán phí bảo hiểm" confirmText={`Thanh toán ${money(p.premium)}`} busy={pay.isPending}
      message={`Hợp đồng ${p.product_name} cho xe ${p.plate_number}, hiệu lực ${date(p.start_date)} – ${date(p.end_date)}.`}
      onCancel={onClose} onConfirm={confirm}>
      <dl className="kv"><dt>Phí bảo hiểm</dt><dd><b>{money(p.premium)}</b></dd></dl>
      {import.meta.env.DEV && (
        <label className="check"><input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} />
          Mô phỏng cổng thanh toán lỗi (chỉ có khi chạy dev, để demo rollback)</label>
      )}
    </ConfirmDialog>
  );
}
