import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as s from "../api/staff";
import { usePagedQuery } from "./usePagedQuery";

// Mọi khóa của phía quản lý bắt đầu bằng "staff" để một thao tác ghi làm mới toàn bộ danh sách/chi tiết liên quan.
const HOUR = 3600_000;

// ---------- danh mục ----------
export const useVehicleTypes = () => useQuery({ queryKey: ["staff", "catalog", "vehicle-types"], queryFn: s.getVehicleTypes, staleTime: HOUR });
export const useViolationTypes = () => useQuery({ queryKey: ["staff", "catalog", "violation-types"], queryFn: s.getViolationTypes, staleTime: HOUR });
export const useCameras = () => useQuery({ queryKey: ["staff", "catalog", "cameras"], queryFn: s.getCameras, staleTime: HOUR });
export const useRoles = () => useQuery({ queryKey: ["staff", "catalog", "roles"], queryFn: s.getRoles, staleTime: HOUR });
export const useInsurers = () => useQuery({ queryKey: ["staff", "catalog", "insurers"], queryFn: s.getInsurers, staleTime: HOUR });

// ---------- danh sách phân trang ----------
export const useRequestQueue = (initial) => usePagedQuery(["staff", "requests"], s.getRequestQueue, initial);
export const useVehicleSearch = (initial) => usePagedQuery(["staff", "vehicles"], s.searchVehicles, initial);
export const useViolationQueue = (initial) => usePagedQuery(["staff", "violations"], s.getViolationQueue, initial);
export const useClaimQueue = (initial) => usePagedQuery(["staff", "claims"], s.getClaimQueue, initial);
export const useUsers = (initial) => usePagedQuery(["staff", "users"], s.getUsers, initial);
export const useAuditLog = (initial) => usePagedQuery(["staff", "audit"], s.getAuditLog, initial);

// ---------- chi tiết ----------
const detail = (name, fn) => (id, enabled = true) =>
  useQuery({ queryKey: ["staff", name, String(id)], queryFn: () => fn(id), enabled: enabled && id != null });
export const useRequestDetail = detail("request", s.getRequestDetail);
export const useVehicle = detail("vehicle", s.getVehicle);
export const useOwnership = detail("ownership", s.getOwnership);
export const useVehicleHistory = detail("vehicle-history", s.getVehicleHistory);
export const useViolationDetail = detail("violation", s.getViolationDetail);
export const useClaimDetail = detail("claim", s.getClaimDetail);
export const usePolicyDetail = detail("policy", s.getPolicyDetail);
export const useUser = detail("user", s.getUser);

// ---------- báo cáo ----------
export const useViolationReport = (params) =>
  useQuery({ queryKey: ["staff", "report", "violations", params], queryFn: () => s.getViolationReport(params) });
export const useUnpaidFinesReport = () => useQuery({ queryKey: ["staff", "report", "unpaid"], queryFn: s.getUnpaidFinesReport });
export const useInsuranceReport = () => useQuery({ queryKey: ["staff", "report", "insurance"], queryFn: s.getInsuranceReport });

// ---------- thao tác ghi: xong (kể cả lỗi 409 do người khác vừa xử lý) thì làm mới dữ liệu phía quản lý ----------
function useStaffMutation(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: ["staff"] }) });
}
export const useApproveRequest = () => useStaffMutation(({ id, plate }) => s.approveRequest(id, plate));
export const useRejectRequest = () => useStaffMutation(({ id, note }) => s.rejectRequest(id, note));
export const useRequestMoreInfo = () => useStaffMutation(({ id, note }) => s.requestMoreInfo(id, note));
export const useVehicleFound = () => useStaffMutation(({ id, reason }) => s.markVehicleFound(id, reason));
export const useRevokeVehicle = () => useStaffMutation(({ id, reason }) => s.revokeVehicle(id, reason));

export const useRecordViolation = () => useStaffMutation(s.recordViolation);
export const useVerifyViolation = () => useStaffMutation((id) => s.verifyViolation(id));
export const useNotifyViolation = () => useStaffMutation(({ id, ...body }) => s.notifyViolation(id, body));
export const useCancelViolation = () => useStaffMutation(({ id, reason }) => s.cancelViolation(id, reason));

export const useApproveClaim = () => useStaffMutation(({ id, ...body }) => s.approveClaim(id, body));
export const useRejectClaim = () => useStaffMutation(({ id, note }) => s.rejectClaim(id, note));
export const useClaimMoreInfo = () => useStaffMutation(({ id, note }) => s.claimMoreInfo(id, note));
export const usePayClaim = () => useStaffMutation((id) => s.payClaim(id));

export const useCreateUser = () => useStaffMutation(s.createUser);
export const useUpdateUser = () => useStaffMutation(({ id, ...body }) => s.updateUser(id, body));
export const useSetUserActive = () => useStaffMutation(({ id, active }) => s.setUserActive(id, active));
export const useResetPassword = () => useStaffMutation((id) => s.resetUserPassword(id));
