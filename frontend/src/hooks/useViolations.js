import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyViolations } from "../api/violations";
import { payViolation } from "../api/payments";
import { daysBetween } from "../utils/format";

export const useMyViolations = () => useQuery({ queryKey: ["violations"], queryFn: getMyViolations });

export const usePayViolation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payViolation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["violations"] }); qc.invalidateQueries({ queryKey: ["vehicles"] }); },
  });
};

// "Quá hạn" và phạt trễ không lưu trong CSDL: suy ra từ due_date (thống nhất lại với backend nếu API trả sẵn)
const LATE_RATE_PER_DAY = 0.001;
export function enrich(v, today = new Date()) {
  const overdueDays = v.status === "notified" && v.due_date ? Math.max(0, daysBetween(v.due_date, today)) : 0;
  const late_fee = Math.round((v.fine_amount ?? 0) * LATE_RATE_PER_DAY * overdueDays);
  return { ...v, overdueDays, late_fee, isOverdue: overdueDays > 0, canPay: v.status === "notified" };
}
