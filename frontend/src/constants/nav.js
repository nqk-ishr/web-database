import { ROLES as R } from "./roles";

// Menu theo vai trò. Thêm mục mới ở đây khi một phần của giao diện hoàn thành.
export const NAV = {
  [R.OWNER]: [
    { to: "/", label: "Xe của tôi", end: true },
    { to: "/requests", label: "Hồ sơ của tôi" },
    { to: "/insurance", label: "Bảo hiểm" },
    { to: "/claims", label: "Bồi thường" },
    { to: "/violations", label: "Vi phạm của tôi" },
  ],
  [R.REGISTRAR]: [
    { to: "/registrar/requests", label: "Hồ sơ" },
    { to: "/registrar/vehicles", label: "Tra cứu xe" },
  ],
  [R.VIOLATION_OFFICER]: [
    { to: "/enforcement/violations", label: "Vi phạm" },
    { to: "/enforcement/reports", label: "Báo cáo" },
  ],
  [R.INSURANCE_STAFF]: [
    { to: "/insurer/claims", label: "Yêu cầu bồi thường" },
    { to: "/insurer/reports", label: "Báo cáo" },
  ],
  [R.ADMIN]: [
    { to: "/admin/users", label: "Tài khoản" },
    { to: "/admin/audit", label: "Nhật ký" },
    { to: "/admin/reports", label: "Báo cáo" },
  ],
};
