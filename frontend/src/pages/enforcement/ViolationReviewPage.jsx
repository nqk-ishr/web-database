import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCancelViolation, useNotifyViolation, useVerifyViolation, useViolationDetail } from "../../hooks/useStaff";
import StatusBadge from "../../components/domain/StatusBadge";
import FormDialog from "../../components/staff/FormDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { PAYMENT_STATUS, VEHICLE_STATUS, VIOLATION_STATUS } from "../../constants/status";
import { date, dateTime, money, vnToday } from "../../utils/format";

const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function NoticeDialog({ v, busy, onSubmit, onCancel }) {
  const today = vnToday();
  const [fine, setFine] = useState(String(v.min_fine));
  const [due, setDue] = useState(addDays(today, 30));
  const n = Number(fine);
  const fineErr = fine === "" || !Number.isInteger(n) ? "Nhập số tiền (đồng)"
    : n < Number(v.min_fine) || n > Number(v.max_fine) ? `Phải trong khung ${money(v.min_fine)} – ${money(v.max_fine)}` : null;
  const dueErr = !due || due < today ? "Hạn nộp phải từ hôm nay trở đi" : null;
  return (
    <FormDialog title="Lập quyết định xử phạt" submitText="Ra thông báo" busy={busy} disabled={Boolean(fineErr || dueErr)}
      onSubmit={() => onSubmit({ fine_amount: n, due_date: due })} onCancel={onCancel}>
      <p>Lỗi <b>{v.violation_type}</b>, xe <b>{v.plate_number}</b>, người chịu phạt <b>{v.liable_owner}</b>. Số quyết định do hệ thống sinh.</p>
      <Field label="Mức phạt (đồng)" error={fineErr} hint={`Khung: ${money(v.min_fine)} – ${money(v.max_fine)}`}>
        <input autoFocus inputMode="numeric" value={fine} onChange={(e) => setFine(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field label="Hạn nộp" error={dueErr}><input type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
    </FormDialog>
  );
}

// Cán bộ xử lý vi phạm: Mới ghi nhận -> Xác minh -> Ra thông báo; hủy khi dữ liệu sai hoặc không xác định được xe
export default function ViolationReviewPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: v, isLoading, error, refetch } = useViolationDetail(id);
  const verify = useVerifyViolation();
  const notify = useNotifyViolation();
  const cancel = useCancelViolation();
  const [dialog, setDialog] = useState(null);       // "notify" | "cancel"
  const [warnings, setWarnings] = useState([]);     // cảnh báo backend trả về sau khi xác minh
  if (isLoading) return <Loading />;
  if (error || !v) return <ErrorBox error={error ?? new Error("Không tìm thấy vi phạm")} onRetry={refetch} />;

  const close = () => setDialog(null);
  const unmatched = v.vehicle_id == null || v.liable_owner_id == null;
  const canCancel = ["recorded", "verified"].includes(v.status);
  const doVerify = () => verify.mutate(v.violation_id, {
    onSuccess: (r) => { setWarnings(r.warnings ?? []); toast.success(r.warnings?.length ? "Đã xác minh, có cảnh báo cần xem" : "Đã xác minh vi phạm"); },
    onError: (x) => toast.error(x),
  });
  const doNotify = (body) => notify.mutate({ id: v.violation_id, ...body }, {
    onSuccess: (r) => { toast.success(`Đã ra quyết định ${r.decision_number}`); setWarnings([]); close(); },
    onError: (x) => { toast.error(x); close(); },
  });
  const doCancel = (reason) => cancel.mutate({ id: v.violation_id, reason }, {
    onSuccess: () => { toast.success("Đã hủy vi phạm"); setWarnings([]); close(); },
    onError: (x) => { toast.error(x); close(); },
  });

  return (
    <>
      <div><p className="muted"><Link to="/enforcement/violations">Vi phạm</Link> /</p>
        <h1>Vi phạm #{v.violation_id} <StatusBadge map={VIOLATION_STATUS} status={v.status} /> {v.is_overdue && <span className="badge bad">Quá hạn</span>}</h1></div>

      {unmatched && v.status === "recorded" && (
        <div className="card bad" role="alert"><p>Biển số <b>{v.plate_number_captured}</b> không khớp xe nào trong hệ thống (hoặc không xác định được chủ xe tại thời điểm vi phạm). Vi phạm này phải được hủy.</p></div>
      )}
      {v.vehicle_status === "stolen" && ["recorded", "verified"].includes(v.status) && warnings.length === 0 && (
        <div className="card warn" role="status"><p>Cảnh báo: xe đang ở trạng thái <b>Báo mất</b>. Cân nhắc giữ hoặc hủy vi phạm.</p></div>
      )}
      {warnings.length > 0 && v.status === "verified" && (
        <div className="card warn" role="status">
          <b>Cảnh báo khi xác minh:</b>
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          <p>Bạn có thể giữ vi phạm (lập quyết định) hoặc hủy.</p>
        </div>
      )}

      <div className="grid">
        <section className="card"><h2>Ghi nhận từ camera</h2>
          <dl className="kv">
            <dt>Thời điểm</dt><dd>{dateTime(v.occurred_at)}</dd>
            <dt>Camera</dt><dd>{v.camera_code} · {v.location_name}</dd>
            <dt>Biển số đọc được</dt><dd>{v.plate_number_captured}</dd>
            <dt>Lỗi</dt><dd>{v.violation_type} <span className="muted">({v.violation_code})</span></dd>
            <dt>Khung phạt</dt><dd>{money(v.min_fine)} – {money(v.max_fine)}</dd>
          </dl>
        </section>
        <section className="card"><h2>Xe và người chịu phạt</h2>
          <dl className="kv">
            <dt>Xe</dt><dd>{v.plate_number ?? "Không khớp"} {v.vehicle_status && <StatusBadge map={VEHICLE_STATUS} status={v.vehicle_status} />}</dd>
            <dt>Chủ xe lúc vi phạm</dt><dd>{v.liable_owner ?? "–"}</dd>
            {v.handled_by_name && <><dt>Cán bộ xử lý</dt><dd>{v.handled_by_name}</dd></>}
          </dl>
        </section>
        <section className="card"><h2>Quyết định xử phạt</h2>
          <dl className="kv">
            <dt>Số quyết định</dt><dd>{v.decision_number ?? "Chưa lập"}</dd>
            <dt>Mức phạt</dt><dd>{money(v.fine_amount)}</dd>
            <dt>Hạn nộp</dt><dd>{v.due_date ? date(v.due_date) : "–"}</dd>
            {Number(v.late_fee) > 0 && <><dt>Phạt trễ đến nay</dt><dd className="bad-text">{money(v.late_fee)}</dd></>}
            {v.cancelled_reason && <><dt>Lý do hủy</dt><dd>{v.cancelled_reason}</dd></>}
          </dl>
        </section>
        {(v.status === "recorded" || v.status === "verified") && (
          <section className="card"><h2>Xử lý</h2>
            {v.status === "recorded" && !unmatched && (
              <button className="btn" type="button" disabled={verify.isPending} onClick={doVerify}>{verify.isPending ? "Đang xác minh…" : "Xác minh"}</button>)}
            {v.status === "verified" && <button className="btn" type="button" onClick={() => setDialog("notify")}>Lập quyết định xử phạt</button>}
            {canCancel && <button className="btn btn2" type="button" onClick={() => setDialog("cancel")}>Hủy vi phạm</button>}
          </section>
        )}
      </div>

      {v.payments?.length > 0 && (
        <section className="card table-scroll"><h2>Giao dịch nộp phạt</h2>
          <table>
            <thead><tr><th>Mã giao dịch</th><th>Tiền phạt</th><th>Phạt trễ</th><th>Tổng</th><th>Thời điểm</th><th>Kết quả</th></tr></thead>
            <tbody>{v.payments.map((p) => (
              <tr key={p.payment_id}><td>{p.gateway_ref}</td><td>{money(p.fine_amount)}</td><td>{money(p.late_fee)}</td>
                <td>{money(p.total_amount)}</td><td>{dateTime(p.paid_at ?? p.created_at)}</td>
                <td><StatusBadge map={PAYMENT_STATUS} status={p.status} /></td></tr>))}</tbody>
          </table>
        </section>
      )}

      {dialog === "notify" && <NoticeDialog v={v} busy={notify.isPending} onSubmit={doNotify} onCancel={close} />}
      {dialog === "cancel" && (
        <ConfirmDialog open title="Hủy vi phạm" danger confirmText="Hủy vi phạm" cancelText="Đóng" busy={cancel.isPending}
          message="Đã hủy là trạng thái cuối."
          note={{ label: "Lý do hủy", required: true, placeholder: "vd. Biển số không khớp, dữ liệu camera sai, xe đã báo mất…" }}
          onCancel={close} onConfirm={doCancel} />
      )}
    </>
  );
}
