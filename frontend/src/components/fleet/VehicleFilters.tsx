import { useFleetStore } from "../../store/fleet.store";
import type { VehicleStatus } from "../../types/vehicle";

function VehicleFilters() {
  const filters = useFleetStore((state) => state.filters);
  const fetchVehicles = useFleetStore((state) => state.fetchVehicles);

  function handleStatusChange(value: string) {
    fetchVehicles({
      ...filters,
      status: value as VehicleStatus | "all",
    });
  }

  function handleBatteryChange(
    field: "soc_min" | "soc_max",
    value: string
  ) {
    fetchVehicles({
      ...filters,
      [field]: value,
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={filters.status}
        onChange={(event) => handleStatusChange(event.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
      >
        <option value="all">All statuses</option>
        <option value="moving">Moving</option>
        <option value="idle">Idle</option>
        <option value="charging">Charging</option>
        <option value="offline">Offline</option>
        <option value="fault">Fault</option>
      </select>

      <input
        type="number"
        min="0"
        max="100"
        placeholder="Min battery %"
        value={filters.soc_min}
        onChange={(event) =>
          handleBatteryChange("soc_min", event.target.value)
        }
        className="w-36 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
      />

      <input
        type="number"
        min="0"
        max="100"
        placeholder="Max battery %"
        value={filters.soc_max}
        onChange={(event) =>
          handleBatteryChange("soc_max", event.target.value)
        }
        className="w-36 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
    </div>
  );
}

export default VehicleFilters;