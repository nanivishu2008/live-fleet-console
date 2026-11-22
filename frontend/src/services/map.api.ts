import type { MapVehiclesResponse } from "../types/map";

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchMapVehicles(): Promise<MapVehiclesResponse> {
  const response = await fetch(`${API_URL}/v1/vehicles/locations`);

  if (!response.ok) {
    throw new Error("Failed to fetch map vehicles");
  }

  return response.json() as Promise<MapVehiclesResponse>;
}