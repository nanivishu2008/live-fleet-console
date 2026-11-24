import { useCallback, useEffect, useRef, useState } from "react";
import type { Alert, AlertState } from "../../types/alert";
import {
  AlertApiError,
  acknowledgeAlert,
  fetchAlerts,
} from "../../services/alerts.api";
import { useFleetStore } from "../../store/fleet.store";
import { useSelectionStore } from "../../store/selection.store";

type AlertFilter = AlertState | "all";

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<AlertFilter>("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const liveAlerts = useFleetStore((state) => state.liveAlerts);
  const selectVehicle = useSelectionStore((state) => state.selectVehicle);

  const requestIdRef = useRef(0);

  const loadAlerts = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchAlerts({
        state: filter,
        limit: 50,
      });

      if (requestId !== requestIdRef.current) return;
      setAlerts(response.items);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filter]);

  // Initial load and filter change
  useEffect(() => {
    loadAlerts();
    return () => {
      requestIdRef.current++;
    };
  }, [loadAlerts]);

  // Sync incoming SSE alert.changed events live
  useEffect(() => {
    if (liveAlerts.length === 0) return;
    const latestAlert = liveAlerts[0];

    setAlerts((prev) => {
      const exists = prev.some((a) => a.id === latestAlert.id);
      if (exists) {
        return prev
          .map((a) => (a.id === latestAlert.id ? latestAlert : a))
          .filter((a) => filter === "all" || a.state === filter);
      } else {
        if (filter === "all" || latestAlert.state === filter) {
          return [latestAlert, ...prev];
        }
        return prev;
      }
    });
  }, [liveAlerts, filter]);

  async function handleAcknowledge(alert: Alert) {
    if (processingIds.has(alert.id)) return;

    const originalAlert = alert;

    setProcessingIds((prev) => {
      const updated = new Set(prev);
      updated.add(alert.id);
      return updated;
    });

    setMessage(null);
    setError(null);
    setConflictNotice(null);

    // Optimistic UI update
    setAlerts((prev) =>
      prev.map((item) =>
        item.id === alert.id
          ? { ...item, state: "acknowledged", version: item.version + 1 }
          : item
      )
    );

    try {
      const response = await acknowledgeAlert(alert.id, alert.version);

      setAlerts((prev) =>
        prev
          .map((item) => (item.id === alert.id ? response.data : item))
          .filter((item) => filter !== "open" || item.state === "open")
      );

      setMessage(`Alert ${alert.id} (${alert.rule}) acknowledged successfully.`);
    } catch (err) {
      // Roll back optimistic update
      setAlerts((prev) =>
        prev.map((item) => (item.id === alert.id ? originalAlert : item))
      );

      if (err instanceof AlertApiError && err.status === 409) {
        setConflictNotice(
          `Conflict (HTTP 409): Alert ${alert.id} was already acknowledged by another operator or tab (stale version ${alert.version}). Syncing latest server state...`
        );
        // Immediately refetch to sync both tabs to the identical state
        await loadAlerts();
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to acknowledge alert."
        );
      }
    } finally {
      setProcessingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(alert.id);
        return updated;
      });
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-stone-800/90 bg-stone-900/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3.5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Fleet Alert Management</span>
            <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-xs font-bold text-red-400">
              Live Sync
            </span>
          </h2>
          <p className="mt-1 text-sm italic text-stone-400">
            Real-time critical safety alerts with optimistic concurrency & 409 multi-tab resolution.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="cursor-pointer rounded-lg border border-stone-700 bg-stone-800/80 px-3.5 py-1.5 text-xs font-semibold text-stone-200 transition-all hover:border-orange-500/50 hover:bg-stone-700 hover:text-orange-300 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Alerts"}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["open", "acknowledged", "all"] as const).map((value) => (
          <button
            key={value}
            onClick={() => {
              setFilter(value);
              setMessage(null);
              setConflictNotice(null);
            }}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold capitalize transition-all duration-200 ${
              filter === value
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25"
                : "border border-stone-700/60 bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {/* 409 Conflict Banner */}
      {conflictNotice && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/60 p-3 text-xs italic text-amber-200 shadow-md flex items-center justify-between"
        >
          <span>⚠️ {conflictNotice}</span>
          <button
            onClick={() => setConflictNotice(null)}
            className="ml-2 font-bold text-amber-400 hover:text-amber-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Banner */}
      {message && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs italic text-orange-300"
        >
          ✓ {message}
        </p>
      )}

      {/* Error Banner */}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs italic text-red-400"
        >
          ✕ {error}
        </p>
      )}

      {/* Loading Skeletons */}
      {loading && alerts.length === 0 && (
        <div className="space-y-2.5 animate-pulse py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-stone-800/40 w-full" />
          ))}
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <p className="py-6 text-center text-sm italic text-stone-400">
          No alerts found matching filter "{filter}".
        </p>
      )}

      {/* Alert Items */}
      <div className="space-y-2.5">
        {alerts.map((alert) => {
          const isProcessing = processingIds.has(alert.id);

          return (
            <article
              key={alert.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-950/70 p-3.5 transition-all hover:border-orange-500/30"
            >
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-white text-sm">
                    {alert.rule}
                  </h3>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold italic uppercase ${
                      alert.state === "open"
                        ? "border border-red-500/30 bg-red-500/20 text-red-300"
                        : "border border-green-500/30 bg-green-500/20 text-green-300"
                    }`}
                  >
                    {alert.state}
                  </span>

                  <span className="text-[10px] text-stone-500 font-mono">
                    v{alert.version}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs italic text-stone-300">
                  <span>
                    Vehicle:{" "}
                    <button
                      onClick={() => selectVehicle(alert.vehicle_id)}
                      className="font-semibold not-italic text-orange-400 hover:underline cursor-pointer"
                    >
                      {alert.vehicle_id}
                    </button>
                  </span>
                  <span>•</span>
                  <span className="text-stone-500">
                    {new Date(alert.opened_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {alert.state === "open" && (
                <button
                  onClick={() => handleAcknowledge(alert)}
                  disabled={isProcessing}
                  className="cursor-pointer rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/35 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? "Acknowledging..." : "Acknowledge"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
