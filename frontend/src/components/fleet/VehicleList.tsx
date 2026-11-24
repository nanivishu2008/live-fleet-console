import { useRef, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useFleetStore } from "../../store/fleet.store";
import { useSelectionStore } from "../../store/selection.store";

export default function VehicleList() {
  const vehicles = useFleetStore((state) => state.vehicles);
  const loading = useFleetStore((state) => state.loading);
  const loadingMore = useFleetStore((state) => state.loadingMore);
  const error = useFleetStore((state) => state.error);
  const nextCursor = useFleetStore((state) => state.nextCursor);
  const loadMore = useFleetStore((state) => state.loadMore);
  const staleVehicleIds = useFleetStore((state) => state.staleVehicleIds);

  const selectedVehicleId = useSelectionStore((state) => state.selectedVehicleId);
  const selectVehicle = useSelectionStore((state) => state.selectVehicle);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: vehicles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 54,
    overscan: 6,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  function handleRowKeyDown(e: KeyboardEvent<HTMLDivElement>, index: number) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const v = vehicles[index];
      if (v) selectVehicle(v.vehicle_id);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = Math.min(vehicles.length - 1, index + 1);
      const nextVehicle = vehicles[nextIndex];
      if (nextVehicle) {
        selectVehicle(nextVehicle.vehicle_id);
        rowVirtualizer.scrollToIndex(nextIndex);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = Math.max(0, index - 1);
      const prevVehicle = vehicles[prevIndex];
      if (prevVehicle) {
        selectVehicle(prevVehicle.vehicle_id);
        rowVirtualizer.scrollToIndex(prevIndex);
      }
    }
  }

  // Loading Skeletons
  if (loading && vehicles.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-stone-800/90 bg-stone-900/80 p-4 shadow-xl">
        <div className="space-y-3 animate-pulse">
          <div className="h-9 bg-stone-800/70 rounded-lg w-full" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-stone-800/40 rounded-lg w-full flex items-center justify-between px-4">
              <div className="h-4 bg-stone-700/60 rounded w-24" />
              <div className="h-4 bg-stone-700/60 rounded w-16" />
              <div className="h-4 bg-stone-700/60 rounded w-20" />
              <div className="h-4 bg-stone-700/60 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm italic text-red-300">
        {error}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-10 text-center text-sm italic text-stone-400">
        No vehicles matching current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-800/90 bg-stone-900/80 shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-800/90 bg-stone-950/90 text-stone-400">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Vehicle ID</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Battery</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Speed</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Temp</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Health</th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={parentRef}
        role="listbox"
        aria-label="Vehicle fleet list"
        className="h-[460px] overflow-auto outline-none"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualRows.map((virtualRow) => {
            const vehicle = vehicles[virtualRow.index];
            const isSelected = vehicle.vehicle_id === selectedVehicleId;
            const isStale = staleVehicleIds.has(vehicle.vehicle_id);

            return (
              <div
                key={vehicle.vehicle_id}
                role="option"
                tabIndex={0}
                aria-selected={isSelected}
                aria-label={`Vehicle ${vehicle.vehicle_id}, status ${vehicle.status}, battery ${vehicle.soc_pct.toFixed(0)} percent`}
                onClick={() => selectVehicle(vehicle.vehicle_id)}
                onKeyDown={(e) => handleRowKeyDown(e, virtualRow.index)}
                className={`group absolute left-0 top-0 grid w-full grid-cols-6 items-center gap-3 border-b border-stone-800/60 px-4 text-sm transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:z-10 ${
                  isSelected
                    ? "bg-orange-500/20 text-white font-medium border-orange-500/50 shadow-inner"
                    : "bg-stone-950/40 text-stone-300 hover:bg-orange-500/10 hover:text-white"
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex items-center gap-1.5 font-semibold text-white group-hover:text-orange-300">
                  <span>{vehicle.vehicle_id}</span>
                  {isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-sm shadow-orange-500/80" />
                  )}
                </div>

                <div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize italic ${
                    vehicle.status === "moving"
                      ? "bg-green-500/15 text-green-300 border border-green-500/30"
                      : vehicle.status === "charging"
                        ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                        : vehicle.status === "idle"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : vehicle.status === "fault"
                            ? "bg-red-500/15 text-red-300 border border-red-500/30 font-bold"
                            : "bg-stone-500/15 text-stone-400 border border-stone-500/30"
                  }`}>
                    {vehicle.status}
                  </span>
                </div>

                <span>
                  {vehicle.soc_pct.toFixed(1)}
                  <span className="text-xs italic text-orange-300/80 ml-0.5">%</span>
                </span>

                <span>
                  {vehicle.speed_kmh.toFixed(1)}
                  <span className="text-xs italic text-stone-400 ml-0.5">km/h</span>
                </span>

                <span>
                  {vehicle.battery_temp_c.toFixed(1)}
                  <span className="text-xs italic text-stone-400 ml-0.5">°C</span>
                </span>

                <div>
                  {isStale ? (
                    <span className="rounded bg-amber-900/60 border border-amber-500/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase italic">
                      Stale
                    </span>
                  ) : (
                    <span className="text-xs text-stone-500 italic">
                      Live
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {nextCursor && (
        <div className="border-t border-stone-800/90 p-3 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="cursor-pointer rounded-lg border border-stone-700 bg-stone-800/80 px-6 py-2 text-xs font-semibold text-stone-200 transition-all hover:border-orange-500 hover:bg-stone-700 hover:text-orange-300 disabled:opacity-50"
          >
            {loadingMore ? "Loading more..." : "Load More Vehicles"}
          </button>
        </div>
      )}
    </div>
  );
}
