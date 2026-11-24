import { onVehicleUpdated } from "../simulator/vehicle.simulator.js";
import type { Vehicle } from "../types/vehicle.types.js";
import type { Alert } from "../types/alert.types.js";

export type StreamEvent =
  | {
      id: number;
      type: "vehicle.updated";
      data: Vehicle;
    }
  | {
      id: number;
      type: "alert.changed";
      data: Alert;
    };

// Buffer up to 30,000 events so clients disconnecting up to ~75s at 400 events/sec can replay.
const MAX_BUFFER_SIZE = 30000;

let eventId = 0;

const eventBuffer: StreamEvent[] = [];

type EventListener = (event: StreamEvent) => void;

const listeners = new Set<EventListener>();

function recordAndBroadcast(event: StreamEvent): void {
  eventBuffer.push(event);

  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift();
  }

  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      console.error("Error in event listener:", err);
    }
  }
}

// Listen to simulator updates and convert them into stream events.
onVehicleUpdated((vehicle) => {
  const event: StreamEvent = {
    id: ++eventId,
    type: "vehicle.updated",
    data: { ...vehicle },
  };

  recordAndBroadcast(event);
});

// Broadcast alert changes (e.g. opened or acknowledged) to all connected clients.
export function emitAlertChanged(alert: Alert): void {
  const event: StreamEvent = {
    id: ++eventId,
    type: "alert.changed",
    data: { ...alert },
  };

  recordAndBroadcast(event);
}

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
