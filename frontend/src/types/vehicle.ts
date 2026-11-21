export type VehicleStatus =
  | "moving"
  | "idle"
  | "charging"
  | "offline"
  | "fault";

export interface Vehicle {
  vehicle_id: string;
  status: VehicleStatus;
  soc_pct: number;
  battery_temp_c: number;
  speed_kmh: number;
  lat: number;
  lng: number;
  updated_at: string;
}

export interface VehicleListResponse {
  success: boolean;
  total: number;
  items: Vehicle[];
  next_cursor: string | null;
}

export interface VehicleFilters {
  q: string;
  status: VehicleStatus | "all";
  soc_min: string;
  soc_max: string;
}