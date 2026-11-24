import StatusBadge from "./StatusBadge";
import { POLICY_STATUS } from "../../constants/status";

// Trạng thái hợp đồng; hợp đồng "Hiệu lực" quá hạn hiện là "Đã hết hạn", sắp hết hạn hiện kèm số ngày còn lại
export default function PolicyBadge({ p }) {
  return (
    <>
      <StatusBadge map={POLICY_STATUS} status={p.viewState} />
      {p.expiringSoon && <> <span className="badge warn">còn {p.daysLeft} ngày</span></>}
    </>
  );
}
