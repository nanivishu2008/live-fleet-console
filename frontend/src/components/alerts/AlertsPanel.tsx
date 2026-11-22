import { useCallback, useEffect, useRef, useState } from "react";

import type { Alert, AlertState } from "../../types/alert";

import {
  AlertApiError,
  acknowledgeAlert,
  fetchAlerts,
} from "../../services/alerts.api";

type AlertFilter = AlertState | "all";

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<AlertFilter>("open");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [processingIds, setProcessingIds] = useState<Set<string>>(
    new Set()
  );

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

      // Ignore outdated requests.
      if (requestId !== requestIdRef.current) {
        return;
      }

      setAlerts(response.items);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(
        err instanceof Error ? err.message : "Failed to load alerts"
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filter]);

  useEffect(() => {
    loadAlerts();

    return () => {
      requestIdRef.current++;
    };
  }, [loadAlerts]);

  async function handleAcknowledge(alert: Alert) {
    if (processingIds.has(alert.id)) {
      return;
    }

    // Save the original alert so we can roll back on failure.
    const originalAlert = alert;

    // Prevent multiple acknowledgement requests for the same alert.
    setProcessingIds((previous) => {
      const updated = new Set(previous);
      updated.add(alert.id);
      return updated;
    });

    setMessage(null);
    setError(null);

    // Optimistic update: update the UI before the server responds.
    setAlerts((previous) =>
      previous.map((item) =>
        item.id === alert.id
          ? {
              ...item,
              state: "acknowledged",
              version: item.version + 1,
            }
          : item
      )
    );

    try {
      const response = await acknowledgeAlert(
        alert.id,
        alert.version
      );

      // Replace the optimistic data with the server response.
      setAlerts((previous) =>
        previous
          .map((item) =>
            item.id === alert.id ? response.data : item
          )
          .filter(
            (item) => filter !== "open" || item.state === "open"
          )
      );

      setMessage(`Alert ${alert.id} acknowledged successfully.`);
    } catch (err) {
      // Roll back the optimistic update.
      setAlerts((previous) =>
        previous.map((item) =>
          item.id === alert.id ? originalAlert : item
        )
      );

      if (err instanceof AlertApiError && err.status === 409) {
        setMessage(
          "This alert was modified by another request. Refreshing alerts..."
        );

        // Get the latest server state.
        await loadAlerts();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to acknowledge alert"
        );
      }
    } finally {
      setProcessingIds((previous) => {
        const updated = new Set(previous);
        updated.delete(alert.id);
        return updated;
      });
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-stone-800/90 bg-stone-900/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            Fleet Alerts
          </h2>

          <p className="mt-1 text-sm italic text-stone-400">
            Monitor and acknowledge vehicle alerts in real-time.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="cursor-pointer rounded-lg border border-stone-700 bg-stone-800/80 px-3.5 py-2 text-sm font-medium text-stone-200 transition-all hover:border-orange-500/50 hover:bg-stone-700 hover:text-orange-300 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(["open", "acknowledged", "all"] as const).map((value) => (
          <button
            key={value}
            onClick={() => {
              setFilter(value);
              setMessage(null);
            }}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
              filter === value
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25"
                : "border border-stone-700/60 bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm italic text-orange-300"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm italic text-red-400"
        >
          {error}
        </p>
      )}

      {loading && alerts.length === 0 && (
        <p className="py-6 text-center text-sm italic text-stone-400">
          Loading alerts...
        </p>
      )}

      {!loading && !error && alerts.length === 0 && (
        <p className="py-6 text-center text-sm italic text-stone-400">
          No alerts found.
        </p>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => {
          const isProcessing = processingIds.has(alert.id);

          return (
            <article
              key={alert.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-stone-800 bg-stone-950/70 p-4 transition-all hover:border-orange-500/30"
            >
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-white">
                    {alert.rule}
                  </h3>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold italic ${
                      alert.state === "open"
                        ? "border border-red-500/30 bg-red-500/20 text-red-300"
                        : "border border-green-500/30 bg-green-500/20 text-green-300"
                    }`}
                  >
                    {alert.state}
                  </span>
                </div>

                <p className="text-sm italic text-stone-300">
                  Vehicle: <span className="font-medium not-italic text-orange-400">{alert.vehicle_id}</span>
                </p>

                <p className="text-xs italic text-stone-500">
                  {new Date(alert.opened_at).toLocaleString()}
                </p>
              </div>

              {alert.state === "open" && (
                <button
                  onClick={() => handleAcknowledge(alert)}
                  disabled={isProcessing}
                  className="cursor-pointer rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/35 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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