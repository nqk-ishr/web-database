import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useOwnership, useRevokeVehicle, useVehicle, useVehicleFound, useVehicleHistory } from "../../hooks/useStaff";
import EventTimeline from "../../components/domain/EventTimeline";
import OwnershipTimeline from "../../components/domain/OwnershipTimeline";
import StatusBadge from "../../components/domain/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { POLICY_STATUS, VEHICLE_STATUS } from "../../constants/status";
import { ROLES } from "../../constants/roles";
import { date } from "../../utils/format";

// Hồ sơ một xe phía quản lý: thông tin, chủ sở hữu, lịch sử; xe Báo mất thì cán bộ đăng ký ghi nhận tìm thấy / thu hồi.
export default function VehicleRecordPage({ base = "/registrar/vehicles" }) {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const v = useVehicle(id);
  const owners = useOwnership(id);
  const history = useVehicleHistory(id);
  const found = useVehicleFound();
  const revoke = useRevokeVehicle();
  const [dialog, setDialog] = useState(null);       // "found" | "revoke"
  if (v.isLoading) return <Loading />;
  if (v.error || !v.data) return <ErrorBox error={v.error ?? new Error("Không tìm thấy xe")} onRetry={v.refetch} />;

  const x = v.data;
  const close = () => setDialog(null);
  const done = (msg) => ({ onSuccess: () => { toast.success(msg); close(); }, onError: (e) => { toast.error(e); close(); } });
  const canHandleStolen = user.role === ROLES.REGISTRAR && x.status === "stolen";

  return (
    <>
      <div><p className="muted"><Link to={base}>Tra cứu xe</Link> /</p>
        <h1><span className="plate">{x.plate_number}</span> <StatusBadge map={VEHICLE_STATUS} status={x.status} /></h1></div>

      {canHandleStolen && (
        <div className="card warn" role="status">
          <p>Xe đang <b>Báo mất</b> sau khi duyệt bồi thường mất cắp. Hồ sơ mới và hợp đồng mới bị chặn cho tới khi xử lý.</p>
          <div className="row" style={{ justifyContent: "flex-start", gap: 8 }}>
            <button className="btn" type="button" onClick={() => setDialog("found")}>Ghi nhận tìm thấy</button>
            <button className="btn btn2" type="button" onClick={() => setDialog("revoke")}>Thu hồi đăng ký</button>
          </div>
        </div>
      )}
      {x.status === "revoked" && <div className="card bad" role="status">Đăng ký và biển số của xe đã bị thu hồi (trạng thái cuối).</div>}

      <div className="grid">
        <section className="card"><h2>Thông tin xe</h2>
          <dl className="kv">
            <dt>Loại xe</dt><dd>{x.vehicle_type}</dd>
            <dt>Năm sản xuất</dt><dd>{x.manufacture_year}</dd>
            <dt>Số khung</dt><dd>{x.chassis_number}</dd>
            <dt>Số máy</dt><dd>{x.engine_number}</dd>
            <dt>Chủ hiện hành</dt><dd>{x.current_owner ?? "–"}</dd>
            <dt>Vi phạm chưa nộp</dt><dd>{x.blocking_violations > 0 ? <span className="badge bad">{x.blocking_violations}</span> : "Không"}</dd>
          </dl>
        </section>
        <section className="card"><h2>Bảo hiểm TNDS</h2>
          {x.policy ? (
            <dl className="kv">
              <dt>Gói</dt><dd>{x.policy.product_name}</dd>
              <dt>Trạng thái</dt><dd><StatusBadge map={POLICY_STATUS} status={x.policy.status} /></dd>
              <dt>Hiệu lực</dt><dd>{date(x.policy.start_date)} – {date(x.policy.end_date)}</dd>
            </dl>
          ) : <p className="muted">Không có hợp đồng hiệu lực hoặc đang chờ thanh toán.</p>}
        </section>
        <section className="card"><h2>Chủ sở hữu</h2>
          {owners.isLoading ? <Loading /> : owners.error ? <ErrorBox error={owners.error} /> : <OwnershipTimeline items={owners.data ?? []} />}
        </section>
      </div>
      <section className="card"><h2>Lịch sử trạng thái</h2>
        {history.isLoading ? <Loading /> : history.error ? <ErrorBox error={history.error} /> : <EventTimeline items={history.data ?? []} />}
      </section>

      {dialog === "found" && (
        <ConfirmDialog open title="Ghi nhận xe tìm thấy" confirmText="Xác nhận" busy={found.isPending}
          message="Xe trở về Bình thường. Hồ sơ đã hủy trước đó không tự khôi phục; chủ xe nộp lại nếu cần."
          note={{ label: "Ghi chú (nơi tìm thấy, biên bản…)", required: true }} onCancel={close}
          onConfirm={(reason) => found.mutate({ id: x.vehicle_id, reason }, done("Đã ghi nhận xe tìm thấy"))} />
      )}
      {dialog === "revoke" && (
        <ConfirmDialog open title="Thu hồi đăng ký" danger confirmText="Thu hồi" busy={revoke.isPending}
          message="Thu hồi đăng ký và biển số là trạng thái cuối, không hoàn tác được."
          note={{ label: "Lý do thu hồi", required: true }} onCancel={close}
          onConfirm={(reason) => revoke.mutate({ id: x.vehicle_id, reason }, done("Đã thu hồi đăng ký xe"))} />
      )}
    </>
  );
}
