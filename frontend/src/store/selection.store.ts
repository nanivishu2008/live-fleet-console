import { create } from "zustand";

interface SelectionState {
  selectedVehicleId: string | null;
  chartWindow: "15m" | "1h" | "6h" | "24h";
  selectVehicle: (id: string | null) => void;
  setChartWindow: (window: "15m" | "1h" | "6h" | "24h") => void;
  syncFromUrl: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedVehicleId: null,
  chartWindow: "24h",

  selectVehicle: (id) => {
    set({ selectedVehicleId: id });
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("selected", id);
    } else {
      url.searchParams.delete("selected");
    }
    window.history.pushState({}, "", url.toString());
  },

  setChartWindow: (windowParam) => {
    set({ chartWindow: windowParam });
    const url = new URL(window.location.href);
    url.searchParams.set("window", windowParam);
    window.history.pushState({}, "", url.toString());
  },

  syncFromUrl: () => {
    const params = new URLSearchParams(window.location.search);
    const selected = params.get("selected");
    const windowParam = params.get("window");
    set({
      selectedVehicleId: selected || null,
      chartWindow: (windowParam === "15m" || windowParam === "1h" || windowParam === "6h" || windowParam === "24h")
        ? windowParam
        : "24h",
    });
  },
}));
