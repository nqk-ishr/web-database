import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../layouts/AppLayout";
import { ROLES } from "../constants/roles";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ChangePasswordPage from "../pages/account/ChangePasswordPage";
import ComingSoonPage from "../pages/ComingSoonPage";
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

// Cổng của từng vai trò cán bộ. Mỗi phần sau thay ComingSoonPage bằng các trang thật.
const STAFF_PORTALS = [
  { role: ROLES.REGISTRAR, base: "/registrar" },
  { role: ROLES.VIOLATION_OFFICER, base: "/enforcement" },
  { role: ROLES.INSURANCE_STAFF, base: "/insurer" },
  { role: ROLES.ADMIN, base: "/admin" },
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
      {STAFF_PORTALS.map(({ role, base }) => (
        <Route key={role} element={<ProtectedRoute roles={[role]} />}>
          <Route element={<AppLayout />}><Route path={`${base}/*`} element={<ComingSoonPage />} /></Route>
        </Route>
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
