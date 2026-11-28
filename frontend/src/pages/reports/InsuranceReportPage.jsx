import { useInsuranceReport } from "../../hooks/useStaff";
import ReportTable from "../../components/staff/ReportTable";
import { PageHeader } from "../../components/ui/Field";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { date, money } from "../../utils/format";

// Gộp phí thu và tiền bồi thường theo tháng vào một bảng
function byMonth(premium, payout) {
  const m = new Map();
  premium.forEach((r) => m.set(r.month, { month: r.month, premium: Number(r.premium), payout: 0 }));
  payout.forEach((r) => m.set(r.month, { month: r.month, premium: 0, ...m.get(r.month), payout: Number(r.payout) }));
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
}

// Báo cáo 3: hợp đồng sắp hết hạn trong 30 ngày; phí thu và bồi thường theo tháng, theo loại xe.
// Nhân viên bảo hiểm chỉ thấy số liệu công ty mình (backend lọc).
export default function InsuranceReportPage({ embedded = false }) {
  const q = useInsuranceReport();
  return (
    <>
      {!embedded && <PageHeader title="Báo cáo bảo hiểm" subtitle="Số liệu của công ty bảo hiểm bạn trực thuộc." />}
      {embedded && <h2>Bảo hiểm</h2>}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={q.refetch} /> : (
        <>
          <ReportTable title="Hợp đồng sắp hết hạn (30 ngày tới)" rows={q.data.expiring_30_days} rowKey="certificate_code"
            empty="Không có hợp đồng nào sắp hết hạn." columns={[
              { key: "certificate_code", header: "Mã giấy chứng nhận" },
              { key: "plate_number", header: "Biển số" },
              { key: "insurer", header: "Công ty" },
              { key: "end_date", header: "Hết hạn", format: date },
            ]} />
          <ReportTable title="Phí thu và bồi thường theo tháng" rows={byMonth(q.data.premium_by_month, q.data.payout_by_month)} rowKey="month"
            columns={[
              { key: "month", header: "Tháng" },
              { key: "premium", header: "Phí thu", format: money, bar: true },
              { key: "payout", header: "Đã chi bồi thường", format: money, bar: true },
            ]} />
          <ReportTable title="Theo loại xe" rows={q.data.by_vehicle_type} columns={[
            { key: "vehicle_type", header: "Loại xe", format: (n, r) => `${n} (${r.usage_purpose})` },
            { key: "premium", header: "Phí thu", format: money, bar: true },
            { key: "payout", header: "Đã chi bồi thường", format: money, num: true },
          ]} />
        </>
      )}
    </>
  );
}
