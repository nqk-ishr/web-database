import { api, call } from "./client";
import { db, derive, mockViolations, wait } from "./mockData";

export const getMyViolations = () => call(() => api.get("/violations/mine"), () => wait(mockViolations()));
// Chi tiết kèm danh sách giao dịch (biên lai)
export const getViolation = (id) =>
  call(() => api.get(`/violations/${id}`), () => {
    const v = db.violations.find((x) => x.violation_id === Number(id));
    return wait(v ? { ...derive(v), violation_type: v.type, payments: db.payments[v.violation_id] ?? [] } : null);
  });
