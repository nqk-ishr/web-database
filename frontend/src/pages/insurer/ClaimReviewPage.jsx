import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApproveClaim, useClaimDetail, useClaimMoreInfo, usePayClaim, usePolicyDetail, useRejectClaim } from "../../hooks/useStaff";
import AttachmentPanel from "../../components/domain/AttachmentPanel";
import StatusBadge from "../../components/domain/StatusBadge";
import FormDialog from "../../components/staff/FormDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { CLAIM_STATUS, CLAIM_TYPE } from "../../constants/status";
import { date, dateTime, money } from "../../utils/format";

// Hạn mức còn lại của hợp đồng = hạn mức - tổng đã duyệt/đã chi của các yêu cầu khác (backend kiểm tra lại khi duyệt)
const remainingLimit = (policy, claimId) => {
  if (!policy) return null;
  const used = (policy.claims ?? [])
    .filter((c) => c.claim_id !== claimId && ["approved", "paid"].includes(c.status))
    .reduce((s, c) => s + Number(c.approved_amount ?? 0), 0);
  return Number(policy.liability_limit) - used;
};

function ApproveDialog({ c, remaining, busy, onSubmit, onCancel }) {
  const max = Math.min(Number(c.requested_amount), remaining ?? Infinity);
  const [amount, setAmount] = useState(String(Math.max(0, max)));
  const [note, setNote] = useState("");
  const n = Number(amount);
  const err = amount === "" ? "Nhập số tiền duyệt"
    : n > Number(c.requested_amount) ? "Không được vượt số tiền đề nghị"
      : remaining != null && n > remaining ? `Vượt hạn mức còn lại (${money(remaining)})` : null;
  return (
    <FormDialog title="Duyệt bồi thường" submitText="Duyệt" busy={busy} disabled={Boolean(err)}
      onSubmit={() => onSubmit({ approved_amount: n, ...(note.trim() ? { note: note.trim() } : {}) })} onCancel={onCancel}>
      {c.claim_type === "theft" && (
        <div className="card warn" role="status"><p>Duyệt yêu cầu <b>mất cắp</b> sẽ đồng thời: đưa xe {c.plate_number} sang <b>Báo mất</b>,
          hủy các hồ sơ đăng ký/sang tên đang mở và hợp đồng đang chờ thanh toán của xe, ghi lịch sử trạng thái xe.</p></div>
      )}
      <p className="muted">Đề nghị {money(c.requested_amount)}{remaining != null && ` · Hạn mức còn lại ${money(remaining)}`}</p>
      <Field label="Số tiền duyệt (đồng)" error={err}>
        <input autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field label="Ghi chú (không bắt buộc)">
        <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

// Nhân viên bảo hiểm: thẩm định một yêu cầu bồi thường
export default function ClaimReviewPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: c, isLoading, error, refetch } = useClaimDetail(id);
  const policy = usePolicyDetail(c?.policy_id, Boolean(c));
  const approve = useApproveClaim();
  const reject = useRejectClaim();
  const moreInfo = useClaimMoreInfo();
  const pay = usePayClaim();
  const [dialog, setDialog] = useState(null);       // "approve" | "reject" | "info" | "pay"
  if (isLoading) return <Loading />;
  if (error || !c) return <ErrorBox error={error ?? new Error("Không tìm thấy yêu cầu")} onRetry={refetch} />;

  const close = () => setDialog(null);
  const done = (msg) => ({ onSuccess: () => { toast.success(msg); close(); }, onError: (x) => { toast.error(x); close(); } });
  const remaining = remainingLimit(policy.data, c.claim_id);
  const doApprove = (body) => approve.mutate({ id: c.claim_id, ...body }, {
    onSuccess: (r) => {
      toast.success(r.vehicle_status === "stolen"
        ? `Đã duyệt. Xe chuyển Báo mất; hủy ${r.cancelled_requests ?? 0} hồ sơ và ${r.cancelled_policies ?? 0} hợp đồng chờ.`
        : `Đã duyệt ${money(r.approved_amount)}`);
      close();
    },
    onError: (x) => { toast.error(x); close(); },
  });

  return (
    <>
      <div><p className="muted"><Link to="/insurer/claims">Yêu cầu bồi thường</Link> /</p>
        <h1>Yêu cầu #{c.claim_id} · <StatusBadge map={CLAIM_TYPE} status={c.claim_type} /> <StatusBadge map={CLAIM_STATUS} status={c.status} /></h1></div>

      {c.status === "needs_more_info" && <div className="card warn" role="status"><p><b>Đã yêu cầu bổ sung:</b> {c.review_note}. Đang chờ người yêu cầu gửi lại.</p></div>}
      {c.status === "rejected" && <div className="card bad" role="status"><p><b>Đã từ chối:</b> {c.review_note}</p></div>}
      {c.status === "cancelled" && <div className="card" role="status">Người yêu cầu đã rút{c.cancel_reason ? `: ${c.cancel_reason}` : "."}</div>}
      {c.status === "approved" && <div className="card ok" role="status">Đã duyệt {money(c.approved_amount)}. Cần ghi nhận chi trả sau khi chuyển tiền.</div>}

      <div className="grid">
        <section className="card"><h2>Sự kiện</h2>
          <dl className="kv">
            <dt>Người yêu cầu</dt><dd>{c.claimant_name}</dd>
            <dt>Thời điểm</dt><dd>{dateTime(c.event_time)}</dd>
            <dt>Địa điểm</dt><dd>{c.event_location}</dd>
            <dt>Mô tả</dt><dd>{c.description || "–"}</dd>
            <dt>Gửi lúc</dt><dd>{dateTime(c.created_at)}</dd>
          </dl>
        </section>
        <section className="card"><h2>Hợp đồng</h2>
          <dl className="kv">
            <dt>Giấy chứng nhận</dt><dd>{c.certificate_code}</dd>
            <dt>Xe</dt><dd>{c.plate_number}</dd>
            <dt>Gói</dt><dd>{c.product_name} · {c.insurer}</dd>
            <dt>Hiệu lực</dt><dd>{date(c.policy_start)} – {date(c.policy_end)}</dd>
            <dt>Quyền lợi mất cắp</dt><dd>{c.includes_theft ? "Có" : "Không"}</dd>
            <dt>Hạn mức</dt><dd>{money(c.liability_limit)}</dd>
            <dt>Hạn mức còn lại</dt><dd>{policy.isLoading ? "…" : remaining == null ? "–" : money(remaining)}</dd>
          </dl>
        </section>
        <section className="card"><h2>Số tiền</h2>
          <dl className="kv">
            <dt>Đề nghị</dt><dd>{money(c.requested_amount)}</dd>
            <dt>Đã duyệt</dt><dd>{money(c.approved_amount)}</dd>
            {c.reviewer_name && <><dt>Người thẩm định</dt><dd>{c.reviewer_name}</dd></>}
            {c.paid_at && <><dt>Chi trả lúc</dt><dd>{dateTime(c.paid_at)}</dd></>}
          </dl>
          {c.status === "pending_review" && (
            <>
              <button className="btn" type="button" onClick={() => setDialog("approve")}>Duyệt</button>
              <button className="btn btn2" type="button" onClick={() => setDialog("info")}>Yêu cầu bổ sung</button>
              <button className="btn btn2" type="button" onClick={() => setDialog("reject")}>Từ chối</button>
            </>
          )}
          {c.status === "approved" && <button className="btn" type="button" onClick={() => setDialog("pay")}>Ghi nhận đã chi trả</button>}
        </section>
      </div>

      <AttachmentPanel kind="claims" parentId={c.claim_id} canEdit={false} />

      {dialog === "approve" && <ApproveDialog c={c} remaining={remaining} busy={approve.isPending} onSubmit={doApprove} onCancel={close} />}
      {dialog === "info" && (
        <ConfirmDialog open title="Yêu cầu bổ sung" confirmText="Gửi yêu cầu" busy={moreInfo.isPending}
          note={{ label: "Nội dung cần bổ sung", required: true }} onCancel={close}
          onConfirm={(note) => moreInfo.mutate({ id: c.claim_id, note }, done("Đã gửi yêu cầu bổ sung"))} />
      )}
      {dialog === "reject" && (
        <ConfirmDialog open title="Từ chối bồi thường" danger confirmText="Từ chối" busy={reject.isPending}
          message="Từ chối là trạng thái cuối." note={{ label: "Lý do từ chối", required: true }} onCancel={close}
          onConfirm={(note) => reject.mutate({ id: c.claim_id, note }, done("Đã từ chối yêu cầu"))} />
      )}
      {dialog === "pay" && (
        <ConfirmDialog open title="Ghi nhận chi trả" confirmText="Xác nhận đã chi trả" busy={pay.isPending}
          message={`Xác nhận đã chi trả ${money(c.approved_amount)} cho ${c.claimant_name}. Đây là trạng thái cuối.`}
          onCancel={close} onConfirm={() => pay.mutate(c.claim_id, done("Đã ghi nhận chi trả"))} />
      )}
    </>
  );
}
