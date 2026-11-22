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
        className="w-full rounded-lg border border-stone-700 bg-stone-900/90 px-4 py-2.5 text-sm text-white placeholder:italic placeholder:text-stone-500 outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
      />

      <button
        onClick={() =>
          fetchVehicles({
            ...filters,
            q: search.trim(),
          })
        }
        className="cursor-pointer rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/40 active:scale-95"
      >
        Search
      </button>
    </div>
  );
}

export default VehicleSearch;