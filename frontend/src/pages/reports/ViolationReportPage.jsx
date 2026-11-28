import { useState } from "react";
import { useUnpaidFinesReport, useViolationReport } from "../../hooks/useStaff";
import ReportTable from "../../components/staff/ReportTable";
import { PageHeader } from "../../components/ui/Field";
import { DateRange, FilterBar } from "../../components/ui/Filters";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { VIOLATION_STATUS } from "../../constants/status";
import { money } from "../../utils/format";
import { clean } from "../../utils/params";

const count = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0);

// Báo cáo 1: vi phạm và tiền phạt theo loại lỗi / tháng / trạng thái. Báo cáo 2: xe và chủ xe còn phạt chưa nộp.
export default function ViolationReportPage({ embedded = false }) {
  const [range, setRange] = useState({ from_date: "", to_date: "" });
  const report = useViolationReport(clean(range));
  const unpaid = useUnpaidFinesReport();
  const r = report.data;
  const sumCols = (first) => [first,
    { key: "violations", header: "Số vi phạm", format: count, bar: true },
    { key: "total_fine", header: "Tổng tiền phạt", format: money, num: true }];

  return (
    <>
      {!embedded && <PageHeader title="Báo cáo vi phạm" subtitle="Số liệu lấy trực tiếp từ CSDL tại thời điểm xem." />}
      {embedded && <h2>Vi phạm và tiền phạt</h2>}
      <FilterBar>
        <DateRange from={range.from_date} to={range.to_date} onChange={(patch) => setRange((x) => ({ ...x, ...patch }))} />
        {(range.from_date || range.to_date) && (
          <button className="btn btn2 sm" type="button" onClick={() => setRange({ from_date: "", to_date: "" })}>Bỏ lọc ngày</button>)}
      </FilterBar>
      {report.isLoading ? <Loading /> : report.error ? <ErrorBox error={report.error} onRetry={report.refetch} /> : (
        <>
          <div className="grid">
            <ReportTable title="Theo trạng thái" rows={r.by_status} rowKey="status"
              columns={sumCols({ key: "status", header: "Trạng thái", format: (s) => VIOLATION_STATUS[s]?.label ?? s })} />
            <ReportTable title="Theo loại lỗi" rows={r.by_type} rowKey="violation_type"
              columns={sumCols({ key: "violation_type", header: "Mã lỗi" })} />
          </div>
          <ReportTable title="Theo tháng" rows={r.by_month} rowKey="month" columns={sumCols({ key: "month", header: "Tháng" })} />
        </>
      )}
      {unpaid.isLoading ? <Loading /> : unpaid.error ? <ErrorBox error={unpaid.error} onRetry={unpaid.refetch} /> : (
        <ReportTable title="Xe và chủ xe còn phạt chưa nộp" note="Vi phạm Đã xác minh hoặc Đã thông báo; phạt trễ tính đến hôm nay."
          rows={unpaid.data} columns={[
            { key: "plate_number", header: "Biển số" },
            { key: "owner", header: "Chủ xe chịu phạt" },
            { key: "violations", header: "Số vi phạm", num: true, format: count },
            { key: "overdue_violations", header: "Quá hạn", num: true, format: (n) => (n > 0 ? <span className="badge bad">{n}</span> : 0) },
            { key: "total_fine", header: "Tiền phạt", format: money, bar: true },
            { key: "late_fee", header: "Phạt trễ", num: true, format: money },
          ]} />
      )}
    </>
  );
}
