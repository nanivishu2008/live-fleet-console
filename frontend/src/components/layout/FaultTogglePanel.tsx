import { useEffect, useState } from "react";
import { fetchFaultsConfig, updateFaultsConfig } from "../../services/faults.api";

export default function FaultTogglePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [duplicates, setDuplicates] = useState(false);
  const [outOfOrder, setOutOfOrder] = useState(false);
  const [disconnect, setDisconnect] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFaultsConfig()
      .then((res) => {
        if (res?.data) {
          setLatencyMs(res.data.latencyMs ?? 0);
          setDuplicates(res.data.duplicates ?? false);
          setOutOfOrder(res.data.outOfOrder ?? false);
          setDisconnect(res.data.disconnect ?? false);
        }
      })
      .catch((err) => console.error("Could not fetch faults config", err));
  }, []);

  async function handleToggle(updates: {
    latencyMs?: number;
    duplicates?: boolean;
    outOfOrder?: boolean;
    disconnect?: boolean;
  }) {
    setSaving(true);
    try {
      const payload = {
        latencyMs: updates.latencyMs ?? latencyMs,
        duplicates: updates.duplicates ?? duplicates,
        outOfOrder: updates.outOfOrder ?? outOfOrder,
        disconnect: updates.disconnect ?? disconnect,
      };
      const res = await updateFaultsConfig(payload);
      if (res?.data) {
        setLatencyMs(res.data.latencyMs);
        setDuplicates(res.data.duplicates);
        setOutOfOrder(res.data.outOfOrder);
        setDisconnect(res.data.disconnect);
      }
    } catch (err) {
      console.error("Failed to update fault config", err);
    } finally {
      setSaving(false);
    }
  }

  const activeFaultsCount =
    (latencyMs > 0 ? 1 : 0) +
    (duplicates ? 1 : 0) +
    (outOfOrder ? 1 : 0) +
    (disconnect ? 1 : 0);

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/90 p-3 shadow-lg backdrop-blur-sm transition-all">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-stone-200 hover:text-orange-400 transition-colors"
        >
          <span className="text-base">⚡</span>
          <span>Simulator Fault Controls</span>
          {activeFaultsCount > 0 && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-400 border border-orange-500/40">
              {activeFaultsCount} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-stone-400 hover:text-stone-200"
        >
          {isOpen ? "▲ Hide Controls" : "▼ Show Controls"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-stone-800 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Latency Fault */}
          <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200">REST & Stream Latency</span>
              <span className="text-xs font-bold text-orange-400">{latencyMs} ms</span>
            </div>
            <p className="mt-1 text-xs italic text-stone-400">
              Delays all REST queries and stream delivery (up to 3s).
            </p>
            <div className="mt-2.5 flex gap-1.5">
              {[0, 500, 1500, 3000].map((ms) => (
                <button
                  key={ms}
                  disabled={saving}
                  onClick={() => handleToggle({ latencyMs: ms })}
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    latencyMs === ms
                      ? "bg-orange-500 text-white font-bold"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                  }`}
                >
                  {ms === 0 ? "Off" : `${ms / 1000}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Duplicates Fault */}
          <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200">Duplicate Events</span>
              <span className={`text-xs font-bold ${duplicates ? "text-orange-400" : "text-stone-500"}`}>
                {duplicates ? "30% Rate" : "Off"}
              </span>
            </div>
            <p className="mt-1 text-xs italic text-stone-400">
              Duplicates events to test ID deduplication.
            </p>
            <button
              disabled={saving}
              onClick={() => handleToggle({ duplicates: !duplicates })}
              className={`mt-2.5 w-full rounded py-1 text-xs font-semibold cursor-pointer transition-colors ${
                duplicates
                  ? "bg-orange-500 text-white"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {duplicates ? "Disable Duplicates" : "Enable Duplicates"}
            </button>
          </div>

          {/* Out of Order Fault */}
          <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200">Out-of-Order Delivery</span>
              <span className={`text-xs font-bold ${outOfOrder ? "text-orange-400" : "text-stone-500"}`}>
                {outOfOrder ? "Active" : "Off"}
              </span>
            </div>
            <p className="mt-1 text-xs italic text-stone-400">
              Sends alternating events with delay to test time ordering.
            </p>
            <button
              disabled={saving}
              onClick={() => handleToggle({ outOfOrder: !outOfOrder })}
              className={`mt-2.5 w-full rounded py-1 text-xs font-semibold cursor-pointer transition-colors ${
                outOfOrder
                  ? "bg-orange-500 text-white"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {outOfOrder ? "Disable Out-of-Order" : "Enable Out-of-Order"}
            </button>
          </div>

          {/* Disconnect Fault */}
          <div className="rounded-lg border border-stone-800/80 bg-stone-950/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200">Force Stream Drop</span>
              <span className={`text-xs font-bold ${disconnect ? "text-red-400" : "text-stone-500"}`}>
                {disconnect ? "Severed" : "Normal"}
              </span>
            </div>
            <p className="mt-1 text-xs italic text-stone-400">
              Severs SSE connection to test exponential backoff & replay.
            </p>
            <button
              disabled={saving}
              onClick={() => handleToggle({ disconnect: !disconnect })}
              className={`mt-2.5 w-full rounded py-1 text-xs font-semibold cursor-pointer transition-colors ${
                disconnect
                  ? "bg-red-600 text-white"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {disconnect ? "Restore Stream" : "Disconnect Stream"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
