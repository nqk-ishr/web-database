import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { VEHICLE_STATUS } from "../../constants/status";
import { daysBetween, date } from "../../utils/format";

export default function VehicleCard({ v }) {
  const left = v.policy ? daysBetween(new Date(), v.policy.end_date) : null;
  return (
    <article className="card">
      <div className="row"><span className="plate">{v.plate_number}</span><StatusBadge map={VEHICLE_STATUS} status={v.status} /></div>
      <p className="muted">{v.vehicle_type} · Sản xuất {v.manufacture_year}</p>
      {v.status === "normal" && (v.unpaid_violations > 0
        ? <p><span className="badge bad">{v.unpaid_violations} vi phạm chưa nộp</span></p>
        : <p><span className="badge ok">Không có vi phạm</span></p>)}
      {v.status === "stolen" && <p className="muted">Đã duyệt bồi thường mất cắp. Chờ cơ quan đăng ký xử lý.</p>}
      {v.policy && <p className="muted">Bảo hiểm: {left >= 0 && left <= 30 ? <b className="warn-text">hết hạn sau {left} ngày</b> : `hiệu lực đến ${date(v.policy.end_date)}`}</p>}
      <Link className="btn btn2" to={`/vehicles/${v.vehicle_id}`}>Chi tiết</Link>
    </article>
  );
}
