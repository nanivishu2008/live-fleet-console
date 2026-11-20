import type { FleetSummary } from "../types/fleet";

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchFleetSummary(): Promise<FleetSummary> {
  const response = await fetch(`${API_URL}/v1/fleet/summary`);

  if (!response.ok) {
    throw new Error(`Failed to fetch fleet summary: ${response.status}`);
  }

  const data: FleetSummary = await response.json();

  return data;
}