import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import PolicyLine from "./PolicyLine";
import { VEHICLE_STATUS } from "../../constants/status";

export default function VehicleCard({ v }) {
  return (
    <article className="card">
      <div className="row"><span className="plate">{v.plate_number}</span><StatusBadge map={VEHICLE_STATUS} status={v.status} /></div>
      <p className="muted">{v.vehicle_type} · Sản xuất {v.manufacture_year}</p>
      {v.status === "normal" && (v.unpaid_violations > 0
        ? <p><Link to={`/violations?vehicle_id=${v.vehicle_id}`}><span className="badge bad">{v.unpaid_violations} vi phạm chưa nộp</span></Link></p>
        : <p><span className="badge ok">Không có vi phạm chưa nộp</span></p>)}
      {v.status === "stolen" && <p className="muted">Xe đã được ghi nhận mất cắp. Chờ cơ quan đăng ký xử lý.</p>}
      {v.status === "revoked" && <p className="muted">Đăng ký xe đã bị thu hồi.</p>}
      <PolicyLine policy={v.policy} />
      <Link className="btn btn2" to={`/vehicles/${v.vehicle_id}`}>Chi tiết</Link>
    </article>
  );
}
