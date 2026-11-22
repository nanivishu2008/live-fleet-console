import { useState } from "react";

import { fetchVehicleHistory } from "../../services/history.api";

import type { TelemetryPoint } from "../../types/history";

import TelemetryChart from "./TelemetryChart";

function VehicleHistoryPanel() {
  const [vehicleId, setVehicleId] = useState("VG-00001");

  const [history, setHistory] = useState<TelemetryPoint[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [loadedVehicleId, setLoadedVehicleId] = useState("");

  async function handleSearch() {
    const trimmedId = vehicleId.trim();

    if (!trimmedId) {
      setError("Please enter a vehicle ID");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHistory([]);

      const response = await fetchVehicleHistory(trimmedId, {
        points: 24,
      });

      setHistory(response.history);
      setLoadedVehicleId(response.vehicle_id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to fetch vehicle history"
      );

      setLoadedVehicleId("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-stone-800/90 bg-stone-900/80 p-5 shadow-xl backdrop-blur-sm">

      {/* Panel heading */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Vehicle Telemetry History
        </h2>

        <p className="mt-1 text-sm italic text-stone-400">
          Analyse historical battery and vehicle performance dynamics.
        </p>
      </div>

      {/* Vehicle search */}
      <div className="flex flex-wrap gap-3">

        <input
          type="text"
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch();
            }
          }}
          placeholder="Enter vehicle ID"
          aria-label="Vehicle ID"
          className="min-w-[220px] rounded-lg border border-stone-700 bg-stone-950/90 px-4 py-2.5 text-white placeholder:italic placeholder:text-stone-500 outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="cursor-pointer rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load History"}
        </button>

      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm italic text-red-400"
        >
          {error}
        </div>
      )}

      {/* Charts */}
      {history.length > 0 && !loading && (
        <>
          <div className="text-sm italic text-stone-400">
            Showing {history.length} historical readings for{" "}
            <span className="font-semibold not-italic text-orange-400">
              {loadedVehicleId}
            </span>
          </div>

          <TelemetryChart
            points={history}
            title="Battery State of Charge"
            metric="soc_pct"
            min={0}
            max={100}
            unit="SOC (%)"
          />

          <TelemetryChart
            points={history}
            title="Battery Temperature"
            metric="battery_temp_c"
            min={0}
            max={80}
            unit="Temperature (°C)"
          />

          <TelemetryChart
            points={history}
            title="Vehicle Speed"
            metric="speed_kmh"
            min={0}
            max={100}
            unit="Speed (km/h)"
          />
        </>
      )}

    </section>
  );
}

export default VehicleHistoryPanel;