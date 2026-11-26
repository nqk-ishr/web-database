import { api, call } from "./client";
import { db, mockVehicles, wait } from "./mockData";

export const getMyVehicles = () => call(() => api.get("/vehicles/mine"), () => wait(mockVehicles()));
export const getVehicle = (id) => call(() => api.get(`/vehicles/${id}`), () => wait(mockVehicles().find((v) => v.vehicle_id === Number(id))));
export const getOwnershipHistory = (id) => call(() => api.get(`/vehicles/${id}/ownership`), () => wait(db.owners[id] ?? []));
// Lịch sử sự kiện: đăng ký, sang tên, báo mất, tìm thấy, thu hồi
export const getVehicleHistory = (id) => call(() => api.get(`/vehicles/${id}/history`), () => wait(db.history[id] ?? []));
