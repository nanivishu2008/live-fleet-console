import type { VehicleListResponse } from "../types/vehicle";

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchVehicles(): Promise<VehicleListResponse> {
  const response = await fetch(
    `${API_URL}/v1/vehicles?limit=100&cursor=0`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch vehicles: ${response.status}`);
  }

  const data: VehicleListResponse = await response.json();

  return data;
}