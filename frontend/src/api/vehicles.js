import { api, call } from "./client";
import { db, wait } from "./mockData";
export const getMyVehicles = () => call(() => api.get("/vehicles/mine"), () => wait(db.vehicles));
export const getVehicle = (id) => call(() => api.get(`/vehicles/${id}`), () => wait(db.vehicles.find((v) => v.vehicle_id === Number(id))));
export const getOwnershipHistory = (id) => call(() => api.get(`/vehicles/${id}/ownership`), () => wait(db.owners[id] ?? []));
