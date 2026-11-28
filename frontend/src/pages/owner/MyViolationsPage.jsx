import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMyViolations } from "../../hooks/useViolations";
import StatusBadge from "../../components/domain/StatusBadge";
import PayViolationDialog from "../../components/domain/PayViolationDialog";
import { PageHeader } from "../../components/ui/Field";
import { Loading, ErrorBox, Empty } from "../../components/feedback/State";
import { VIOLATION_STATUS, FILTERS } from "../../constants/status";
import { amountDue } from "../../utils/violations";
import { money, dateTime, date } from "../../utils/format";

const match = { all: () => true, unpaid: (v) => v.canPay, overdue: (v) => v.isOverdue, paid: (v) => v.status === "paid" };
const WAITING = "Chưa có quyết định xử phạt, chưa nộp được.";

export default function MyViolationsPage() {
  const [params, setParams] = useSearchParams();
  const vehicleId = params.get("vehicle_id");               // lọc theo một xe (liên kết từ thẻ xe)
  const { data, isLoading, error, refetch } = useMyViolations();
  const [filter, setFilter] = useState("all");
  const [target, setTarget] = useState(null);               // vi phạm đang nộp
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;

  const all = data.filter((v) => !vehicleId || String(v.vehicle_id) === vehicleId);
  const rows = all.filter(match[filter]);
  const total = all.filter((v) => v.canPay).reduce((s, v) => s + amountDue(v), 0);

  return (
    <>
      <PageHeader title="Vi phạm của tôi" subtitle="Bạn chịu phạt theo chủ xe tại thời điểm vi phạm." />
      {vehicleId && (
        <p className="row" style={{ justifyContent: "flex-start" }}>
          <span className="badge info">Đang lọc theo một xe</span>
          <button className="btn btn2 sm" type="button" onClick={() => setParams({})}>Bỏ lọc</button>
        </p>
      )}
      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} className={`tab${filter === f.key ? " on" : ""}`}
            onClick={() => setFilter(f.key)}>{f.label} ({all.filter(match[f.key]).length})</button>
        ))}
      </div>

      <section className="card table-scroll">
        {rows.length === 0 ? <Empty text="Không có vi phạm nào trong mục này." /> : (
          <table>
            <caption className="sr-only">Danh sách vi phạm</caption>
            <thead><tr><th>Thời điểm</th><th>Xe</th><th>Lỗi vi phạm</th><th>Trạng thái</th><th>Tiền phạt</th><th>Phạt trễ</th><th>Thao tác</th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.violation_id}>
                  <td>{dateTime(v.occurred_at)}</td><td>{v.plate_number}</td><td>{v.type}</td>
                  <td>{v.isOverdue ? <span className="badge bad">Quá hạn {v.overdueDays} ngày</span>
                    : v.canPay ? <span className="badge warn">Đã thông báo · hạn {date(v.due_date)}</span>
                    : <StatusBadge map={VIOLATION_STATUS} status={v.status} />}</td>
                  <td>{v.fine_amount == null ? "Chờ quyết định" : money(v.fine_amount)}</td>
                  <td>{v.canPay ? money(v.late_fee) : "–"}</td>
                  <td>
                    <div className="row" style={{ gap: 8, justifyContent: "flex-start" }}>
                      {v.canPay
                        ? <button className="btn sm" type="button" onClick={() => setTarget(v)}>Nộp phạt</button>
                        : v.status === "paid" ? null
                        : <button className="btn sm" type="button" disabled title={WAITING}>Chưa nộp được</button>}
                      <Link className="btn btn2 sm" to={`/violations/${v.violation_id}`}>{v.status === "paid" ? "Xem biên lai" : "Chi tiết"}</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {total > 0 && <div className="card row"><span>Tổng cần nộp: <b>{money(total)}</b></span></div>}
      {target && <PayViolationDialog violation={target} onClose={() => setTarget(null)} />}
    </>
  );
}
