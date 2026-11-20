// Possible states of an electric vehicle
export type VehicleStatus =
  | "moving"
  | "idle"
  | "charging"
  | "offline"
  | "fault";

// Structure of a single vehicle
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