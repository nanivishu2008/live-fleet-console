import { useFleetStore } from "../../store/fleet.store";

function FleetSummaryCards() {
  const summary = useFleetStore((state) => state.summary);

  if (!summary) {
    return (
      <p className="text-sm italic text-orange-300/70">
        Loading fleet statistics...
      </p>
    );
  }

  const stats = summary.data;

  const cards = [
    {
      label: "Total Vehicles",
      value: stats.total_vehicles
    },
    {
      label: "Moving",
      value: stats.moving
    },
    {
      label: "Idle",
      value: stats.idle
    },
    {
      label: "Charging",
      value: stats.charging
    },
    {
      label: "Offline",
      value: stats.offline
    },
    {
      label: "Faults",
      value: stats.fault
    },
    {
      label: "Average Battery",
      value: `${stats.average_soc.toFixed(1)}%`
    }
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group rounded-xl border border-stone-800/90 bg-stone-900/80 p-4 shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-orange-500/10"
        >
          <p className="text-xs font-semibold uppercase italic tracking-wider text-orange-400/90 transition-colors group-hover:text-orange-300">
            {card.label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white transition-colors group-hover:text-orange-100">
            {card.value}
          </p>
        </div>
      ))}
    </section>
  );
}

export default FleetSummaryCards;