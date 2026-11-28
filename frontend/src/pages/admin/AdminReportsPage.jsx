import { PageHeader } from "../../components/ui/Field";
import InsuranceReportPage from "../reports/InsuranceReportPage";
import ViolationReportPage from "../reports/ViolationReportPage";

// Quản trị xem cả ba báo cáo, số liệu toàn hệ thống (không giới hạn theo công ty bảo hiểm)
export default function AdminReportsPage() {
  return (
    <>
      <PageHeader title="Báo cáo thống kê" subtitle="Số liệu toàn hệ thống, lấy trực tiếp từ CSDL." />
      <ViolationReportPage embedded />
      <InsuranceReportPage embedded />
    </>
  );
}
