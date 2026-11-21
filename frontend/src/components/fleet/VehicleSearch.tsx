import { useEffect, useState } from "react";
import { useFleetStore } from "../../store/fleet.store";
import useDebounce from "../../hooks/useDebounce";

function VehicleSearch() {
  const filters = useFleetStore((state) => state.filters);
  const fetchVehicles = useFleetStore((state) => state.fetchVehicles);

  const [search, setSearch] = useState(filters.q);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    if (debouncedSearch === filters.q) {
      return;
    }

    fetchVehicles({
      ...filters,
      q: debouncedSearch.trim(),
    });
  }, [debouncedSearch]);

  return (
    <div className="flex w-full gap-2">
      <input
        type="text"
        placeholder="Search vehicle ID..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
      />

      <button
        onClick={() =>
          fetchVehicles({
            ...filters,
            q: search.trim(),
          })
        }
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        Search
      </button>
    </div>
  );
}

export default VehicleSearch;