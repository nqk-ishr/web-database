import { api, call } from "./client";
import { db, derive, wait } from "./mockData";

// Backend: INSERT payments + UPDATE violations trong một transaction; nộp hai lần => 409.
// Phản hồi 200: { payment_id, total_amount, status: "success"|"failed", gateway_ref, violation_status }
// (status "failed" vẫn là HTTP 200: cổng thanh toán lỗi, vi phạm giữ nguyên "notified")
export const payViolation = (id, { simulate_fail = false } = {}) =>
  call(() => api.post(`/violations/${id}/pay`, { simulate_fail }), () => {
    const v = db.violations.find((x) => x.violation_id === id);
    const d = derive(v);
    const status = simulate_fail ? "failed" : "success";
    const pay = { payment_id: Date.now(), fine_amount: v.fine_amount, late_fee: d.late_fee, total_amount: v.fine_amount + d.late_fee,
      status, gateway_ref: `TXN-MOCK-${String(Date.now()).slice(-6)}`, created_at: new Date().toISOString(), paid_at: status === "success" ? new Date().toISOString() : null };
    (db.payments[id] ??= []).push(pay);
    if (status === "success") v.status = "paid";
    return wait({ payment_id: pay.payment_id, total_amount: pay.total_amount, status, gateway_ref: pay.gateway_ref, violation_status: v.status });
  });
