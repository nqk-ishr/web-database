import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyViolations, getViolation } from "../api/violations";
import { payViolation } from "../api/payments";
import { decorate, normalizeDetail } from "../utils/violations";

export const useMyViolations = () =>
  useQuery({ queryKey: ["violations"], queryFn: getMyViolations, select: (rows) => rows.map((v) => decorate(v)) });

export const useViolation = (id) =>
  useQuery({ queryKey: ["violation", id], queryFn: () => getViolation(id), select: (d) => normalizeDetail(d) });

// mutate({ id, simulate_fail? }). Làm mới danh sách cả khi lỗi (vd. 409 đã nộp ở thiết bị khác).
export const usePayViolation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, simulate_fail }) => payViolation(id, { simulate_fail }),
    onSettled: () => {
      ["violations", "violation", "vehicles", "vehicle"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
};
