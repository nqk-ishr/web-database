import { api, call } from "./client";
import { buyers, db, mockError, mockRequestDetail, mockRequests, mockVehicles, wait } from "./mockData";

const find = (id) => db.requests.find((r) => r.request_id === Number(id));
const touch = (r, status) => { r.status = status; r.updated_at = new Date().toISOString(); return r; };

export const getVehicleTypes = () => call(() => api.get("/catalog/vehicle-types"), () => wait(db.vehicleTypes));
// Hồ sơ tôi gửi hoặc tôi là bên mua
export const getMyRequests = () => call(() => api.get("/me/requests"), () => wait(mockRequests()));
export const getRequest = (id) => call(() => api.get(`/requests/${id}`), () => wait(mockRequestDetail(id)));

// 201 { request_id, status }; 409 nếu số khung/số máy đã có hoặc đã có hồ sơ mở trùng
export const submitRegistration = (body) =>
  call(() => api.post("/requests/registration", body), () => {
    const type = db.vehicleTypes.find((t) => t.vehicle_type_id === body.vehicle_type_id);
    const r = { request_id: Date.now(), request_type: "new_registration", status: "pending_approval", vehicle_id: null, plate_number: null,
      declared_chassis_number: body.chassis_number, declared_engine_number: body.engine_number, declared_manufacture_year: body.manufacture_year,
      declared_vehicle_type: type?.name ?? null, requester_id: 1, requester_name: "Nguyễn Văn An", buyer_id: null, buyer_name: null,
      review_note: null, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    db.requests.unshift(r);
    return wait({ request_id: r.request_id, status: r.status });
  });

// needs_more_info -> pending_approval
export const resubmitRequest = (id) =>
  call(() => api.post(`/requests/${id}/resubmit`), () => wait({ request_id: id, status: touch(find(id), "pending_approval").status }));

// Rút hồ sơ; lý do không bắt buộc (backend: Optional[Reason], lý do rỗng bị từ chối nên chỉ gửi khi có)
export const cancelRequest = (id, reason) =>
  call(() => api.post(`/requests/${id}/cancel`, reason ? { reason } : undefined),
       () => wait({ request_id: id, status: touch(find(id), "cancelled").status }));

// ---------- sang tên ----------
// Tra người nhận theo CCCD: 200 { user_id, full_name } (chỉ trả mã và tên); 404 nếu không có hoặc là chính mình
export const lookupBuyer = (citizenId) =>
  call(() => api.get("/users/lookup", { params: { citizen_id: citizenId } }), () => {
    const b = buyers[citizenId];
    return b ? wait(b) : wait(null).then(() => { throw mockError(404, "Không tìm thấy chủ xe với số CCCD này"); });
  });

// 201 { request_id, status: "pending_confirmation" }. Backend từ chối (409) nếu xe không "Bình thường",
// còn vi phạm chưa nộp, người gửi không phải chủ hiện hành, hoặc xe đang có hồ sơ mở khác.
export const submitTransfer = ({ vehicle_id, buyer_id }) =>
  call(() => api.post("/requests/transfer", { vehicle_id, buyer_id }), () => {
    const v = mockVehicles().find((x) => x.vehicle_id === vehicle_id);
    if (!v || v.status !== "normal") return wait(null).then(() => { throw mockError(409, "Xe đang ở trạng thái không cho phép sang tên"); });
    if (v.blocking_violations > 0) return wait(null).then(() => { throw mockError(409, "Chủ xe còn vi phạm chưa nộp phạt, không được sang tên"); });
    if (db.requests.some((r) => r.vehicle_id === vehicle_id && ["pending_confirmation", "pending_approval", "needs_more_info"].includes(r.status))) {
      return wait(null).then(() => { throw mockError(409, "Xe đang có hồ sơ khác chưa xử lý xong"); });
    }
    const buyer = Object.values(buyers).find((b) => b.user_id === buyer_id);
    const r = { request_id: Date.now(), request_type: "transfer", status: "pending_confirmation", vehicle_id, plate_number: v.plate_number,
      declared_chassis_number: null, declared_engine_number: null, declared_manufacture_year: null, declared_vehicle_type: null,
      requester_id: 1, requester_name: "Nguyễn Văn An", buyer_id, buyer_name: buyer?.full_name ?? "Người mua", review_note: null,
      submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    db.requests.unshift(r);
    return wait({ request_id: r.request_id, status: r.status });
  });

// Bên mua: pending_confirmation -> pending_approval (xác nhận) hoặc -> cancelled (từ chối)
export const confirmTransfer = (id) =>
  call(() => api.post(`/requests/${id}/confirm`), () => wait({ request_id: id, status: touch(find(id), "pending_approval").status }));
export const declineTransfer = (id) =>
  call(() => api.post(`/requests/${id}/decline`), () => wait({ request_id: id, status: touch(find(id), "cancelled").status }));
