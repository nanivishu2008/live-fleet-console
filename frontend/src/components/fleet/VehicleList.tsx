import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useFleetStore } from "../../store/fleet.store";

function VehicleList() {
  const vehicles = useFleetStore((state) => state.vehicles);
  const loading = useFleetStore((state) => state.loading);
  const loadingMore = useFleetStore((state) => state.loadingMore);
  const error = useFleetStore((state) => state.error);
  const nextCursor = useFleetStore((state) => state.nextCursor);
  const loadMore = useFleetStore((state) => state.loadMore);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: vehicles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  if (loading && vehicles.length === 0) {
    return (
      <div className="py-10 text-center text-sm italic text-stone-400">
        Loading vehicles...
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
        No vehicles found.
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
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Temperature</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Speed</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase italic tracking-wider text-orange-400/90">Location</th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={parentRef}
        className="h-[500px] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualRows.map((virtualRow) => {
            const vehicle = vehicles[virtualRow.index];

            return (
              <div
                key={vehicle.vehicle_id}
                className="group absolute left-0 top-0 grid w-full grid-cols-6 items-center gap-4 border-b border-stone-800/60 bg-stone-950/40 px-4 text-sm text-stone-300 transition-colors hover:bg-orange-500/5"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span className="font-semibold text-white transition-colors group-hover:text-orange-300">
                  {vehicle.vehicle_id}
                </span>

                <span className="capitalize italic text-stone-300">
                  {vehicle.status}
                </span>

                <span>
                  {vehicle.soc_pct.toFixed(1)}
                  <span className="text-xs italic text-orange-300/80 ml-1">%</span>
                </span>

                <span>
                  {vehicle.battery_temp_c.toFixed(1)}
                  <span className="text-xs italic text-stone-400 ml-1">°C</span>
                </span>

                <span>
                  {vehicle.speed_kmh.toFixed(1)}
                  <span className="text-xs italic text-stone-400 ml-1">km/h</span>
                </span>

                <span className="text-xs italic text-stone-500">
                  {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {nextCursor && (
        <div className="border-t border-stone-800/90 p-4 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="cursor-pointer rounded-lg border border-stone-700 bg-stone-800/80 px-6 py-2.5 text-sm font-medium text-stone-200 transition-all hover:border-orange-500 hover:bg-stone-700 hover:text-orange-300 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load More Vehicles"}
          </button>
        </div>
      )}
    </div>
  );
}

export default VehicleList;