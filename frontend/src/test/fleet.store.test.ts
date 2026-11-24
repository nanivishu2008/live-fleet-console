import { describe, it, expect, beforeEach } from "vitest";
import { useFleetStore } from "../store/fleet.store";
import type { Vehicle } from "../types/vehicle";

describe("fleet.store - event ordering and deduplication", () => {
  const baseVehicle: Vehicle = {
    vehicle_id: "VG-00001",
    status: "moving",
    soc_pct: 85,
    battery_temp_c: 28,
    speed_kmh: 45,
    lat: 13.08,
    lng: 80.27,
    updated_at: "2026-11-24T10:00:00.000Z",
  };

  beforeEach(() => {
    // Reset store state
    useFleetStore.setState({
      allVehicles: new Map(),
      vehicles: [],
      droppedDuplicatesCount: 0,
      droppedOutOfOrderCount: 0,
    });
  });

  it("applies new valid vehicle telemetry events", () => {
    const store = useFleetStore.getState();
    const accepted = store.applyVehicleUpdate(101, {
      ...baseVehicle,
      updated_at: "2026-11-24T10:00:00.000Z",
    });

    expect(accepted).toBe(true);
  });

  it("drops duplicate events with the same event ID", () => {
    const store = useFleetStore.getState();
    const eventId = 205;

    const first = store.applyVehicleUpdate(eventId, {
      ...baseVehicle,
      updated_at: "2026-11-24T10:01:00.000Z",
    });
    expect(first).toBe(true);

    // Second call with same event ID should be rejected
    const second = store.applyVehicleUpdate(eventId, {
      ...baseVehicle,
      updated_at: "2026-11-24T10:01:01.000Z",
    });
    expect(second).toBe(false);
    expect(useFleetStore.getState().droppedDuplicatesCount).toBe(1);
  });

  it("drops older out-of-order events based on updated_at timestamp", () => {
    const store = useFleetStore.getState();

    // Latest event arrived first (10:05:00)
    const newerAccepted = store.applyVehicleUpdate(301, {
      ...baseVehicle,
      updated_at: "2026-11-24T10:05:00.000Z",
      soc_pct: 80,
    });
    expect(newerAccepted).toBe(true);

    // Delayed older event arrives later (10:02:00)
    const olderAccepted = store.applyVehicleUpdate(302, {
      ...baseVehicle,
      updated_at: "2026-11-24T10:02:00.000Z",
      soc_pct: 83,
    });
    expect(olderAccepted).toBe(false);
    expect(useFleetStore.getState().droppedOutOfOrderCount).toBe(1);
  });
});
