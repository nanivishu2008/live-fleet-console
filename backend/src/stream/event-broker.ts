import { onVehicleUpdated } from "../simulator/vehicle.simulator.js";
import type { Vehicle } from "../types/vehicle.types.js";

export interface StreamEvent {
  id: number;
  type: "vehicle.updated";
  data: Vehicle;
}

const MAX_BUFFER_SIZE = 500;

let eventId = 0;

const eventBuffer: StreamEvent[] = [];

type EventListener = (event: StreamEvent) => void;

const listeners = new Set<EventListener>();

// Listen to simulator updates and convert them into stream events.
onVehicleUpdated((vehicle) => {
  const event: StreamEvent = {
    id: ++eventId,
    type: "vehicle.updated",
    data: { ...vehicle },
  };

  // Store the event.
  eventBuffer.push(event);

  // Keep only the most recent 500 events.
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift();
  }

  // Send the event to all connected clients.
  for (const listener of listeners) {
    listener(event);
  }
});

// Register a client for live events.
export function subscribe(listener: EventListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// Return buffered events newer than the client's last event ID.
export function getEventsAfter(lastEventId: number): StreamEvent[] {
  return eventBuffer.filter((event) => event.id > lastEventId);
}