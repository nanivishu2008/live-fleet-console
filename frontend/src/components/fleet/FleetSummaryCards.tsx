import { useFleetStore } from "../../store/fleet.store";

function FleetSummaryCards() {
  const summary = useFleetStore((state) => state.summary);

  if (!summary) {
    return (
      <p className="text-sm text-slate-400">
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
          className="rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          <p className="text-sm text-slate-400">
            {card.label}
          </p>

          <p className="mt-3 text-2xl font-semibold text-white">
            {card.value}
          </p>
        </div>
      ))}
    </section>
  );
}

export default FleetSummaryCards;