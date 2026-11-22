import { useEffect, useState } from "react";
import FleetMap from "./components/fleet/FleetMap";
import { useFleetStore } from "./store/fleet.store";

import type { VehicleFilters, VehicleStatus } from "./types/vehicle";

import DashboardHeader from "./components/layout/DashboardHeader";
import FleetSummaryCards from "./components/fleet/FleetSummaryCards";
import VehicleFiltersComponent from "./components/fleet/VehicleFilters";
import VehicleSearch from "./components/fleet/VehicleSearch";
import VehicleList from "./components/fleet/VehicleList";
import VehicleHistoryPanel from "./components/charts/VehicleHistoryPanel";
import AlertsPanel from "./components/alerts/AlertsPanel";

const validStatuses: VehicleStatus[] = [
  "moving",
  "idle",
  "charging",
  "offline",
  "fault",
];

function getFiltersFromURL(): VehicleFilters {
  const params = new URLSearchParams(window.location.search);

  const requestedStatus = params.get("status");

  const status: VehicleStatus | "all" =
    requestedStatus && validStatuses.includes(requestedStatus as VehicleStatus)
      ? (requestedStatus as VehicleStatus)
      : "all";

  return {
    q: params.get("q") ?? "",
    status,
    soc_min: params.get("soc_min") ?? "",
    soc_max: params.get("soc_max") ?? "",
  };
}

function App() {
  const fetchVehicles = useFleetStore((state) => state.fetchVehicles);
  const fetchSummary = useFleetStore((state) => state.fetchSummary);
  const setFilters = useFleetStore((state) => state.setFilters);
  const filters = useFleetStore((state) => state.filters);

  const [initialized, setInitialized] = useState(false);

  // Read filters from URL when the dashboard first loads.
  useEffect(() => {
    const initialFilters = getFiltersFromURL();

    setFilters(initialFilters);
    fetchVehicles(initialFilters);
    fetchSummary();

    setInitialized(true);
  }, [fetchVehicles, fetchSummary, setFilters]);

  // Keep the URL updated whenever filters change.
  useEffect(() => {
    if (!initialized) {
      return;
    }

    const params = new URLSearchParams();

    if (filters.q) {
      params.set("q", filters.q);
    }

    if (filters.status !== "all") {
      params.set("status", filters.status);
    }

    if (filters.soc_min) {
      params.set("soc_min", filters.soc_min);
    }

    if (filters.soc_max) {
      params.set("soc_max", filters.soc_max);
    }

    const queryString = params.toString();

    const newURL = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.replaceState({}, "", newURL);
  }, [filters, initialized]);

  return (
    <main className="min-h-screen bg-[#0c0a09] bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(249,115,22,0.22),rgba(12,10,9,0))] p-4 sm:p-6 text-white selection:bg-orange-500 selection:text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top vibrant orange decorative accent bar */}
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-orange-600 via-amber-400 to-orange-500 shadow-sm shadow-orange-500/50" />

        <DashboardHeader />

        <FleetSummaryCards />

        <FleetMap />

        <VehicleHistoryPanel />
        <AlertsPanel />

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Vehicle Explorer
            </h2>

            <p className="mt-1 text-sm italic text-stone-400">
              Search and monitor your fleet vehicles with real-time telemetry.
            </p>
          </div>

          <VehicleSearch />

          <VehicleFiltersComponent />

          <VehicleList />
        </section>
      </div>
    </main>
  );
}

export default App;