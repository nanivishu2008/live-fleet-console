export interface FleetSummary {
  success: boolean;
  data: {
    total_vehicles: number;
    moving: number;
    idle: number;
    charging: number;
    offline: number;
    fault: number;
    average_soc: number;
  };
}