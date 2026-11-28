// API phía quản lý (cán bộ đăng ký, cán bộ xử lý vi phạm, nhân viên bảo hiểm, quản trị).
// Luôn gọi backend thật: phía quản lý không có dữ liệu giả lập.
// Danh sách trả về dạng phân trang { items, total, page, size, pages }.
import { api } from "./client";
import { clean } from "../utils/params";

const get = (url, params) => api.get(url, { params: params && clean(params) }).then((r) => r.data);
const post = (url, body) => api.post(url, body).then((r) => r.data);
const patch = (url, body) => api.patch(url, body).then((r) => r.data);

// ---------- danh mục ----------
export const getVehicleTypes = () => get("/catalog/vehicle-types");
export const getViolationTypes = () => get("/catalog/violation-types");
export const getCameras = () => get("/catalog/cameras");

// ---------- cán bộ đăng ký: hồ sơ đăng ký mới / sang tên ----------
export const getRequestQueue = (p) => get("/requests", p);
export const getRequestDetail = (id) => get(`/requests/${id}`);
// Đăng ký mới: bắt buộc plate_number (cấp biển số). Sang tên: gửi {}.
export const approveRequest = (id, plate_number) => post(`/requests/${id}/approve`, plate_number ? { plate_number } : {});
export const rejectRequest = (id, note) => post(`/requests/${id}/reject`, { note });
export const requestMoreInfo = (id, note) => post(`/requests/${id}/request-info`, { note });

// ---------- tra cứu xe; xe Báo mất: tìm thấy / thu hồi ----------
export const searchVehicles = (p) => get("/vehicles", p);
export const getVehicle = (id) => get(`/vehicles/${id}`);
export const getOwnership = (id) => get(`/vehicles/${id}/ownership`);
export const getVehicleHistory = (id) => get(`/vehicles/${id}/history`);
export const markVehicleFound = (id, reason) => post(`/vehicles/${id}/found`, { reason });
export const revokeVehicle = (id, reason) => post(`/vehicles/${id}/revoke`, { reason });

// ---------- cán bộ xử lý vi phạm ----------
export const getViolationQueue = (p) => get("/violations", p);
export const getViolationDetail = (id) => get(`/violations/${id}`);
// body: { plate_number, violation_type_id, camera_id, occurred_at (ISO) }
export const recordViolation = (body) => post("/violations", body);
// 200 { violation_id, status, warnings: [chuỗi] }: cảnh báo không chặn thao tác
export const verifyViolation = (id) => post(`/violations/${id}/verify`);
export const notifyViolation = (id, body) => post(`/violations/${id}/notify`, body);   // { fine_amount, due_date }
export const cancelViolation = (id, reason) => post(`/violations/${id}/cancel`, { reason });

// ---------- nhân viên bảo hiểm ----------
export const getClaimQueue = (p) => get("/claims", p);
export const getClaimDetail = (id) => get(`/claims/${id}`);
export const getPolicyDetail = (id) => get(`/policies/${id}`);
export const approveClaim = (id, body) => post(`/claims/${id}/approve`, body);          // { approved_amount, note? }
export const rejectClaim = (id, note) => post(`/claims/${id}/reject`, { note });
export const claimMoreInfo = (id, note) => post(`/claims/${id}/request-info`, { note });
export const payClaim = (id) => post(`/claims/${id}/pay`);

// ---------- báo cáo ----------
export const getViolationReport = (p) => get("/reports/violations", p);
export const getUnpaidFinesReport = () => get("/reports/unpaid-fines");
export const getInsuranceReport = () => get("/reports/insurance");

// ---------- quản trị ----------
export const getRoles = () => get("/admin/roles");
export const getInsurers = () => get("/admin/insurers");
export const getUsers = (p) => get("/admin/users", p);
export const getUser = (id) => get(`/admin/users/${id}`);
// Bỏ trống password => backend sinh mật khẩu tạm, trả về một lần trong temporary_password
export const createUser = (body) => post("/admin/users", body);
export const updateUser = (id, body) => patch(`/admin/users/${id}`, body);
export const setUserActive = (id, active) => post(`/admin/users/${id}/${active ? "activate" : "deactivate"}`);
export const resetUserPassword = (id) => post(`/admin/users/${id}/reset-password`, {});
export const getAuditLog = (p) => get("/admin/audit-log", p);
