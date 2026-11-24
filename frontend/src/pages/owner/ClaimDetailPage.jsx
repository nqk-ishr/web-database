import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useClaim, useSupplementClaim, useWithdrawClaim } from "../../hooks/useClaims";
import AttachmentPanel from "../../components/domain/AttachmentPanel";
import ClaimSteps from "../../components/domain/ClaimSteps";
import StatusBadge from "../../components/domain/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { CLAIM_STATUS, CLAIM_TYPE } from "../../constants/status";
import { dateTime, money } from "../../utils/format";

export default function ClaimDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: c, isLoading, error, refetch } = useClaim(id);
  const supplement = useSupplementClaim();
  const withdraw = useWithdrawClaim();
  const [dialog, setDialog] = useState(null);       // "supplement" | "withdraw"
  if (isLoading) return <Loading />;
  if (error || !c) return <ErrorBox error={error ?? new Error("Không tìm thấy yêu cầu")} onRetry={refetch} />;

  const close = () => setDialog(null);
  const done = (msg) => ({ onSuccess: () => { toast.success(msg); close(); }, onError: (x) => { toast.error(x); close(); } });
  const doSupplement = (description) => supplement.mutate({ id: c.claim_id, description }, done("Đã gửi bổ sung. Công ty bảo hiểm sẽ thẩm định tiếp."));
  const doWithdraw = (reason) => withdraw.mutate({ id: c.claim_id, reason }, done("Đã rút yêu cầu bồi thường"));
  const theft = c.claim_type === "theft";

  return (
    <>
      <div><p className="muted"><Link to="/claims">Yêu cầu bồi thường</Link> /</p>
        <h1>{theft ? "Mất cắp" : "Tai nạn"} · {c.plate_number} <StatusBadge map={CLAIM_STATUS} status={c.status} /></h1></div>
      <ClaimSteps status={c.status} />

      {c.status === "needs_more_info" && (
        <div className="card warn" role="status"><b>Công ty bảo hiểm yêu cầu bổ sung:</b> {c.review_note ?? "(không có ghi chú)"}
          <p className="muted">Thêm giấy tờ ở mục “Tệp đính kèm” (nếu cần) rồi bấm “Gửi bổ sung”.</p></div>
      )}
      {c.status === "rejected" && <div className="card bad" role="status"><b>Yêu cầu bị từ chối:</b> {c.review_note ?? "(không có lý do)"}</div>}
      {c.status === "approved" && (
        <div className="card ok" role="status"><b>Yêu cầu đã được duyệt {money(c.approved_amount)}.</b> Công ty bảo hiểm sẽ chi trả.{c.review_note && ` Ghi chú: ${c.review_note}`}</div>
      )}
      {c.status === "paid" && <div className="card ok" role="status"><b>Đã chi trả {money(c.approved_amount)}</b> ngày {dateTime(c.paid_at)}.</div>}
      {c.status === "cancelled" && <div className="card" role="status">Yêu cầu đã bị hủy{c.cancel_reason ? `: ${c.cancel_reason}` : "."}</div>}
      {theft && ["approved", "paid"].includes(c.status) && (
        <div className="card warn" role="status">Xe <b>{c.plate_number}</b> đã được chuyển sang trạng thái <b>Báo mất</b>. Nếu tìm thấy xe, hãy liên hệ cơ quan đăng ký để cập nhật.
          {" "}<Link to={`/vehicles/${c.vehicle_id}`}>Xem xe</Link></div>
      )}

      <div className="grid">
        <section className="card"><h2>Sự việc</h2>
          <dl className="kv">
            <dt>Loại</dt><dd><StatusBadge map={CLAIM_TYPE} status={c.claim_type} /></dd>
            <dt>Thời điểm</dt><dd>{dateTime(c.event_time)}</dd>
            <dt>Địa điểm</dt><dd>{c.event_location}</dd>
            <dt>Mô tả</dt><dd>{c.description ?? "–"}</dd>
            <dt>Ngày gửi</dt><dd>{dateTime(c.created_at)}</dd>
            <dt>Cập nhật gần nhất</dt><dd>{dateTime(c.updated_at)}</dd>
          </dl>
        </section>
        <section className="card"><h2>Số tiền và hợp đồng</h2>
          <dl className="kv">
            <dt>Đề nghị</dt><dd>{money(c.requested_amount)}</dd>
            <dt>Được duyệt</dt><dd>{c.approved_amount == null ? "Chưa có" : money(c.approved_amount)}</dd>
            <dt>Công ty bảo hiểm</dt><dd>{c.insurer}</dd>
            <dt>Hợp đồng</dt><dd><Link to={`/insurance/${c.policy_id}`}>{c.product_name}{c.certificate_code && ` · ${c.certificate_code}`}</Link></dd>
            <dt>Hạn mức</dt><dd>{money(c.liability_limit)}</dd>
            {c.reviewer_name && <><dt>Người thẩm định</dt><dd>{c.reviewer_name}</dd></>}
          </dl>
        </section>
        {(c.canSupplement || c.canWithdraw) && (
          <section className="card"><h2>Thao tác</h2>
            {c.canSupplement && <button className="btn" type="button" onClick={() => setDialog("supplement")}>Gửi bổ sung</button>}
            {c.canWithdraw && <button className="btn btn2" type="button" onClick={() => setDialog("withdraw")}>Rút yêu cầu</button>}
          </section>
        )}
      </div>

      <AttachmentPanel kind="claims" parentId={c.claim_id} canEdit={c.canEditFiles} />

      {dialog === "supplement" && (
        <ConfirmDialog open title="Gửi bổ sung" confirmText="Gửi bổ sung" busy={supplement.isPending}
          message="Yêu cầu sẽ quay lại trạng thái chờ thẩm định. Nội dung bên dưới (nếu có) sẽ thay thế mô tả sự việc."
          note={{ label: "Mô tả cập nhật (không bắt buộc)", required: false, maxLength: 1000 }} onCancel={close} onConfirm={doSupplement} />
      )}
      {dialog === "withdraw" && (
        <ConfirmDialog open title="Rút yêu cầu bồi thường" danger confirmText="Rút yêu cầu" busy={withdraw.isPending}
          message="Yêu cầu sẽ bị hủy và không được thẩm định nữa. Bạn có thể gửi yêu cầu mới nếu còn trong thời hạn hợp đồng."
          note={{ label: "Lý do (không bắt buộc)", required: false }} onCancel={close} onConfirm={doWithdraw} />
      )}
    </>
  );
}
