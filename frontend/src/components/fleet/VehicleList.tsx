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
      <div className="py-10 text-center text-slate-400">
        Loading vehicles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        {error}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 p-10 text-center text-slate-400">
        No vehicles found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Vehicle ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Battery</th>
              <th className="px-4 py-3">Temperature</th>
              <th className="px-4 py-3">Speed</th>
              <th className="px-4 py-3">Location</th>
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
                className="absolute left-0 top-0 grid w-full grid-cols-6 items-center gap-4 border-b border-slate-800 bg-slate-950 px-4 text-sm text-slate-300"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span className="font-medium text-white">
                  {vehicle.vehicle_id}
                </span>

                <span className="capitalize">
                  {vehicle.status}
                </span>

                <span>{vehicle.soc_pct.toFixed(1)}%</span>

                <span>{vehicle.battery_temp_c.toFixed(1)}°C</span>

                <span>{vehicle.speed_kmh.toFixed(1)} km/h</span>

                <span className="text-xs">
                  {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {nextCursor && (
        <div className="border-t border-slate-800 p-4 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load More Vehicles"}
          </button>
        </div>
      )}
    </div>
  );
}

export default VehicleList;