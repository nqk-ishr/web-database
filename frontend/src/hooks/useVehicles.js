import { useQuery } from "@tanstack/react-query";
import { getMyVehicles, getVehicle, getOwnershipHistory, getVehicleHistory } from "../api/vehicles";

export const useMyVehicles = () => useQuery({ queryKey: ["vehicles"], queryFn: getMyVehicles });
export const useVehicle = (id) => useQuery({ queryKey: ["vehicle", id], queryFn: () => getVehicle(id) });
export const useOwnership = (id) => useQuery({ queryKey: ["ownership", id], queryFn: () => getOwnershipHistory(id), enabled: Boolean(id) });
export const useVehicleHistory = (id) => useQuery({ queryKey: ["vehicle-history", id], queryFn: () => getVehicleHistory(id) });
