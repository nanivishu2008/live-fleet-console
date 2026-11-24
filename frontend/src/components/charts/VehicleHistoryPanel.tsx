import { useState, useEffect, useMemo, useRef } from "react";
import { fetchVehicleHistory } from "../../services/history.api";
import { useSelectionStore } from "../../store/selection.store";
import { useFleetStore } from "../../store/fleet.store";
import type { TelemetryPoint } from "../../types/history";
import TelemetryChart, { type AlertPeriod } from "./TelemetryChart";

export default function VehicleHistoryPanel() {
  const selectedVehicleId = useSelectionStore((state) => state.selectedVehicleId);
  const chartWindow = useSelectionStore((state) => state.chartWindow);
  const setChartWindow = useSelectionStore((state) => state.setChartWindow);
  const selectVehicle = useSelectionStore((state) => state.selectVehicle);
  const liveAlerts = useFleetStore((state) => state.liveAlerts);
  const allVehicles = useFleetStore((state) => state.allVehicles);

  const [inputVehicleId, setInputVehicleId] = useState(selectedVehicleId || "VG-00001");
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedVehicleId, setLoadedVehicleId] = useState("");

  // Synced crosshair and brush zoom across all 3 charts
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);

  const lastAppendedTimeRef = useRef<number>(0);

  // Sync input when selection changes
  useEffect(() => {
    if (selectedVehicleId && selectedVehicleId !== loadedVehicleId) {
      setInputVehicleId(selectedVehicleId);
      loadHistoryFor(selectedVehicleId, chartWindow);
    }
  }, [selectedVehicleId]);

  // Window change
  useEffect(() => {
    if (loadedVehicleId) {
      loadHistoryFor(loadedVehicleId, chartWindow);
    }
  }, [chartWindow]);

  // Initial load
  useEffect(() => {
    const target = selectedVehicleId || "VG-00001";
    loadHistoryFor(target, chartWindow);
  }, []);

  async function loadHistoryFor(id: string, windowParam: "15m" | "1h" | "6h" | "24h") {
    const trimmedId = id.trim();
    if (!trimmedId) return;

    setLoading(true);
    setError(null);
    setZoomRange(null);

    const now = Date.now();
    let durationMs = 24 * 60 * 60 * 1000;
    let pointsCount = 48;

    if (windowParam === "15m") {
      durationMs = 15 * 60 * 1000;
      pointsCount = 20;
    } else if (windowParam === "1h") {
      durationMs = 60 * 60 * 1000;
      pointsCount = 30;
    } else if (windowParam === "6h") {
      durationMs = 6 * 60 * 60 * 1000;
      pointsCount = 40;
    }

    const fromDate = new Date(now - durationMs).toISOString();
    const toDate = new Date(now).toISOString();

    try {
      const response = await fetchVehicleHistory(trimmedId, {
        points: pointsCount,
        from: fromDate,
        to: toDate,
      });

      setHistory(response.history);
      setLoadedVehicleId(response.vehicle_id);

      if (response.history.length > 0) {
        lastAppendedTimeRef.current = new Date(
          response.history[response.history.length - 1].ts || response.history[response.history.length - 1].timestamp || 0
        ).getTime();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load telemetry history (request timed out or server unavailable)."
      );
      setHistory([]);
      setLoadedVehicleId("");
    } finally {
      setLoading(false);
    }
  }

  // Append incoming live readings without a full redraw
  const currentLiveVehicle = loadedVehicleId ? allVehicles.get(loadedVehicleId) : undefined;
  useEffect(() => {
    if (!currentLiveVehicle || !loadedVehicleId) return;
    const updateTime = new Date(currentLiveVehicle.updated_at).getTime();

    if (updateTime > lastAppendedTimeRef.current) {
      lastAppendedTimeRef.current = updateTime;
      setHistory((prev) => {
        const newPoint: TelemetryPoint = {
          ts: currentLiveVehicle.updated_at,
          timestamp: currentLiveVehicle.updated_at,
          soc_pct: currentLiveVehicle.soc_pct,
          battery_temp_c: currentLiveVehicle.battery_temp_c,
          speed_kmh: currentLiveVehicle.speed_kmh,
        };
        // Keep max 120 points to avoid memory bloat
        const updated = [...prev, newPoint];
        return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
      });
    }
  }, [currentLiveVehicle?.updated_at, currentLiveVehicle?.soc_pct, currentLiveVehicle?.speed_kmh]);

  // Compute alert periods for shaded background in charts
  const vehicleAlertPeriods = useMemo<AlertPeriod[]>(() => {
    if (!loadedVehicleId) return [];
    const matching = liveAlerts.filter((a) => a.vehicle_id === loadedVehicleId);
    return matching.map((a) => {
      const start = new Date(a.opened_at).getTime();
      const end = a.state === "acknowledged" ? start + 30 * 60 * 1000 : Date.now();
      return { start, end, rule: a.rule };
    });
  }, [liveAlerts, loadedVehicleId]);

  function handleManualSearch() {
    selectVehicle(inputVehicleId.trim());
    loadHistoryFor(inputVehicleId.trim(), chartWindow);
  }

  return (
    <section className="space-y-4 rounded-xl border border-stone-800/90 bg-stone-900/80 p-5 shadow-xl backdrop-blur-sm">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Vehicle Telemetry Dynamics</span>
            {loadedVehicleId && (
              <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold text-orange-400 border border-orange-500/30">
                {loadedVehicleId}
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm italic text-stone-400">
            Time-series telemetry with synced crosshairs, brush zoom, and gap rendering.
          </p>
        </div>

        {/* Time window selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-400 italic">Window:</span>
          {(["15m", "1h", "6h", "24h"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setChartWindow(w)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                chartWindow === w
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/30"
                  : "bg-stone-800/80 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {w}
            </button>
          ))}

          {zoomRange && (
            <button
              onClick={() => setZoomRange(null)}
              className="cursor-pointer rounded-lg border border-orange-500/50 bg-orange-950/40 px-2.5 py-1 text-xs font-bold text-orange-300 hover:bg-orange-900/60 transition-colors"
            >
              Reset Zoom ↺
            </button>
          )}
        </div>
      </div>

      {/* Vehicle Selector Form */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={inputVehicleId}
          onChange={(e) => setInputVehicleId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleManualSearch();
          }}
          placeholder="Enter Vehicle ID (e.g. VG-00001)"
          aria-label="Inspect Vehicle ID"
          className="min-w-[200px] rounded-lg border border-stone-700 bg-stone-950/90 px-3.5 py-2 text-sm text-white placeholder:italic placeholder:text-stone-500 outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        />

        <button
          type="button"
          onClick={handleManualSearch}
          disabled={loading}
          className="cursor-pointer rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600 active:scale-95 disabled:opacity-50 transition-all"
        >
          {loading ? "Loading..." : "Load History"}
        </button>

        {loadedVehicleId && (
          <span className="text-xs italic text-stone-400">
            Showing <strong className="text-orange-400 font-semibold">{history.length}</strong> points over the last{" "}
            <strong>{chartWindow}</strong>.
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3.5 text-sm italic text-red-300">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && history.length === 0 && (
        <div className="space-y-3 animate-pulse">
          <div className="h-44 rounded-xl bg-stone-800/40 w-full" />
          <div className="h-44 rounded-xl bg-stone-800/40 w-full" />
        </div>
      )}

      {/* 3 Synced Telemetry Charts */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5">
          <TelemetryChart
            points={history}
            title="Battery State of Charge"
            metric="soc_pct"
            min={0}
            max={100}
            unit="%"
            hoveredTime={hoveredTime}
            onHoverTimeChange={setHoveredTime}
            zoomRange={zoomRange}
            onZoomChange={setZoomRange}
            alertPeriods={vehicleAlertPeriods}
          />

          <TelemetryChart
            points={history}
            title="Battery Temperature"
            metric="battery_temp_c"
            min={10}
            max={70}
            unit="°C"
            hoveredTime={hoveredTime}
            onHoverTimeChange={setHoveredTime}
            zoomRange={zoomRange}
            onZoomChange={setZoomRange}
            alertPeriods={vehicleAlertPeriods}
          />

          <TelemetryChart
            points={history}
            title="Vehicle Speed"
            metric="speed_kmh"
            min={0}
            max={100}
            unit="km/h"
            hoveredTime={hoveredTime}
            onHoverTimeChange={setHoveredTime}
            zoomRange={zoomRange}
            onZoomChange={setZoomRange}
            alertPeriods={vehicleAlertPeriods}
          />
        </div>
      )}
    </section>
  );
}
