import type { Vehicle } from "./vehicle.types.js";
import type { Alert } from "./alert.types.js";

// Event sent whenever vehicle information changes
export interface VehicleUpdatedEvent {
  id: string;
  type: "vehicle.updated";
  payload: Vehicle;
}

// Event sent whenever an alert changes
export interface AlertChangedEvent {
  id: string;
  type: "alert.changed";
  payload: Alert;
}

// Union of all supported fleet events
export type FleetEvent =
  | VehicleUpdatedEvent
  | AlertChangedEvent;