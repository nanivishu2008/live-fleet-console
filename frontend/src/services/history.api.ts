import type { VehicleHistoryResponse } from "../types/history";

const API_URL = import.meta.env.VITE_API_URL;

interface HistoryParams {
  points?: number;
  from?: string;
  to?: string;
}

export async function fetchVehicleHistory(
  vehicleId: string,
  params: HistoryParams = {}
): Promise<VehicleHistoryResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set(
    "points",
    String(params.points ?? 24)
  );

  if (params.from) {
    searchParams.set("from", params.from);
  }

  if (params.to) {
    searchParams.set("to", params.to);
  }

  const response = await fetch(
    `${API_URL}/v1/vehicles/${encodeURIComponent(vehicleId)}/history?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch vehicle history");
  }

  return response.json() as Promise<VehicleHistoryResponse>;
}