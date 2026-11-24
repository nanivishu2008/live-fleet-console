import { useEffect, useState } from "react";
import FleetMap from "./components/fleet/FleetMap";
import { useFleetStore } from "./store/fleet.store";
import { useSelectionStore } from "./store/selection.store";

import type { VehicleFilters, VehicleStatus } from "./types/vehicle";

import DashboardHeader from "./components/layout/DashboardHeader";
import ConnectionBanner from "./components/layout/ConnectionBanner";
import FaultTogglePanel from "./components/layout/FaultTogglePanel";
import AccessibilityAnnouncer from "./components/layout/AccessibilityAnnouncer";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";

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
  const initFleetData = useFleetStore((state) => state.initFleetData);
  const stopStream = useFleetStore((state) => state.stopStream);
  const setFilters = useFleetStore((state) => state.setFilters);
  const filters = useFleetStore((state) => state.filters);

  const selectedVehicleId = useSelectionStore((state) => state.selectedVehicleId);
  const chartWindow = useSelectionStore((state) => state.chartWindow);
  const syncFromUrl = useSelectionStore((state) => state.syncFromUrl);

  const [initialized, setInitialized] = useState(false);

  // Initialize data and stream
  useEffect(() => {
    const initialFilters = getFiltersFromURL();
    setFilters(initialFilters);
    syncFromUrl();
    initFleetData();
    setInitialized(true);

    // Browser back/forward navigation listener (popstate)
    const handlePopState = () => {
      const poppedFilters = getFiltersFromURL();
      setFilters(poppedFilters);
      syncFromUrl();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      stopStream();
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Sync URL when filters change
  useEffect(() => {
    if (!initialized) return;

    const params = new URLSearchParams(window.location.search);

    if (filters.q) params.set("q", filters.q);
    else params.delete("q");

    if (filters.status !== "all") params.set("status", filters.status);
    else params.delete("status");

    if (filters.soc_min) params.set("soc_min", filters.soc_min);
    else params.delete("soc_min");

    if (filters.soc_max) params.set("soc_max", filters.soc_max);
    else params.delete("soc_max");

    if (selectedVehicleId) params.set("selected", selectedVehicleId);
    else params.delete("selected");

    if (chartWindow) params.set("window", chartWindow);

    const queryString = params.toString();
    const newURL = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.replaceState({}, "", newURL);
  }, [filters, selectedVehicleId, chartWindow, initialized]);

  return (
    <main className="min-h-screen bg-[#0c0a09] bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(249,115,22,0.22),rgba(12,10,9,0))] p-3 sm:p-6 text-white selection:bg-orange-500 selection:text-white">
      <AccessibilityAnnouncer />

      <div className="mx-auto max-w-7xl space-y-5">
        {/* Top vibrant orange decorative accent bar */}
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-orange-600 via-amber-400 to-orange-500 shadow-sm shadow-orange-500/50" />

        {/* Real-time Connection / Disconnected Warning Banner */}
        <ConnectionBanner />

        {/* Dashboard Header */}
        <DashboardHeader />

        {/* Simulator Fault Injection Controls */}
        <FaultTogglePanel />

        {/* Summary KPI Cards */}
        <ErrorBoundary>
          <FleetSummaryCards />
        </ErrorBoundary>

        {/* Side-by-Side: Live Fleet Map & Live Vehicle List */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            <ErrorBoundary>
              <FleetMap />
            </ErrorBoundary>
          </div>

          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-xl border border-stone-800/90 bg-stone-900/80 p-3.5 shadow-xl backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Vehicle Explorer
                  </h2>
                  <p className="text-xs italic text-stone-400">
                    Live telemetry stream & keyboard accessible navigation.
                  </p>
                </div>
              </div>

              <VehicleSearch />
              <VehicleFiltersComponent />
            </div>

            <ErrorBoundary>
              <VehicleList />
            </ErrorBoundary>
          </div>
        </section>

        {/* Vehicle Telemetry Dynamics & Charts */}
        <ErrorBoundary>
          <VehicleHistoryPanel />
        </ErrorBoundary>

        {/* Fleet Alert Management */}
        <ErrorBoundary>
          <AlertsPanel />
        </ErrorBoundary>
      </div>
    </main>
  );
}

export default App;
