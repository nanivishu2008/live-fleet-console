import type { VehicleHistoryResponse, TelemetryPoint } from "../types/history";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  if (params.points !== undefined) {
    searchParams.set("points", String(params.points));
  }

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
    throw new Error(`Failed to fetch vehicle history: ${response.statusText}`);
  }

  const data = await response.json();

  // Handle either a plain array of { ts, soc_pct, battery_temp_c, speed_kmh } or { history: [...] }
  const rawList: any[] = Array.isArray(data) ? data : (data.history ?? []);

  const history: TelemetryPoint[] = rawList.map((item) => ({
    ts: item.ts || item.timestamp || new Date().toISOString(),
    timestamp: item.ts || item.timestamp,
    soc_pct: Number(item.soc_pct),
    battery_temp_c: Number(item.battery_temp_c),
    speed_kmh: Number(item.speed_kmh),
    gap: item.gap ?? false,
  }));

  return {
    success: true,
    vehicle_id: vehicleId,
    history,
  };
}
