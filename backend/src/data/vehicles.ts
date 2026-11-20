import type { Vehicle, VehicleStatus } from "../types/vehicle.types.js";

// All possible vehicle statuses
const statuses: VehicleStatus[] = [
  "moving",
  "idle",
  "charging",
  "offline",
  "fault"
];

// Generate a random number between min and max
function randomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Generate a random integer between min and max
function randomInteger(min: number, max: number): number {
  return Math.floor(randomNumber(min, max + 1));
}

// Pick a random vehicle status
function randomStatus(): VehicleStatus {
  const index = randomInteger(0, statuses.length - 1);
  return statuses[index]!;
}

// Generate one vehicle
function generateVehicle(index: number): Vehicle {
  const status = randomStatus();

  let speed = 0;

  if (status === "moving") {
    speed = randomNumber(10, 60);
  }

  return {
    vehicle_id: `VG-${String(index + 1).padStart(5, "0")}`,

    status,

    soc_pct: Number(randomNumber(15, 100).toFixed(1)),

    battery_temp_c: Number(randomNumber(25, 50).toFixed(1)),

    speed_kmh: Number(speed.toFixed(1)),

    // Approximate coordinates around Chennai
    lat: Number(randomNumber(12.85, 13.20).toFixed(6)),

    lng: Number(randomNumber(80.10, 80.35).toFixed(6)),

    updated_at: new Date(
      Date.now() - randomInteger(0, 60_000)
    ).toISOString()
  };
}

// Generate the complete fleet
export function generateVehicles(count: number): Vehicle[] {
  const vehicles: Vehicle[] = [];

  for (let i = 0; i < count; i++) {
    vehicles.push(generateVehicle(i));
  }

  return vehicles;
}

// Create 2,000 vehicles when the module loads
export const vehicles = generateVehicles(2000);