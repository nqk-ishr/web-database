import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import OwnerLayout from "../layouts/OwnerLayout";
import { ROLES } from "../constants/roles";
import LoginPage from "../pages/auth/LoginPage";
import HomePage from "../pages/owner/HomePage";
import VehicleDetailPage from "../pages/owner/VehicleDetailPage";
import MyViolationsPage from "../pages/owner/MyViolationsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute roles={[ROLES.OWNER]} />}>
        <Route element={<OwnerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="/violations" element={<MyViolationsPage />} />
          {/* TODO: /register-vehicle, /transfer/:id, /incoming, /payment, /insurance, /claims, /history */}
        </Route>
      </Route>
      {/* TODO: nhánh phía quản lý (Khoa): officerRoutes.jsx */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
