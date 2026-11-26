import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelRequest, confirmTransfer, declineTransfer, getMyRequests, getRequest, getVehicleTypes, lookupBuyer, resubmitRequest, submitRegistration, submitTransfer } from "../api/requests";

export const useVehicleTypes = () => useQuery({ queryKey: ["vehicle-types"], queryFn: getVehicleTypes, staleTime: 3600_000 });
export const useMyRequests = () => useQuery({ queryKey: ["requests"], queryFn: getMyRequests });
export const useRequest = (id) => useQuery({ queryKey: ["request", id], queryFn: () => getRequest(id) });

function useRequestMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => ["requests", "request", "vehicles"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
export const useSubmitRegistration = () => useRequestMutation(submitRegistration);
export const useResubmit = () => useRequestMutation((id) => resubmitRequest(id));
export const useWithdraw = () => useRequestMutation(({ id, reason }) => cancelRequest(id, reason));

export const useLookupBuyer = () => useMutation({ mutationFn: lookupBuyer });
export const useSubmitTransfer = () => useRequestMutation(submitTransfer);
export const useConfirmTransfer = () => useRequestMutation((id) => confirmTransfer(id));
export const useDeclineTransfer = () => useRequestMutation((id) => declineTransfer(id));
