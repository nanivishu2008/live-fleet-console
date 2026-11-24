import type { Vehicle } from "../types/vehicle";
import type { Alert } from "../types/alert";

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface StreamClientCallbacks {
  onVehicleUpdated: (vehicle: Vehicle, eventId: number) => void;
  onAlertChanged: (alert: Alert, eventId: number) => void;
  onStatusChange: (status: ConnectionState, message?: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export class FleetStreamClient {
  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private lastEventId = 0;
  private isDestroyed = false;
  private callbacks: StreamClientCallbacks;

  constructor(callbacks: StreamClientCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(): void {
    if (this.isDestroyed) return;

    this.cleanupCurrent();
    this.callbacks.onStatusChange(this.reconnectAttempts === 0 ? "connecting" : "reconnecting");

    // Include lastEventId in query param to support replay after disconnect
    const url = new URL(`${API_URL}/v1/stream`);
    if (this.lastEventId > 0) {
      url.searchParams.set("lastEventId", String(this.lastEventId));
    }

    try {
      const es = new EventSource(url.toString());
      this.eventSource = es;

      es.onopen = () => {
        if (this.isDestroyed) {
          es.close();
          return;
        }
        this.reconnectAttempts = 0;
        this.callbacks.onStatusChange("connected");
      };

      es.addEventListener("vehicle.updated", (e: MessageEvent) => {
        try {
          const eventId = Number(e.lastEventId || 0);
          if (eventId > this.lastEventId) {
            this.lastEventId = eventId;
          }
          const vehicle = JSON.parse(e.data) as Vehicle;
          this.callbacks.onVehicleUpdated(vehicle, eventId);
        } catch (err) {
          console.error("Failed to parse vehicle.updated event", err);
        }
      });

      es.addEventListener("alert.changed", (e: MessageEvent) => {
        try {
          const eventId = Number(e.lastEventId || 0);
          if (eventId > this.lastEventId) {
            this.lastEventId = eventId;
          }
          const alert = JSON.parse(e.data) as Alert;
          this.callbacks.onAlertChanged(alert, eventId);
        } catch (err) {
          console.error("Failed to parse alert.changed event", err);
        }
      });

      es.onerror = () => {
        // Close immediately to prevent browser's naive default retry
        es.close();
        this.eventSource = null;

        if (this.isDestroyed) return;

        this.scheduleReconnect();
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed) return;

    this.reconnectAttempts++;
    this.callbacks.onStatusChange("reconnecting", `Reconnecting (attempt ${this.reconnectAttempts})...`);

    // Exponential backoff: min(30s, 1000ms * 2^(attempts-1)) + random jitter (0-1000ms)
    const baseDelay = Math.min(30000, 1000 * Math.pow(2, Math.max(0, this.reconnectAttempts - 1)));
    const jitter = Math.random() * 1000;
    const delay = Math.round(baseDelay + jitter);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private cleanupCurrent(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public disconnect(): void {
    this.isDestroyed = true;
    this.cleanupCurrent();
    this.callbacks.onStatusChange("disconnected", "Disconnected");
  }

  public getLastEventId(): number {
    return this.lastEventId;
  }
}
