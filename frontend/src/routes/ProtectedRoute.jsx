import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { homePath } from "../constants/roles";

// <ProtectedRoute />            : mọi người đã đăng nhập
// <ProtectedRoute roles={[..]}/> : chỉ các vai trò liệt kê; vai trò khác được chuyển về trang chủ của chính họ
export default function ProtectedRoute({ roles }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;
  return <Outlet />;
}
