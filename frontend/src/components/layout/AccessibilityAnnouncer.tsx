import { useFleetStore } from "../../store/fleet.store";

export default function AccessibilityAnnouncer() {
  const liveAnnouncement = useFleetStore((state) => state.liveAnnouncement);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {liveAnnouncement}
    </div>
  );
}
