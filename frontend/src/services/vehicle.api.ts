import type {
  VehicleFilters,
  VehicleListResponse
} from "../types/vehicle";

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchVehicles(
  filters: VehicleFilters,
  cursor: string | null = null
): Promise<VehicleListResponse> {

  const params = new URLSearchParams();

  params.set("limit", "100");
  params.set("cursor", cursor ?? "0");

  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.soc_min !== "") {
    params.set("soc_min", filters.soc_min);
  }

  if (filters.soc_max !== "") {
    params.set("soc_max", filters.soc_max);
  }

  const response = await fetch(
    `${API_URL}/v1/vehicles?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch vehicles: ${response.status}`);
  }

  return response.json() as Promise<VehicleListResponse>;
}