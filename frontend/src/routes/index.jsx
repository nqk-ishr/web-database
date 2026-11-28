import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../layouts/AppLayout";
import { ROLES } from "../constants/roles";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ChangePasswordPage from "../pages/account/ChangePasswordPage";
import HomePage from "../pages/owner/HomePage";
import VehicleDetailPage from "../pages/owner/VehicleDetailPage";
import MyViolationsPage from "../pages/owner/MyViolationsPage";
import ViolationDetailPage from "../pages/owner/ViolationDetailPage";
import RegisterVehiclePage from "../pages/owner/RegisterVehiclePage";
import MyRequestsPage from "../pages/owner/MyRequestsPage";
import RequestDetailPage from "../pages/owner/RequestDetailPage";
import TransferPage from "../pages/owner/TransferPage";
import MyPoliciesPage from "../pages/owner/MyPoliciesPage";
import BuyPolicyPage from "../pages/owner/BuyPolicyPage";
import PolicyDetailPage from "../pages/owner/PolicyDetailPage";
import MyClaimsPage from "../pages/owner/MyClaimsPage";
import NewClaimPage from "../pages/owner/NewClaimPage";
import ClaimDetailPage from "../pages/owner/ClaimDetailPage";
import UiKitPage from "../pages/dev/UiKitPage";
import RequestQueuePage from "../pages/registrar/RequestQueuePage";
import RequestReviewPage from "../pages/registrar/RequestReviewPage";
import VehicleSearchPage from "../pages/registrar/VehicleSearchPage";
import VehicleRecordPage from "../pages/registrar/VehicleRecordPage";
import ViolationQueuePage from "../pages/enforcement/ViolationQueuePage";
import ViolationReviewPage from "../pages/enforcement/ViolationReviewPage";
import ViolationReportPage from "../pages/reports/ViolationReportPage";
import ClaimQueuePage from "../pages/insurer/ClaimQueuePage";
import ClaimReviewPage from "../pages/insurer/ClaimReviewPage";
import InsuranceReportPage from "../pages/reports/InsuranceReportPage";
import UsersPage from "../pages/admin/UsersPage";
import UserDetailPage from "../pages/admin/UserDetailPage";
import AuditLogPage from "../pages/admin/AuditLogPage";
import AdminReportsPage from "../pages/admin/AdminReportsPage";

// Cổng phía quản lý: mỗi vai trò một tiền tố đường dẫn; đường dẫn lạ trong cổng quay về trang đầu của cổng.
const STAFF_PORTALS = [
  { role: ROLES.REGISTRAR, base: "/registrar", pages: [
    ["requests", <RequestQueuePage />], ["requests/:id", <RequestReviewPage />],
    ["vehicles", <VehicleSearchPage />], ["vehicles/:id", <VehicleRecordPage />],
  ] },
  { role: ROLES.VIOLATION_OFFICER, base: "/enforcement", pages: [
    ["violations", <ViolationQueuePage />], ["violations/:id", <ViolationReviewPage />],
    ["reports", <ViolationReportPage />],
  ] },
  { role: ROLES.INSURANCE_STAFF, base: "/insurer", pages: [
    ["claims", <ClaimQueuePage />], ["claims/:id", <ClaimReviewPage />],
    ["reports", <InsuranceReportPage />],
  ] },
  { role: ROLES.ADMIN, base: "/admin", pages: [
    ["users", <UsersPage />], ["users/:id", <UserDetailPage />],
    ["audit", <AuditLogPage />], ["reports", <AdminReportsPage />],
  ] },
];

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Trang xem thử thành phần dùng chung: chỉ có khi `npm run dev` */}
      {import.meta.env.DEV && <Route element={<AppLayout />}><Route path="/ui-kit" element={<UiKitPage />} /></Route>}

      {/* Mọi vai trò đã đăng nhập */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}><Route path="/account/password" element={<ChangePasswordPage />} /></Route>
      </Route>

      {/* Chủ xe */}
      <Route element={<ProtectedRoute roles={[ROLES.OWNER]} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="/violations" element={<MyViolationsPage />} />
          <Route path="/violations/:id" element={<ViolationDetailPage />} />
          <Route path="/register-vehicle" element={<RegisterVehiclePage />} />
          <Route path="/requests" element={<MyRequestsPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="/transfer/:vehicleId" element={<TransferPage />} />
          <Route path="/insurance" element={<MyPoliciesPage />} />
          <Route path="/insurance/buy" element={<BuyPolicyPage />} />
          <Route path="/insurance/:id" element={<PolicyDetailPage />} />
          <Route path="/claims" element={<MyClaimsPage />} />
          <Route path="/claims/new" element={<NewClaimPage />} />
          <Route path="/claims/:id" element={<ClaimDetailPage />} />
        </Route>
      </Route>

      {/* Cán bộ / quản trị */}
      {STAFF_PORTALS.map(({ role, base, pages }) => (
        <Route key={role} element={<ProtectedRoute roles={[role]} />}>
          <Route path={base} element={<AppLayout />}>
            {pages.map(([path, el]) => <Route key={path} path={path} element={el} />)}
            <Route index element={<Navigate to={`${base}/${pages[0][0]}`} replace />} />
            <Route path="*" element={<Navigate to={`${base}/${pages[0][0]}`} replace />} />
          </Route>
        </Route>
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
