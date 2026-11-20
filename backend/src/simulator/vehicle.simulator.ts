import { vehicles } from "../data/vehicles.js";
import type { Vehicle } from "../types/vehicle.types.js";

// Number of vehicles updated in one batch
const BATCH_SIZE = 100;

// Time between batches
const INTERVAL_MS = 250;

// Tracks the next vehicle to update
let currentIndex = 0;

// Prevents multiple simulator instances
let simulatorStarted = false;

// Subscribers will receive vehicle updates.
// We'll connect this to SSE in the next step.
type VehicleUpdateListener = (vehicle: Vehicle) => void;

const listeners = new Set<VehicleUpdateListener>();

export function onVehicleUpdated(
  listener: VehicleUpdateListener
): () => void {
  listeners.add(listener);

  // Return a function to unsubscribe
  return () => {
    listeners.delete(listener);
  };
}

// Generate a random number within a range
function randomNumber(
  min: number,
  max: number
): number {
  return Math.random() * (max - min) + min;
}

// Keep a value inside a given range
function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(max, Math.max(min, value));
}

// Update one vehicle's telemetry
function updateVehicle(vehicle: Vehicle): void {
  // Update battery charge
  if (vehicle.status === "moving") {
    vehicle.soc_pct = clamp(
      vehicle.soc_pct - randomNumber(0.01, 0.05),
      0,
      100
    );
  } else if (vehicle.status === "charging") {
    vehicle.soc_pct = clamp(
      vehicle.soc_pct + randomNumber(0.05, 0.15),
      0,
      100
    );
  }

  // Update battery temperature
  vehicle.battery_temp_c = Number(
    clamp(
      vehicle.battery_temp_c + randomNumber(-0.5, 0.5),
      15,
      65
    ).toFixed(1)
  );

  // Update vehicle speed
  if (vehicle.status === "moving") {
    vehicle.speed_kmh = Number(
      randomNumber(10, 60).toFixed(1)
    );
  } else {
    vehicle.speed_kmh = 0;
  }

  // Update timestamp
  vehicle.updated_at = new Date().toISOString();

  // Notify subscribers
  for (const listener of listeners) {
    listener(vehicle);
  }
}

// Start the simulator
export function startVehicleSimulator(): void {
  if (simulatorStarted) {
    return;
  }

  simulatorStarted = true;

  console.log("Vehicle simulator started");

  setInterval(() => {
    for (let i = 0; i < BATCH_SIZE; i++) {
      const vehicle = vehicles[currentIndex];

      if (vehicle) {
        updateVehicle(vehicle);
      }

      // Move to the next vehicle
      currentIndex = (currentIndex + 1) % vehicles.length;
    }
  }, INTERVAL_MS);
}