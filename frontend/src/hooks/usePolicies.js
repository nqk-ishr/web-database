import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buyPolicy, cancelPolicy, getMyPolicies, getPolicy, getProducts, payPolicy } from "../api/policies";
import { decoratePolicy } from "../utils/policies";

export const useMyPolicies = () =>
  useQuery({ queryKey: ["policies"], queryFn: getMyPolicies, select: (rows) => rows.map((p) => decoratePolicy(p)) });
export const usePolicy = (id) =>
  useQuery({ queryKey: ["policy", id], queryFn: () => getPolicy(id), select: (p) => decoratePolicy(p) });
export const useProducts = (vehicleId) =>
  useQuery({ queryKey: ["products", vehicleId], queryFn: () => getProducts(vehicleId), enabled: Boolean(vehicleId) });

// Mua / thanh toán / hủy đều đổi trạng thái hợp đồng và "policy" hiển thị trên xe
function usePolicyMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => ["policies", "policy", "vehicles", "vehicle"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
export const useBuyPolicy = () => usePolicyMutation(buyPolicy);
export const usePayPolicy = () => usePolicyMutation(({ id, simulate_fail }) => payPolicy(id, { simulate_fail }));
export const useCancelPolicy = () => usePolicyMutation((id) => cancelPolicy(id));
