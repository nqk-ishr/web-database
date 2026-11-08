import { useQuery } from "@tanstack/react-query";
import { getMyVehicles, getVehicle, getOwnershipHistory } from "../api/vehicles";
export const useMyVehicles = () => useQuery({ queryKey: ["vehicles"], queryFn: getMyVehicles });
export const useVehicle = (id) => useQuery({ queryKey: ["vehicle", id], queryFn: () => getVehicle(id) });
export const useOwnership = (id) => useQuery({ queryKey: ["ownership", id], queryFn: () => getOwnershipHistory(id) });
