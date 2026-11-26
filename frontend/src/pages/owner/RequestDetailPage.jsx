import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useConfirmTransfer, useDeclineTransfer, useRequest, useResubmit, useWithdraw } from "../../hooks/useRequests";
import AttachmentPanel from "../../components/domain/AttachmentPanel";
import EventTimeline from "../../components/domain/EventTimeline";
import StatusBadge from "../../components/domain/StatusBadge";
import TransferSteps from "../../components/domain/TransferSteps";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { REQUEST_STATUS, REQUEST_TYPE } from "../../constants/status";
import { canEditFiles, canResubmit, canWithdraw, myRole, vehicleLabel, waitingForMe } from "../../utils/requests";
import { dateTime } from "../../utils/format";

export default function RequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: r, isLoading, error, refetch } = useRequest(id);
  const resubmit = useResubmit();
  const withdraw = useWithdraw();
  const confirmT = useConfirmTransfer();
  const declineT = useDeclineTransfer();
  const [dialog, setDialog] = useState(null);       // "withdraw" | "confirm" | "decline"
  if (isLoading) return <Loading />;
  if (error || !r) return <ErrorBox error={error ?? new Error("Không tìm thấy hồ sơ")} onRetry={refetch} />;

  const uid = user.user_id;
  const isTransfer = r.request_type === "transfer";
  const close = () => setDialog(null);
  const done = (msg) => ({ onSuccess: () => { toast.success(msg); close(); }, onError: (x) => { toast.error(x); close(); } });
  const doResubmit = () => resubmit.mutate(r.request_id, { onSuccess: () => toast.success("Đã gửi lại hồ sơ cho cán bộ"), onError: (x) => toast.error(x) });
  const doWithdraw = (reason) => withdraw.mutate({ id: r.request_id, reason }, done("Đã rút hồ sơ"));
  const doConfirm = () => confirmT.mutate(r.request_id, done("Đã xác nhận. Hồ sơ chuyển sang cán bộ duyệt."));
  const doDecline = () => declineT.mutate(r.request_id, done("Đã từ chối nhận xe. Hồ sơ đã bị hủy."));
  const asSeller = isTransfer && myRole(r, uid) === "requester";

  return (
    <>
      <div><p className="muted"><Link to="/requests">Hồ sơ của tôi</Link> /</p>
        <h1>{isTransfer ? "Sang tên" : "Đăng ký xe mới"} · {vehicleLabel(r)} <StatusBadge map={REQUEST_STATUS} status={r.status} /></h1></div>
      {isTransfer && <TransferSteps status={r.status} />}

      {r.status === "needs_more_info" && (
        <div className="card warn" role="status"><b>Cán bộ yêu cầu bổ sung:</b> {r.review_note ?? "(không có ghi chú)"}
          {canResubmit(r, uid) && <p className="muted">Hãy thêm giấy tờ ở mục “Tệp đính kèm” rồi bấm “Gửi lại hồ sơ”.</p>}</div>
      )}
      {r.status === "rejected" && <div className="card bad" role="status"><b>Hồ sơ bị từ chối:</b> {r.review_note ?? "(không có lý do)"}</div>}
      {r.status === "cancelled" && isTransfer && <div className="card" role="status">Hồ sơ đã bị hủy{r.cancel_reason ? `: ${r.cancel_reason}` : "."}</div>}
      {waitingForMe(r, uid) && (
        <div className="card alert" role="status">
          <p><b>{r.requester_name} muốn chuyển nhượng xe {r.plate_number} cho bạn.</b> Chỉ xác nhận khi bạn đã thỏa thuận với người bán.</p>
          <div className="row" style={{ justifyContent: "flex-start", gap: 8 }}>
            <button className="btn" type="button" onClick={() => setDialog("confirm")}>Xác nhận nhận xe</button>
            <button className="btn btn2" type="button" onClick={() => setDialog("decline")}>Từ chối</button>
          </div>
        </div>
      )}
      {asSeller && r.unpaid_violations > 0 && ["pending_confirmation", "pending_approval"].includes(r.status) && (
        <div className="card warn" role="status">Xe đang có <b>{r.unpaid_violations} vi phạm chưa hoàn tất</b>. Cán bộ sẽ không duyệt sang tên cho tới khi xử lý xong.
          {" "}<Link to={`/violations?vehicle_id=${r.vehicle_id}`}>Xem vi phạm</Link></div>
      )}

      <div className="grid">
        <section className="card"><h2>Thông tin hồ sơ</h2>
          <dl className="kv">
            <dt>Loại hồ sơ</dt><dd><StatusBadge map={REQUEST_TYPE} status={r.request_type} /></dd>
            <dt>Ngày gửi</dt><dd>{dateTime(r.submitted_at)}</dd>
            <dt>Cập nhật gần nhất</dt><dd>{dateTime(r.updated_at)}</dd>
            {r.reviewer_name && <><dt>Cán bộ xử lý</dt><dd>{r.reviewer_name}</dd></>}
            <dt>Vai trò của bạn</dt><dd>{myRole(r, uid) === "buyer" ? "Bên mua" : isTransfer ? "Bên bán" : "Người gửi"}</dd>
          </dl>
        </section>
        <section className="card"><h2>{isTransfer ? "Chuyển nhượng" : "Thông tin xe khai báo"}</h2>
          {isTransfer ? (
            <dl className="kv">
              <dt>Biển số</dt><dd>{r.plate_number}</dd>
              <dt>Bên bán</dt><dd>{r.requester_name}</dd>
              <dt>Bên mua</dt><dd>{r.buyer_name}</dd>
              {r.unpaid_violations > 0 && <><dt>Vi phạm chưa hoàn tất</dt><dd><span className="badge bad">{r.unpaid_violations}</span></dd></>}
            </dl>
          ) : (
            <dl className="kv">
              <dt>Loại xe</dt><dd>{r.declared_vehicle_type}</dd>
              <dt>Số khung</dt><dd>{r.declared_chassis_number}</dd>
              <dt>Số máy</dt><dd>{r.declared_engine_number}</dd>
              <dt>Năm sản xuất</dt><dd>{r.declared_manufacture_year}</dd>
              <dt>Biển số</dt><dd>{r.plate_number ?? "Chưa cấp"}</dd>
            </dl>
          )}
          {r.vehicle_id && r.status === "approved" && <Link className="btn btn2" to={`/vehicles/${r.vehicle_id}`}>Xem xe</Link>}
        </section>
        {(canResubmit(r, uid) || canWithdraw(r, uid)) && (
          <section className="card"><h2>Thao tác</h2>
            {canResubmit(r, uid) && <button className="btn" type="button" disabled={resubmit.isPending} onClick={doResubmit}>{resubmit.isPending ? "Đang gửi…" : "Gửi lại hồ sơ"}</button>}
            {canWithdraw(r, uid) && <button className="btn btn2" type="button" onClick={() => setDialog("withdraw")}>Rút hồ sơ</button>}
          </section>
        )}
      </div>

      {(!isTransfer || asSeller) && <AttachmentPanel kind="requests" parentId={r.request_id} canEdit={canEditFiles(r, uid)} />}
      {r.history?.length > 0 && <section className="card"><h2>Lịch sử xử lý</h2><EventTimeline items={r.history} /></section>}

      {dialog === "withdraw" && (
        <ConfirmDialog open title="Rút hồ sơ" danger confirmText="Rút hồ sơ" busy={withdraw.isPending}
          message={isTransfer ? "Hồ sơ sang tên sẽ bị hủy, quyền sở hữu xe không thay đổi." : "Hồ sơ sẽ bị hủy và không được xử lý nữa. Bạn có thể gửi hồ sơ mới sau."}
          note={{ label: "Lý do (không bắt buộc)", required: false }} onCancel={close} onConfirm={doWithdraw} />
      )}
      {dialog === "confirm" && (
        <ConfirmDialog open title="Xác nhận nhận xe" confirmText="Xác nhận" busy={confirmT.isPending}
          message={`Bạn đồng ý nhận xe ${r.plate_number} từ ${r.requester_name}? Hồ sơ sẽ chuyển sang cán bộ đăng ký để duyệt.`}
          onCancel={close} onConfirm={doConfirm} />
      )}
      {dialog === "decline" && (
        <ConfirmDialog open title="Từ chối nhận xe" danger confirmText="Từ chối" busy={declineT.isPending}
          message={`Hồ sơ sang tên xe ${r.plate_number} sẽ bị hủy. Người bán có thể gửi lại nếu cần.`}
          onCancel={close} onConfirm={doDecline} />
      )}
    </>
  );
}
