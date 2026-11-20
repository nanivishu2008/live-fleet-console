import type { Alert } from "../types/alert.types.js";
import { vehicles } from "./vehicles.js";

const rules = [
  "battery_temperature_high",
  "low_battery",
  "vehicle_offline",
  "motor_fault",
];

export const alerts: Alert[] = vehicles
  .slice(0, 40)
  .map((vehicle, index) => ({
    id: `ALT-${String(index + 1).padStart(5, "0")}`,
    vehicle_id: vehicle.vehicle_id,
    rule: rules[index % rules.length],
    state: index % 3 === 0 ? "acknowledged" : "open",
    opened_at: new Date(
      Date.now() - Math.random() * 24 * 60 * 60 * 1000
    ).toISOString(),
    version: 1,
  }));