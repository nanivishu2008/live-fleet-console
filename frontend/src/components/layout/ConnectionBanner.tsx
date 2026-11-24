import { useFleetStore } from "../../store/fleet.store";

export default function ConnectionBanner() {
  const connectionStatus = useFleetStore((state) => state.connectionStatus);
  const connectionMessage = useFleetStore((state) => state.connectionMessage);
  const startStream = useFleetStore((state) => state.startStream);

  if (connectionStatus === "connected") {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-950/80 px-4 py-2.5 text-sm text-amber-200 shadow-md backdrop-blur-sm"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
        </span>
        <span className="font-semibold">
          {connectionStatus === "disconnected"
            ? "Disconnected: telemetry data may be outdated."
            : "Reconnecting to live telemetry stream..."}
        </span>
        {connectionMessage && (
          <span className="hidden text-xs italic text-amber-300/80 sm:inline">
            ({connectionMessage})
          </span>
        )}
      </div>

      <button
        onClick={() => startStream()}
        className="cursor-pointer rounded border border-amber-500/50 bg-amber-900/60 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-800 transition-colors"
      >
        Retry Now
      </button>
    </div>
  );
}
