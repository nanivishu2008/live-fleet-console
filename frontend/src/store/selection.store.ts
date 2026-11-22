import { create } from "zustand";

interface SelectionState {
  selectedVehicleId: string | null;
  selectVehicle: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedVehicleId: null,

  selectVehicle: (id) => {
    set({ selectedVehicleId: id });
  },
}));