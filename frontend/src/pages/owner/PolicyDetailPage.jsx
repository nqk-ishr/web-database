import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCancelPolicy, usePolicy } from "../../hooks/usePolicies";
import PolicyBadge from "../../components/domain/PolicyBadge";
import PayPolicyDialog from "../../components/domain/PayPolicyDialog";
import StatusBadge from "../../components/domain/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { CLAIM_STATUS, CLAIM_TYPE, PAYMENT_STATUS } from "../../constants/status";
import { dateTime, date, money } from "../../utils/format";

export default function PolicyDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: p, isLoading, error, refetch } = usePolicy(id);
  const cancel = useCancelPolicy();
  const [dialog, setDialog] = useState(null);       // "pay" | "cancel"
  if (isLoading) return <Loading />;
  if (error || !p) return <ErrorBox error={error ?? new Error("Không tìm thấy hợp đồng")} onRetry={refetch} />;

  const payments = p.payments ?? [];
  const claims = p.claims ?? [];
  const doCancel = () => cancel.mutate(p.policy_id, {
    onSuccess: () => { toast.success("Đã hủy hợp đồng"); setDialog(null); },
    onError: (x) => { toast.error(x); setDialog(null); } });

  return (
    <>
      <div><p className="muted"><Link to="/insurance">Bảo hiểm của tôi</Link> /</p>
        <h1>{p.product_name} · {p.plate_number} <PolicyBadge p={p} /></h1></div>

      {p.canPay && <div className="card alert" role="status"><p><b>Hợp đồng chưa có hiệu lực.</b> Thanh toán phí {money(p.premium)} để kích hoạt.</p></div>}
      {p.expired && <div className="card bad" role="status"><p><b>Hợp đồng đã hết hạn ngày {date(p.end_date)}.</b> Xe đang không có bảo hiểm hiệu lực.</p></div>}

      <div className="grid">
        <section className="card"><h2>Thông tin hợp đồng</h2>
          <dl className="kv">
            <dt>Công ty bảo hiểm</dt><dd>{p.insurer}</dd>
            <dt>Gói</dt><dd>{p.product_name} ({p.term_months} tháng)</dd>
            <dt>Xe</dt><dd><Link to={`/vehicles/${p.vehicle_id}`}>{p.plate_number}</Link></dd>
            <dt>Hiệu lực</dt><dd>{date(p.start_date)} – {date(p.end_date)}</dd>
            <dt>Phí</dt><dd>{money(p.premium)}</dd>
            <dt>Hạn mức bồi thường</dt><dd>{money(p.liability_limit)}</dd>
            <dt>Quyền lợi mất cắp</dt><dd>{p.includes_theft ? "Có" : "Không"}</dd>
            {p.certificate_code && <><dt>Mã giấy chứng nhận</dt><dd><b>{p.certificate_code}</b></dd></>}
          </dl>
        </section>
        <section className="card"><h2>Thao tác</h2>
          {p.canPay && <button className="btn" type="button" onClick={() => setDialog("pay")}>Thanh toán phí</button>}
          {p.canCancel && <button className="btn btn2" type="button" onClick={() => setDialog("cancel")}>Hủy hợp đồng</button>}
          {p.status === "active" && !p.expired && <Link className="btn" to={`/claims/new?policy_id=${p.policy_id}`}>Gửi yêu cầu bồi thường</Link>}
          {(p.status === "active") && <Link className="btn btn2" to={`/insurance/buy?vehicle_id=${p.vehicle_id}`}>{p.expired ? "Mua bảo hiểm mới" : "Gia hạn"}</Link>}
          {p.status === "active" && !p.canCancel && <p className="muted">Hợp đồng đã có hiệu lực không hủy hoặc hoàn phí được.</p>}
          {p.status === "cancelled" && <p className="muted">Hợp đồng đã bị hủy.</p>}
        </section>
      </div>

      <section className="card table-scroll"><h2>Giao dịch thanh toán phí</h2>
        {payments.length === 0 ? <p className="muted">Chưa có giao dịch nào.</p> : (
          <table>
            <thead><tr><th>Thời điểm</th><th>Mã giao dịch</th><th>Số tiền</th><th>Kết quả</th></tr></thead>
            <tbody>{payments.map((x) => (
              <tr key={x.policy_payment_id}><td>{dateTime(x.paid_at ?? x.created_at)}</td><td>{x.gateway_ref}</td><td>{money(x.amount)}</td>
                <td><StatusBadge map={PAYMENT_STATUS} status={x.status} /></td></tr>))}</tbody>
          </table>
        )}
      </section>

      {claims.length > 0 && (
        <section className="card table-scroll"><h2>Yêu cầu bồi thường</h2>
          <table>
            <thead><tr><th>Loại</th><th>Đề nghị</th><th>Được duyệt</th><th>Trạng thái</th><th>Ngày gửi</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>{claims.map((c) => (
              <tr key={c.claim_id}><td><StatusBadge map={CLAIM_TYPE} status={c.claim_type} /></td><td>{money(c.requested_amount)}</td>
                <td>{c.approved_amount == null ? "–" : money(c.approved_amount)}</td><td><StatusBadge map={CLAIM_STATUS} status={c.status} /></td><td>{dateTime(c.created_at)}</td>
                <td><Link className="btn btn2 sm" to={`/claims/${c.claim_id}`}>Chi tiết</Link></td></tr>))}</tbody>
          </table>
        </section>
      )}

      {dialog === "pay" && <PayPolicyDialog policy={p} onClose={() => setDialog(null)} />}
      {dialog === "cancel" && (
        <ConfirmDialog open title="Hủy hợp đồng" danger confirmText="Hủy hợp đồng" busy={cancel.isPending}
          message={`Hợp đồng ${p.product_name} cho xe ${p.plate_number} sẽ bị hủy. Bạn có thể mua lại sau.`}
          onCancel={() => setDialog(null)} onConfirm={doCancel} />
      )}
    </>
  );
}
