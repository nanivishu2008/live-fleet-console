import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  MapVehicle,
  VehicleUpdateEvent,
} from "../../types/map";

import { fetchMapVehicles } from "../../services/map.api";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

import type { VehicleStatus } from "../../types/vehicle";

const API_URL = import.meta.env.VITE_API_URL;

const statusColors: Record<VehicleStatus, string> = {
  moving: "#22c55e",
  idle: "#eab308",
  charging: "#3b82f6",
  offline: "#64748b",
  fault: "#ef4444",
};

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting";

function createVehicleIcon(status: VehicleStatus) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background-color: ${statusColors[status]};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function FleetMap() {
  const [vehicles, setVehicles] = useState<MapVehicle[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  // Store all vehicles using vehicle_id as the key.
  const vehiclesMapRef = useRef<Map<string, MapVehicle>>(
    new Map()
  );

  // Store incoming events until the next batch update.
  const pendingUpdatesRef = useRef<
    Map<string, VehicleUpdateEvent>
  >(new Map());

  // Remember the latest applied timestamp for each vehicle.
  const latestUpdatedAtRef = useRef<Map<string, number>>(
    new Map()
  );

  // Store event IDs that have already been processed.
  const processedEventIdsRef = useRef<Set<string>>(
    new Set()
  );

  // Fetch initial vehicle locations and establish SSE connection.
  useEffect(() => {
    let eventSource: EventSource | null = null;

    let batchTimer: ReturnType<typeof setInterval> | null = null;

    let cancelled = false;

    async function initializeMap() {
      try {
        setLoading(true);

        const response = await fetchMapVehicles();

        if (cancelled) return;

        const initialVehicles = new Map(
          response.items.map((vehicle) => [
            vehicle.vehicle_id,
            vehicle,
          ])
        );

        vehiclesMapRef.current = initialVehicles;

        setVehicles(Array.from(initialVehicles.values()));

        // Initialise timestamps for vehicles already loaded.
        latestUpdatedAtRef.current.clear();

        // Clear previous event tracking.
        pendingUpdatesRef.current.clear();
        processedEventIdsRef.current.clear();

        setError(null);

        // Connect to the backend SSE stream.
        eventSource = new EventSource(
          `${API_URL}/v1/stream`
        );

        setConnectionStatus("connecting");

        eventSource.onopen = () => {
          setConnectionStatus("connected");
        };

        eventSource.onerror = () => {
          setConnectionStatus("reconnecting");
        };

        // Listen for vehicle.updated events.
        eventSource.addEventListener(
          "vehicle.updated",
          (event: Event) => {
            try {
              const message = event as MessageEvent<string>;

              // Parse the received event data.
              const update = JSON.parse(
                message.data
              ) as VehicleUpdateEvent;

              // Validate the important fields.
              if (
                !update.vehicle_id ||
                !Number.isFinite(update.lat) ||
                !Number.isFinite(update.lng) ||
                !update.updated_at
              ) {
                return;
              }

              // Validate coordinate ranges.
              if (
                update.lat < -90 ||
                update.lat > 90 ||
                update.lng < -180 ||
                update.lng > 180
              ) {
                return;
              }

              // Check for duplicate event IDs.
              const eventId = message.lastEventId;

              if (eventId) {
                if (
                  processedEventIdsRef.current.has(eventId)
                ) {
                  return;
                }

                processedEventIdsRef.current.add(eventId);

                // Prevent the set from growing indefinitely.
                if (
                  processedEventIdsRef.current.size > 5000
                ) {
                  const firstId =
                    processedEventIdsRef.current.values().next().value;

                  if (firstId !== undefined) {
                    processedEventIdsRef.current.delete(firstId);
                  }
                }
              }

              // Check whether this update is newer.
              const incomingTime = new Date(
                update.updated_at
              ).getTime();

              if (!Number.isFinite(incomingTime)) {
                return;
              }

              const previousTime =
                latestUpdatedAtRef.current.get(
                  update.vehicle_id
                ) ?? 0;

              const pendingUpdate =
                pendingUpdatesRef.current.get(
                  update.vehicle_id
                );

              const pendingTime = pendingUpdate
                ? new Date(
                    pendingUpdate.updated_at
                  ).getTime()
                : 0;

              // Ignore stale or duplicate updates.
              if (
                incomingTime <= previousTime ||
                incomingTime <= pendingTime
              ) {
                return;
              }

              // Keep only the latest update for this vehicle.
              pendingUpdatesRef.current.set(
                update.vehicle_id,
                update
              );
            } catch (err) {
              console.error(
                "Failed to process vehicle event:",
                err
              );
            }
          }
        );

        // Apply incoming events in batches every 250 ms.
        batchTimer = setInterval(() => {
          const pendingUpdates =
            pendingUpdatesRef.current;

          if (pendingUpdates.size === 0) {
            return;
          }

          const updatedVehicles = new Map(
            vehiclesMapRef.current
          );

          for (const [vehicleId, update] of pendingUpdates) {
            const updatedAt = new Date(
              update.updated_at
            ).getTime();

            const previousTime =
              latestUpdatedAtRef.current.get(vehicleId) ?? 0;

            if (updatedAt <= previousTime) {
              continue;
            }

            const existingVehicle =
              updatedVehicles.get(vehicleId);

            // Ignore events for unknown vehicles.
            if (!existingVehicle) {
              continue;
            }

            // Update the vehicle's latest data.
            updatedVehicles.set(vehicleId, {
              ...existingVehicle,
              vehicle_id: update.vehicle_id,
              status: update.status,
              lat: update.lat,
              lng: update.lng,
            });

            // Store the timestamp of the applied update.
            latestUpdatedAtRef.current.set(
              vehicleId,
              updatedAt
            );
          }

          // Clear processed pending updates.
          pendingUpdates.clear();

          // Update the vehicle reference.
          vehiclesMapRef.current = updatedVehicles;

          // Trigger React re-render.
          setVehicles(
            Array.from(updatedVehicles.values())
          );
        }, 250);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load map vehicles"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initializeMap();

    // Clean up connections and timers.
    return () => {
      cancelled = true;

      eventSource?.close();

      if (batchTimer) {
        clearInterval(batchTimer);
      }

      pendingUpdatesRef.current.clear();
      processedEventIdsRef.current.clear();
    };
  }, []);

  // Remove vehicles with invalid coordinates.
  const vehicleMarkers = useMemo(() => {
    return vehicles.filter(
      (vehicle) =>
        Number.isFinite(vehicle.lat) &&
        Number.isFinite(vehicle.lng) &&
        vehicle.lat >= -90 &&
        vehicle.lat <= 90 &&
        vehicle.lng >= -180 &&
        vehicle.lng <= 180
    );
  }, [vehicles]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      {/* Map heading */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Fleet Location Map
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {loading
              ? "Loading vehicles..."
              : error
                ? error
                : `Showing ${vehicleMarkers.length} vehicles`}
          </p>
        </div>

        {/* SSE connection status */}
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500"
                : connectionStatus === "connecting"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />

          <span className="text-sm text-slate-300">
            {connectionStatus === "connected"
              ? "Live"
              : connectionStatus === "connecting"
                ? "Connecting..."
                : "Reconnecting..."}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="h-[500px] w-full">
        {error ? (
          <div className="p-4 text-sm text-red-400">
            Failed to load map: {error}
          </div>
        ) : loading ? (
          <div className="p-4 text-sm text-slate-400">
            Loading vehicle locations...
          </div>
        ) : (
          <MapContainer
            center={[13.0827, 80.2707]}
            zoom={11}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MarkerClusterGroup chunkedLoading>
              {vehicleMarkers.map((vehicle) => (
                <Marker
                  key={vehicle.vehicle_id}
                  position={[vehicle.lat, vehicle.lng]}
                  icon={createVehicleIcon(vehicle.status)}
                >
                  <Popup>
                    <div className="space-y-1">
                      <strong>{vehicle.vehicle_id}</strong>

                      <p>Status: {vehicle.status}</p>

                      <p>
                        Latitude: {vehicle.lat.toFixed(5)}
                      </p>

                      <p>
                        Longitude: {vehicle.lng.toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-5 border-t border-slate-800 p-4">
        {Object.entries(statusColors).map(
          ([status, color]) => (
            <div
              key={status}
              className="flex items-center gap-2"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />

              <span className="text-sm capitalize text-slate-300">
                {status}
              </span>
            </div>
          )
        )}
      </div>
    </section>
  );
}

export default FleetMap;