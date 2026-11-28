import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApproveRequest, useRejectRequest, useRequestDetail, useRequestMoreInfo } from "../../hooks/useStaff";
import AttachmentPanel from "../../components/domain/AttachmentPanel";
import EventTimeline from "../../components/domain/EventTimeline";
import StatusBadge from "../../components/domain/StatusBadge";
import FormDialog from "../../components/staff/FormDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { REQUEST_STATUS, REQUEST_TYPE } from "../../constants/status";
import { dateTime } from "../../utils/format";

// Biển số: chữ hoa, số, dấu gạch và dấu chấm (vd. 51K-123.45). CSDL chỉ kiểm tra viết hoa và không rỗng.
const PLATE = /^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3}\.?[0-9]{2}$/;

// Cán bộ đăng ký: xem và xử lý một hồ sơ (duyệt / từ chối / yêu cầu bổ sung)
export default function RequestReviewPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: r, isLoading, error, refetch } = useRequestDetail(id);
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const moreInfo = useRequestMoreInfo();
  const [dialog, setDialog] = useState(null);       // "approve" | "reject" | "info"
  const [plate, setPlate] = useState("");
  if (isLoading) return <Loading />;
  if (error || !r) return <ErrorBox error={error ?? new Error("Không tìm thấy hồ sơ")} onRetry={refetch} />;

  const isNew = r.request_type === "new_registration";
  const canDecide = r.status === "pending_approval";
  const blocked = !isNew && r.unpaid_violations > 0;
  const close = () => setDialog(null);
  const done = (msg) => ({ onSuccess: () => { toast.success(msg); close(); }, onError: (x) => { toast.error(x); close(); } });
  const plateOk = PLATE.test(plate.trim().toUpperCase());

  const doApprove = () => approve.mutate({ id: r.request_id, plate: isNew ? plate.trim().toUpperCase() : undefined },
    done(isNew ? `Đã duyệt và cấp biển số ${plate.trim().toUpperCase()}` : "Đã duyệt sang tên. Chủ sở hữu đã được cập nhật."));

  return (
    <>
      <div><p className="muted"><Link to="/registrar/requests">Hồ sơ</Link> /</p>
        <h1>Hồ sơ #{r.request_id} · <StatusBadge map={REQUEST_TYPE} status={r.request_type} /> <StatusBadge map={REQUEST_STATUS} status={r.status} /></h1></div>

      {r.status === "needs_more_info" && <div className="card warn" role="status"><p><b>Đã yêu cầu bổ sung:</b> {r.review_note}. Đang chờ chủ xe gửi lại.</p></div>}
      {r.status === "rejected" && <div className="card bad" role="status"><p><b>Đã từ chối:</b> {r.review_note}</p></div>}
      {r.status === "cancelled" && <div className="card" role="status">Hồ sơ đã hủy{r.cancel_reason ? `: ${r.cancel_reason}` : "."}</div>}
      {r.status === "pending_confirmation" && <div className="card" role="status">Đang chờ bên mua xác nhận; chưa đến lượt cán bộ duyệt.</div>}
      {blocked && ["pending_approval", "pending_confirmation"].includes(r.status) && (
        <div className="card bad" role="alert"><p>Xe còn <b>{r.unpaid_violations} vi phạm chưa nộp phạt</b> (Đã xác minh hoặc Đã thông báo).
          Hệ thống sẽ chặn duyệt sang tên cho tới khi bên bán nộp xong. Có thể từ chối hoặc yêu cầu bổ sung.</p></div>
      )}

      <div className="grid">
        <section className="card"><h2>Thông tin hồ sơ</h2>
          <dl className="kv">
            <dt>Người gửi</dt><dd>{r.requester_name}</dd>
            {!isNew && <><dt>Bên mua</dt><dd>{r.buyer_name}</dd></>}
            <dt>Ngày gửi</dt><dd>{dateTime(r.submitted_at)}</dd>
            <dt>Cập nhật</dt><dd>{dateTime(r.updated_at)}</dd>
            {r.reviewer_name && <><dt>Cán bộ xử lý</dt><dd>{r.reviewer_name}</dd></>}
          </dl>
        </section>
        <section className="card"><h2>{isNew ? "Thông tin xe kê khai" : "Xe chuyển nhượng"}</h2>
          <dl className="kv">
            {isNew ? (
              <>
                <dt>Loại xe</dt><dd>{r.declared_vehicle_type}</dd>
                <dt>Số khung</dt><dd>{r.declared_chassis_number}</dd>
                <dt>Số máy</dt><dd>{r.declared_engine_number}</dd>
                <dt>Năm sản xuất</dt><dd>{r.declared_manufacture_year}</dd>
                <dt>Biển số</dt><dd>{r.plate_number ?? "Chưa cấp"}</dd>
              </>
            ) : (
              <>
                <dt>Biển số</dt><dd>{r.plate_number}</dd>
                <dt>Vi phạm chưa nộp</dt><dd>{r.unpaid_violations > 0 ? <span className="badge bad">{r.unpaid_violations}</span> : "Không"}</dd>
              </>
            )}
          </dl>
          {r.vehicle_id && <Link className="btn btn2 sm" to={`/registrar/vehicles/${r.vehicle_id}`}>Xem xe</Link>}
        </section>
        {canDecide && (
          <section className="card"><h2>Xử lý</h2>
            <button className="btn" type="button" onClick={() => { setPlate(""); setDialog("approve"); }}>
              {isNew ? "Duyệt và cấp biển số" : "Duyệt sang tên"}</button>
            <button className="btn btn2" type="button" onClick={() => setDialog("info")}>Yêu cầu bổ sung</button>
            <button className="btn btn2" type="button" onClick={() => setDialog("reject")}>Từ chối</button>
          </section>
        )}
      </div>

      <AttachmentPanel kind="requests" parentId={r.request_id} canEdit={false} />
      {r.history?.length > 0 && <section className="card"><h2>Lịch sử xe từ hồ sơ này</h2><EventTimeline items={r.history} /></section>}

      {dialog === "approve" && isNew && (
        <FormDialog title="Duyệt đăng ký mới" submitText="Duyệt và cấp biển số" busy={approve.isPending} disabled={!plateOk}
          onSubmit={doApprove} onCancel={close}>
          <p>Hệ thống sẽ tạo xe, ghi chủ sở hữu đầu tiên là <b>{r.requester_name}</b> và ghi lịch sử đăng ký trong cùng một giao dịch.</p>
          <Field label="Biển số cấp" hint="Ví dụ: 51K-123.45" error={plate && !plateOk ? "Biển số không đúng định dạng" : undefined}>
            <input autoFocus value={plate} maxLength={15} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
          </Field>
        </FormDialog>
      )}
      {dialog === "approve" && !isNew && (
        <ConfirmDialog open title="Duyệt sang tên" confirmText="Duyệt" busy={approve.isPending}
          message={`Kết thúc quyền sở hữu của ${r.requester_name} và mở quyền sở hữu cho ${r.buyer_name} đối với xe ${r.plate_number}. Hệ thống kiểm tra lại nợ phạt và trạng thái xe khi duyệt.`}
          onCancel={close} onConfirm={doApprove} />
      )}
      {dialog === "info" && (
        <ConfirmDialog open title="Yêu cầu bổ sung" confirmText="Gửi yêu cầu" busy={moreInfo.isPending}
          message="Hồ sơ chuyển sang Cần bổ sung; chủ xe bổ sung giấy tờ rồi gửi lại."
          note={{ label: "Nội dung cần bổ sung", required: true }} onCancel={close}
          onConfirm={(note) => moreInfo.mutate({ id: r.request_id, note }, done("Đã gửi yêu cầu bổ sung"))} />
      )}
      {dialog === "reject" && (
        <ConfirmDialog open title="Từ chối hồ sơ" danger confirmText="Từ chối" busy={reject.isPending}
          message="Từ chối là trạng thái cuối; chủ xe phải nộp hồ sơ mới."
          note={{ label: "Lý do từ chối", required: true }} onCancel={close}
          onConfirm={(note) => reject.mutate({ id: r.request_id, note }, done("Đã từ chối hồ sơ"))} />
      )}
    </>
  );
}
