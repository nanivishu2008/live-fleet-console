import { create } from "zustand";

import type {
  Vehicle,
  VehicleFilters
} from "../types/vehicle";

import type { FleetSummary } from "../types/fleet";

import { fetchVehicles as fetchVehiclesAPI } from "../services/vehicle.api";
import { fetchFleetSummary } from "../services/fleet.api";

interface FleetState {
  vehicles: Vehicle[];
  summary: FleetSummary | null;

  filters: VehicleFilters;
  nextCursor: string | null;

  loading: boolean;
  loadingMore: boolean;
  error: string | null;

  fetchVehicles: (
    filters?: VehicleFilters,
    append?: boolean
  ) => Promise<void>;

  loadMore: () => Promise<void>;

  setFilters: (filters: VehicleFilters) => void;

  fetchSummary: () => Promise<void>;
}

// Prevent older API requests from overwriting newer results.
let latestRequestId = 0;

export const useFleetStore = create<FleetState>((set, get) => ({
  vehicles: [],
  summary: null,

  filters: {
    q: "",
    status: "all",
    soc_min: "",
    soc_max: ""
  },

  nextCursor: null,

  loading: false,
  loadingMore: false,
  error: null,

  setFilters: (filters) => {
    set({ filters });
  },

  fetchVehicles: async (
    filters = get().filters,
    append = false
  ) => {
    if (append && (!get().nextCursor || get().loadingMore)) {
      return;
    }

    const requestId = ++latestRequestId;

    set({
      ...(append
        ? { loadingMore: true }
        : {
            loading: true,
            vehicles: [],
            nextCursor: null
          }),
      error: null
    });

    try {
      const cursor = append ? get().nextCursor : null;

      const response = await fetchVehiclesAPI(filters, cursor);

      // Ignore outdated responses.
      if (requestId !== latestRequestId) {
        return;
      }

      set((state) => ({
        vehicles: append
          ? [
              ...state.vehicles,
              ...response.items.filter(
                (newVehicle) =>
                  !state.vehicles.some(
                    (vehicle) =>
                      vehicle.vehicle_id === newVehicle.vehicle_id
                  )
              )
            ]
          : response.items,

        nextCursor: response.next_cursor,
        loading: false,
        loadingMore: false
      }));

    } catch (error) {
      if (requestId !== latestRequestId) {
        return;
      }

      set({
        loading: false,
        loadingMore: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch vehicles"
      });
    }
  },

  loadMore: async () => {
    const { filters, fetchVehicles, nextCursor } = get();

    if (nextCursor) {
      await fetchVehicles(filters, true);
    }
  },

  fetchSummary: async () => {
    try {
      const response = await fetchFleetSummary();

      set({ summary: response });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch fleet summary"
      });
    }
  }
}));