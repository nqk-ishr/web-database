import { useParams } from "react-router-dom";
import { useVehicle, useOwnership } from "../../hooks/useVehicles";
import StatusBadge from "../../components/domain/StatusBadge";
import OwnershipTimeline from "../../components/domain/OwnershipTimeline";
import { Loading, ErrorBox } from "../../components/feedback/State";
import { VEHICLE_STATUS, POLICY_STATUS } from "../../constants/status";
import { money, date } from "../../utils/format";

export default function VehicleDetailPage() {
  const { id } = useParams();
  const { data: v, isLoading, error, refetch } = useVehicle(id);
  const { data: owners = [] } = useOwnership(id);
  if (isLoading) return <Loading />;
  if (error || !v) return <ErrorBox error={error ?? new Error("Không tìm thấy xe")} onRetry={refetch} />;

  // Nút khóa theo trạng thái xe và nợ phạt; luôn kèm lý do
  const blocked = v.status !== "normal" ? `Xe đang ở trạng thái ${VEHICLE_STATUS[v.status].label}, không thực hiện được thao tác này.` : null;
  const transferBlock = blocked ?? (v.unpaid_violations > 0 ? "Còn vi phạm chưa nộp phạt: nộp xong mới sang tên được." : null);
  const p = v.policy;
  return (
    <>
      <div><p className="muted">Xe của tôi /</p>
        <h1><span className="plate big">{v.plate_number}</span> <StatusBadge map={VEHICLE_STATUS} status={v.status} /></h1></div>
      <div className="grid">
        <section className="card"><h2>Thông tin xe</h2>
          <p className="muted">Loại xe</p><p>{v.vehicle_type}</p>
          <p className="muted">Số khung / số máy</p><p>{v.chassis_number} / {v.engine_number}</p>
          <p className="muted">Năm sản xuất</p><p>{v.manufacture_year}</p></section>
        <section className="card"><h2>Hành động</h2>
          <button className="btn" type="button" disabled={!!transferBlock}>Sang tên xe</button>
          <button className="btn btn2" type="button" disabled={!!blocked}>Mua hoặc gia hạn bảo hiểm</button>
          <button className="btn btn2" type="button" disabled={!p}>Gửi yêu cầu bồi thường</button>
          {transferBlock && <p className="muted">{transferBlock}</p>}</section>
        <section className="card"><h2>Bảo hiểm trách nhiệm dân sự</h2>
          {p ? (<><StatusBadge map={POLICY_STATUS} status={p.status} /><p>Gói {p.product_name}{p.includes_theft && ", có quyền lợi mất cắp"}</p>
            <p className="muted">{date(p.start_date)} – {date(p.end_date)} · Hạn mức {money(p.liability_limit)}</p></>)
            : <p className="muted">Xe chưa có hợp đồng bảo hiểm.</p>}</section>
      </div>
      <section className="card"><h2>Lịch sử chủ sở hữu</h2><OwnershipTimeline items={owners} /></section>
    </>
  );
}
