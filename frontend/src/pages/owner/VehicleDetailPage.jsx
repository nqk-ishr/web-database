import { Link, useParams } from "react-router-dom";
import { useVehicle, useOwnership, useVehicleHistory } from "../../hooks/useVehicles";
import { useMyRequests } from "../../hooks/useRequests";
import StatusBadge from "../../components/domain/StatusBadge";
import OwnershipTimeline from "../../components/domain/OwnershipTimeline";
import EventTimeline from "../../components/domain/EventTimeline";
import { policyState } from "../../components/domain/PolicyLine";
import { Loading, ErrorBox } from "../../components/feedback/State";
import { VEHICLE_STATUS, POLICY_STATUS } from "../../constants/status";
import { openRequestFor, transferBlockReason } from "../../utils/requests";
import { money, date } from "../../utils/format";

export default function VehicleDetailPage() {
  const { id } = useParams();
  const { data: v, isLoading, error, refetch } = useVehicle(id);
  const { data: owners = [] } = useOwnership(id);
  const { data: events = [] } = useVehicleHistory(id);
  const { data: requests } = useMyRequests();
  if (isLoading) return <Loading />;
  if (error || !v) return <ErrorBox error={error ?? new Error("Không tìm thấy xe")} onRetry={refetch} />;

  // Nút khóa theo trạng thái xe và nợ phạt; luôn kèm lý do
  const blocked = v.status !== "normal" ? `Xe đang ở trạng thái ${VEHICLE_STATUS[v.status]?.label ?? v.status}, không thực hiện được thao tác này.` : null;
  const openReq = openRequestFor(requests, v.vehicle_id);
  const transferBlock = transferBlockReason(v) ?? (openReq ? "Xe đang có một hồ sơ chưa xử lý xong." : null);
  const p = v.policy;
  return (
    <>
      <div><p className="muted"><Link to="/">Xe của tôi</Link> /</p>
        <h1><span className="plate big">{v.plate_number}</span> <StatusBadge map={VEHICLE_STATUS} status={v.status} /></h1></div>
      <div className="grid">
        <section className="card"><h2>Thông tin xe</h2>
          <dl className="kv">
            <dt>Loại xe</dt><dd>{v.vehicle_type}</dd>
            <dt>Số khung</dt><dd>{v.chassis_number}</dd>
            <dt>Số máy</dt><dd>{v.engine_number}</dd>
            <dt>Năm sản xuất</dt><dd>{v.manufacture_year}</dd>
          </dl>
          {v.unpaid_violations > 0 && <p><Link to={`/violations?vehicle_id=${v.vehicle_id}`}><span className="badge bad">{v.unpaid_violations} vi phạm chưa nộp</span></Link></p>}
        </section>
        <section className="card"><h2>Hành động</h2>
          {transferBlock
            ? <button className="btn" type="button" disabled>Sang tên xe</button>
            : <Link className="btn" to={`/transfer/${v.vehicle_id}`}>Sang tên xe</Link>}
          {blocked
            ? <button className="btn btn2" type="button" disabled>Mua hoặc gia hạn bảo hiểm</button>
            : <Link className="btn btn2" to={`/insurance/buy?vehicle_id=${v.vehicle_id}`}>Mua hoặc gia hạn bảo hiểm</Link>}
          {p && p.status === "active" && policyState(p) === "active"
            ? <Link className="btn btn2" to={`/claims/new?policy_id=${p.policy_id}`}>Gửi yêu cầu bồi thường</Link>
            : <button className="btn btn2" type="button" disabled title="Cần có hợp đồng bảo hiểm đang hiệu lực">Gửi yêu cầu bồi thường</button>}
          {transferBlock && <p className="muted">{transferBlock}{openReq && <> <Link to={`/requests/${openReq.request_id}`}>Xem hồ sơ</Link></>}</p>}
        </section>
        <section className="card"><h2>Bảo hiểm trách nhiệm dân sự</h2>
          {p ? (
            <>
              <StatusBadge map={POLICY_STATUS} status={policyState(p)} />
              <p>Gói {p.product_name}{p.includes_theft && ", có quyền lợi mất cắp"}</p>
              <p className="muted">{date(p.start_date)} – {date(p.end_date)} · Hạn mức {money(p.liability_limit)}</p>
              {p.policy_id && <Link className="btn btn2" to={`/insurance/${p.policy_id}`}>Xem hợp đồng</Link>}
            </>
          ) : <p className="muted">Xe chưa có hợp đồng bảo hiểm.</p>}
        </section>
      </div>
      <div className="grid">
        <section className="card"><h2>Lịch sử chủ sở hữu</h2><OwnershipTimeline items={owners} /></section>
        <section className="card"><h2>Lịch sử sự kiện</h2><EventTimeline items={events} /></section>
      </div>
    </>
  );
}
