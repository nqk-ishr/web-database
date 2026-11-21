import { useState } from "react";
import { useMyViolations, usePayViolation, enrich } from "../../hooks/useViolations";
import StatusBadge from "../../components/domain/StatusBadge";
import { Loading, ErrorBox, Empty } from "../../components/feedback/State";
import { VIOLATION_STATUS, FILTERS } from "../../constants/status";
import { money, dateTime, date } from "../../utils/format";

const match = { all: () => true, unpaid: (v) => v.canPay, overdue: (v) => v.isOverdue, paid: (v) => v.status === "paid" };

export default function MyViolationsPage() {
  const { data, isLoading, error, refetch } = useMyViolations();
  const pay = usePayViolation();
  const [filter, setFilter] = useState("all");
  const [payingId, setPayingId] = useState(null);
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;

  const all = data.map((v) => enrich(v));
  const rows = all.filter(match[filter]);
  const total = all.filter((v) => v.canPay).reduce((s, v) => s + v.fine_amount + v.late_fee, 0);
  const doPay = (id) => { setPayingId(id); pay.mutate(id, { onSettled: () => setPayingId(null) }); };

  return (
    <>
      <div><h1>Vi phạm của tôi</h1><p className="muted">Bạn chịu phạt theo chủ xe tại thời điểm vi phạm.</p></div>
      <div className="tabs">{FILTERS.map((f) => (
        <button key={f.key} type="button" className={`tab${filter === f.key ? " on" : ""}`} onClick={() => setFilter(f.key)}>{f.label}</button>))}</div>
      {pay.isError && <ErrorBox error={pay.error} />}
      <section className="card" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <Empty text="Không có vi phạm nào trong mục này." /> : (
          <table><thead><tr><th>Thời điểm</th><th>Xe</th><th>Lỗi vi phạm</th><th>Trạng thái</th><th>Tiền phạt</th><th>Phạt trễ</th><th></th></tr></thead>
            <tbody>{rows.map((v) => (
              <tr key={v.violation_id}>
                <td>{dateTime(v.occurred_at)}</td><td>{v.plate_number}</td><td>{v.type}</td>
                <td>{v.isOverdue ? <span className="badge bad">Quá hạn {v.overdueDays} ngày</span>
                  : v.status === "notified" ? <span className="badge warn">Đã thông báo · hạn {date(v.due_date)}</span>
                  : <StatusBadge map={VIOLATION_STATUS} status={v.status} />}</td>
                <td>{v.fine_amount == null ? "Chờ quyết định" : money(v.fine_amount)}</td>
                <td>{v.canPay ? money(v.late_fee) : "–"}</td>
                <td>{v.canPay
                  ? <button className="btn" type="button" disabled={payingId === v.violation_id} onClick={() => doPay(v.violation_id)}>{payingId === v.violation_id ? "Đang xử lý…" : "Nộp phạt"}</button>
                  : v.status === "paid" ? <button className="btn btn2" type="button">Xem biên lai</button>
                  : <button className="btn" type="button" disabled>Chưa nộp được</button>}</td>
              </tr>))}</tbody></table>)}
      </section>
      {total > 0 && <div className="card row"><span>Tổng cần nộp: <b>{money(total)}</b></span></div>}
    </>
  );
}
