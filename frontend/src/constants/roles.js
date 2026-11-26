export const ROLES = { OWNER: "owner", REGISTRAR: "registrar", VIOLATION_OFFICER: "violation_officer", INSURANCE_STAFF: "insurance_staff", ADMIN: "admin" };

export const ROLE_LABELS = {
  owner: "Chủ xe",
  registrar: "Cán bộ đăng ký",
  violation_officer: "Cán bộ xử lý vi phạm",
  insurance_staff: "Nhân viên bảo hiểm",
  admin: "Quản trị viên",
};

// Trang chủ của từng vai trò (sau khi đăng nhập, hoặc khi vào trang không thuộc quyền)
const HOME = {
  owner: "/",
  registrar: "/registrar/requests",
  violation_officer: "/enforcement/violations",
  insurance_staff: "/insurer/claims",
  admin: "/admin/users",
};
export const isKnownRole = (role) => Object.prototype.hasOwnProperty.call(HOME, role);
export const homePath = (role) => HOME[role] ?? "/login";
