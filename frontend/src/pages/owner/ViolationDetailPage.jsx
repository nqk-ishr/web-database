import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useViolation } from "../../hooks/useViolations";
import StatusBadge from "../../components/domain/StatusBadge";
import PayViolationDialog from "../../components/domain/PayViolationDialog";
import { Loading, ErrorBox } from "../../components/feedback/State";
import { VIOLATION_STATUS, PAYMENT_STATUS } from "../../constants/status";
import { amountDue } from "../../utils/violations";
import { money, dateTime, date } from "../../utils/format";

export default function ViolationDetailPage() {
  const { id } = useParams();
  const { data: v, isLoading, error, refetch } = useViolation(id);
  const [paying, setPaying] = useState(false);
  if (isLoading) return <Loading />;
  if (error || !v) return <ErrorBox error={error ?? new Error("Không tìm thấy vi phạm")} onRetry={refetch} />;
  const payments = v.payments ?? [];

  return (
    <>
      <div><p className="muted"><Link to="/violations">Vi phạm của tôi</Link> /</p>
        <h1>{v.type} <StatusBadge map={VIOLATION_STATUS} status={v.status} /></h1></div>
      <div className="grid">
        <section className="card"><h2>Thông tin vi phạm</h2>
          <dl className="kv">
            <dt>Thời điểm</dt><dd>{dateTime(v.occurred_at)}</dd>
            <dt>Địa điểm</dt><dd>{v.location_name ?? "–"}</dd>
            <dt>Biển số</dt><dd>{v.plate_number}</dd>
            <dt>Số quyết định</dt><dd>{v.decision_number ?? "Chưa có"}</dd>
          </dl>
        </section>
        <section className="card"><h2>Tiền phạt</h2>
          {v.fine_amount == null ? <p className="muted">Chưa có quyết định xử phạt.</p> : (
            <dl className="kv">
              <dt>Tiền phạt</dt><dd>{money(v.fine_amount)}</dd>
              <dt>Hạn nộp</dt><dd>{date(v.due_date)} {v.isOverdue && <span className="badge bad">Quá hạn {v.overdueDays} ngày</span>}</dd>
              {v.canPay && <><dt>Phạt trễ hạn</dt><dd>{money(v.late_fee)}</dd><dt>Cần nộp</dt><dd><b>{money(amountDue(v))}</b></dd></>}
            </dl>
          )}
          {v.canPay && <button className="btn" type="button" onClick={() => setPaying(true)}>Nộp phạt</button>}
        </section>
      </div>
      <section className="card table-scroll"><h2>Giao dịch thanh toán</h2>
        {payments.length === 0 ? <p className="muted">Chưa có giao dịch nào.</p> : (
          <table>
            <thead><tr><th>Thời điểm</th><th>Mã giao dịch</th><th>Số tiền</th><th>Kết quả</th></tr></thead>
            <tbody>{payments.map((p) => (
              <tr key={p.payment_id}>
                <td>{dateTime(p.paid_at ?? p.created_at)}</td><td>{p.gateway_ref}</td><td>{money(p.total_amount)}</td>
                <td><StatusBadge map={PAYMENT_STATUS} status={p.status} /></td>
              </tr>))}</tbody>
          </table>
        )}
      </section>
      {paying && <PayViolationDialog violation={v} onClose={() => setPaying(false)} />}
    </>
  );
}
