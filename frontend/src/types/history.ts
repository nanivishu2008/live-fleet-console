export interface TelemetryPoint {
  ts: string;
  timestamp?: string;
  soc_pct: number;
  battery_temp_c: number;
  speed_kmh: number;
  gap?: boolean;
}

export interface VehicleHistoryResponse {
  success: boolean;
  vehicle_id: string;
  history: TelemetryPoint[];
}
