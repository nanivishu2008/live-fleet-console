import { useEffect } from "react";

import { useFleetStore } from "./store/fleet.store";

import DashboardHeader from "./components/layout/DashboardHeader";
import FleetSummaryCards from "./components/fleet/FleetSummaryCards";

function App() {
  const fetchVehicles = useFleetStore((state) => state.fetchVehicles);
  const fetchSummary = useFleetStore((state) => state.fetchSummary);

  const error = useFleetStore((state) => state.error);

  useEffect(() => {
    fetchVehicles();
    fetchSummary();
  }, [fetchVehicles, fetchSummary]);

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white sm:p-8">
      <div className="mx-auto max-w-[1600px] space-y-8">

        <DashboardHeader />

        <section>
          <h2 className="mb-4 text-lg font-semibold">
            Fleet Overview
          </h2>

          <FleetSummaryCards />
        </section>

        {error && (
          <p className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

      </div>
    </main>
  );
}

export default App;