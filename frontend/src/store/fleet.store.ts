import { create } from "zustand";

import type { Vehicle } from "../types/vehicle";
import type { FleetSummary } from "../types/fleet";

import { fetchVehicles as fetchVehiclesAPI } from "../services/vehicle.api";
import { fetchFleetSummary } from "../services/fleet.api";

interface FleetState {
  vehicles: Vehicle[];
  summary: FleetSummary | null;

  loading: boolean;
  error: string | null;

  fetchVehicles: () => Promise<void>;
  fetchSummary: () => Promise<void>;
}

export const useFleetStore = create<FleetState>((set) => ({
  vehicles: [],
  summary: null,

  loading: false,
  error: null,

  fetchVehicles: async () => {
    try {
      set({ loading: true, error: null });

      const response = await fetchVehiclesAPI();

      set({
        vehicles: response.items,
        loading: false
      });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch vehicles"
      });
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