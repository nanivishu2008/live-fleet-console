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
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Fleet Alerts
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Monitor and acknowledge vehicle alerts.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
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
            className={`rounded-lg px-4 py-2 text-sm capitalize ${
              filter === value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {loading && alerts.length === 0 && (
        <p className="py-6 text-center text-slate-500">
          Loading alerts...
        </p>
      )}

      {!loading && !error && alerts.length === 0 && (
        <p className="py-6 text-center text-slate-500">
          No alerts found.
        </p>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => {
          const isProcessing = processingIds.has(alert.id);

          return (
            <article
              key={alert.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"
            >
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {alert.rule}
                  </h3>

                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      alert.state === "open"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {alert.state}
                  </span>
                </div>

                <p className="text-sm text-slate-600">
                  Vehicle: {alert.vehicle_id}
                </p>

                <p className="text-xs text-slate-400">
                  {new Date(alert.opened_at).toLocaleString()}
                </p>
              </div>

              {alert.state === "open" && (
                <button
                  onClick={() => handleAcknowledge(alert)}
                  disabled={isProcessing}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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