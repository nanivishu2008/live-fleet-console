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
    <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-950 p-5">

      {/* Panel heading */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          Vehicle Telemetry History
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Analyse historical battery and vehicle performance.
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
          className="min-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-sky-500"
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load History"}
        </button>

      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* Charts */}
      {history.length > 0 && !loading && (
        <>
          <div className="text-sm text-slate-400">
            Showing {history.length} historical readings for{" "}
            <span className="font-semibold text-white">
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