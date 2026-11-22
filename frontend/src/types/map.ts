import type { VehicleStatus } from "./vehicle";

export interface MapVehicle {
  vehicle_id: string;
  status: VehicleStatus;
  lat: number;
  lng: number;
  updated_at:string;
}

export interface MapVehiclesResponse {
  success: boolean;
  total: number;
  items: MapVehicle[];
}

export interface VehicleUpdateEvent {
  vehicle_id: string;
  status: VehicleStatus;
  lat: number;
  lng: number;
  soc_pct: number;
  battery_temp_c: number;
  speed_kmh: number;
  updated_at: string;
}