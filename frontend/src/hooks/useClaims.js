import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClaim, getMyClaims, submitClaim, supplementClaim, withdrawClaim } from "../api/claims";
import { decorateClaim } from "../utils/claims";

export const useMyClaims = () => useQuery({ queryKey: ["claims"], queryFn: getMyClaims, select: (rows) => rows.map(decorateClaim) });
export const useClaim = (id) => useQuery({ queryKey: ["claim", id], queryFn: () => getClaim(id), select: decorateClaim });

function useClaimMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => ["claims", "claim", "policy", "policies"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
export const useSubmitClaim = () => useClaimMutation(submitClaim);
export const useSupplementClaim = () => useClaimMutation(({ id, description }) => supplementClaim(id, description));
export const useWithdrawClaim = () => useClaimMutation(({ id, reason }) => withdrawClaim(id, reason));
