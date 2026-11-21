import { api, call } from "./client";
import { db, wait } from "./mockData";
// Backend: INSERT payments (success) -> UPDATE violations SET status='paid' trong một transaction
export const payViolation = (id) =>
  call(() => api.post(`/violations/${id}/pay`), () => {
    const v = db.violations.find((x) => x.violation_id === id);
    if (v) v.status = "paid";
    return wait({ ok: true });
  });
