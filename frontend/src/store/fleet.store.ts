import { create } from "zustand";

import type {
  Vehicle,
  VehicleFilters
} from "../types/vehicle";

import type { FleetSummary } from "../types/fleet";
import type { Alert } from "../types/alert";

import { fetchVehicles as fetchVehiclesAPI } from "../services/vehicle.api";
import { fetchFleetSummary } from "../services/fleet.api";
import { FleetStreamClient, type ConnectionState } from "../services/stream.client";

interface FleetState {
  // All vehicles in memory (up to 2,000 for map & quick lookups)
  allVehicles: Map<string, Vehicle>;
  
  // Filtered and paginated vehicles for the list view
  vehicles: Vehicle[];
  
  // Fleet summary statistics
  summary: FleetSummary | null;

  // Search & filter parameters
  filters: VehicleFilters;
  nextCursor: string | null;

  // Loading & status states
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  connectionStatus: ConnectionState;
  connectionMessage: string;

  // Stale vehicles (no update for > 90 seconds)
  staleVehicleIds: Set<string>;

  // Accessibility screen reader announcement
  liveAnnouncement: string;

  // Metrics for verification and debugging
  droppedDuplicatesCount: number;
  droppedOutOfOrderCount: number;

  // Live alerts registered listeners
  liveAlerts: Alert[];

  // Actions
  fetchVehicles: (filters?: VehicleFilters, append?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: VehicleFilters) => void;
  fetchSummary: () => Promise<void>;
  initFleetData: () => Promise<void>;
  startStream: () => void;
  stopStream: () => void;

  // Direct event processing for testing and live stream
  applyVehicleUpdate: (eventId: number, vehicle: Vehicle) => boolean;
  applyAlertUpdate: (alert: Alert) => void;
  checkStaleVehicles: () => void;
  clearLiveAnnouncement: () => void;
}

// Bounded tracking structures to prevent memory leaks
const MAX_PROCESSED_EVENTS = 30000;
const processedEventIds = new Set<number>();
const latestUpdatedAtMap = new Map<string, number>();

// Pending updates batch buffer
let pendingUpdates = new Map<string, Vehicle>();
let rafScheduled = false;

// Stream client singleton
let streamClient: FleetStreamClient | null = null;
let staleCheckInterval: ReturnType<typeof setInterval> | null = null;

// Request ID counter to avoid out-of-order search responses
let latestRequestId = 0;

function filterVehicle(v: Vehicle, filters: VehicleFilters): boolean {
  if (filters.q && !v.vehicle_id.toLowerCase().includes(filters.q.toLowerCase())) {
    return false;
  }
  if (filters.status !== "all" && v.status !== filters.status) {
    return false;
  }
  if (filters.soc_min !== "") {
    const min = Number(filters.soc_min);
    if (Number.isFinite(min) && v.soc_pct < min) return false;
  }
  if (filters.soc_max !== "") {
    const max = Number(filters.soc_max);
    if (Number.isFinite(max) && v.soc_pct > max) return false;
  }
  return true;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  allVehicles: new Map(),
  vehicles: [],
  summary: null,

  filters: {
    q: "",
    status: "all",
    soc_min: "",
    soc_max: "",
  },

  nextCursor: null,
  loading: false,
  loadingMore: false,
  error: null,
  connectionStatus: "connecting",
  connectionMessage: "Connecting to stream...",

  staleVehicleIds: new Set(),
  liveAnnouncement: "",
  droppedDuplicatesCount: 0,
  droppedOutOfOrderCount: 0,
  liveAlerts: [],

  setFilters: (filters) => {
    set({ filters });
    // Re-filter currently loaded vehicles immediately
    const { allVehicles } = get();
    const matching: Vehicle[] = [];
    for (const vehicle of allVehicles.values()) {
      if (filterVehicle(vehicle, filters)) {
        matching.push(vehicle);
      }
    }
    set({ vehicles: matching.slice(0, 50) });
  },

  clearLiveAnnouncement: () => {
    set({ liveAnnouncement: "" });
  },

  // Apply a single incoming vehicle update with deduplication and ordering checks
  applyVehicleUpdate: (eventId: number, vehicle: Vehicle) => {
    // 1. Deduplication check: drop if eventId was already processed
    if (eventId > 0 && processedEventIds.has(eventId)) {
      set((state) => ({ droppedDuplicatesCount: state.droppedDuplicatesCount + 1 }));
      return false;
    }

    // 2. Ordering check: drop if incoming timestamp is older than latest seen for this vehicle
    const incomingTime = new Date(vehicle.updated_at).getTime();
    const lastSeenTime = latestUpdatedAtMap.get(vehicle.vehicle_id);

    if (lastSeenTime !== undefined && incomingTime <= lastSeenTime) {
      set((state) => ({ droppedOutOfOrderCount: state.droppedOutOfOrderCount + 1 }));
      return false;
    }

    // Record valid event
    if (eventId > 0) {
      processedEventIds.add(eventId);
      if (processedEventIds.size > MAX_PROCESSED_EVENTS) {
        // Drop oldest entries
        const iterator = processedEventIds.values();
        for (let i = 0; i < 5000; i++) {
          const next = iterator.next();
          if (next.done) break;
          processedEventIds.delete(next.value);
        }
      }
    }

    latestUpdatedAtMap.set(vehicle.vehicle_id, incomingTime);

    // Buffer update for RAF batching
    pendingUpdates.set(vehicle.vehicle_id, vehicle);

    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        const updatesToApply = pendingUpdates;
        pendingUpdates = new Map();

        const state = get();
        const nextAll = new Map(state.allVehicles);
        let newAnnouncement = "";

        for (const [id, updated] of updatesToApply.entries()) {
          const prev = nextAll.get(id);
          // Accessibility announcement on entering fault
          if (updated.status === "fault" && (!prev || prev.status !== "fault")) {
            newAnnouncement = `${updated.vehicle_id} entered fault state with battery at ${updated.soc_pct.toFixed(0)}%`;
          }
          nextAll.set(id, updated);
        }

        // Re-apply filters to update the live list
        const matching: Vehicle[] = [];
        for (const v of nextAll.values()) {
          if (filterVehicle(v, state.filters)) {
            matching.push(v);
          }
        }

        set({
          allVehicles: nextAll,
          vehicles: matching.slice(0, 50),
          ...(newAnnouncement ? { liveAnnouncement: newAnnouncement } : {})
        });
      });
    }

    return true;
  },

  applyAlertUpdate: (alert: Alert) => {
    set((state) => {
      const existing = state.liveAlerts.find((a) => a.id === alert.id);
      let nextAlerts: Alert[];
      if (existing) {
        nextAlerts = state.liveAlerts.map((a) => (a.id === alert.id ? alert : a));
      } else {
        nextAlerts = [alert, ...state.liveAlerts];
      }
      return {
        liveAlerts: nextAlerts,
        liveAnnouncement: `Alert ${alert.id} for ${alert.vehicle_id}: ${alert.rule} is now ${alert.state}`
      };
    });
  },

  checkStaleVehicles: () => {
    const now = Date.now();
    const stale = new Set<string>();
    const { allVehicles } = get();

    for (const [id, vehicle] of allVehicles.entries()) {
      const updatedTime = new Date(vehicle.updated_at).getTime();
      if (now - updatedTime > 90000) {
        stale.add(id);
      }
    }

    set({ staleVehicleIds: stale });
  },

  // Initialize both vehicles and summary
  initFleetData: async () => {
    const { fetchVehicles, fetchSummary, startStream } = get();
    await Promise.allSettled([fetchVehicles(), fetchSummary()]);
    startStream();
  },

  startStream: () => {
    if (streamClient) return;

    streamClient = new FleetStreamClient({
      onVehicleUpdated: (vehicle, eventId) => {
        get().applyVehicleUpdate(eventId, vehicle);
      },
      onAlertChanged: (alert) => {
        get().applyAlertUpdate(alert);
      },
      onStatusChange: (status, message) => {
        set({
          connectionStatus: status,
          connectionMessage: message ?? (status === "connected" ? "Live" : status)
        });
      }
    });

    streamClient.connect();

    // Check for stale vehicles every 10 seconds
    if (!staleCheckInterval) {
      staleCheckInterval = setInterval(() => {
        get().checkStaleVehicles();
      }, 10000);
    }
  },

  stopStream: () => {
    if (streamClient) {
      streamClient.disconnect();
      streamClient = null;
    }
    if (staleCheckInterval) {
      clearInterval(staleCheckInterval);
      staleCheckInterval = null;
    }
  },

  fetchVehicles: async (filters = get().filters, append = false) => {
    if (append && (!get().nextCursor || get().loadingMore)) {
      return;
    }

    const requestId = ++latestRequestId;

    set({
      ...(append ? { loadingMore: true } : { loading: true, error: null })
    });

    try {
      const cursor = append ? get().nextCursor : null;
      const response = await fetchVehiclesAPI(filters, cursor);

      if (requestId !== latestRequestId) return;

      const nextAll = new Map(get().allVehicles);
      for (const v of response.items) {
        nextAll.set(v.vehicle_id, v);
      }

      set((state) => ({
        allVehicles: nextAll,
        vehicles: append
          ? [
              ...state.vehicles,
              ...response.items.filter(
                (newV) => !state.vehicles.some((v) => v.vehicle_id === newV.vehicle_id)
              )
            ]
          : response.items,
        nextCursor: response.next_cursor,
        loading: false,
        loadingMore: false
      }));
    } catch (error) {
      if (requestId !== latestRequestId) return;
      set({
        loading: false,
        loadingMore: false,
        error: error instanceof Error ? error.message : "Failed to fetch vehicles"
      });
    }
  },

  loadMore: async () => {
    const { filters, fetchVehicles, nextCursor } = get();
    if (nextCursor) {
      await fetchVehicles(filters, true);
    }
  },

  fetchSummary: async () => {
    try {
      const response = await fetchFleetSummary();
      set({ summary: response });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch fleet summary"
      });
    }
  }
}));
