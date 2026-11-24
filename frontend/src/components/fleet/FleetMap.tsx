import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

import { useFleetStore } from "../../store/fleet.store";
import { useSelectionStore } from "../../store/selection.store";
import type { VehicleStatus } from "../../types/vehicle";

const statusConfig: Record<VehicleStatus, { color: string; symbol: string; label: string; shapeClass: string }> = {
  moving: {
    color: "#22c55e",
    symbol: "▲",
    label: "Moving",
    shapeClass: "rounded-full",
  },
  idle: {
    color: "#eab308",
    symbol: "■",
    label: "Idle",
    shapeClass: "rounded-sm",
  },
  charging: {
    color: "#f97316",
    symbol: "⚡",
    label: "Charging",
    shapeClass: "rounded-full",
  },
  fault: {
    color: "#ef4444",
    symbol: "!",
    label: "Fault",
    shapeClass: "rotate-45 rounded-sm",
  },
  offline: {
    color: "#78716c",
    symbol: "–",
    label: "Offline",
    shapeClass: "rounded-md",
  },
};

function createVehicleIcon(status: VehicleStatus, isSelected: boolean) {
  const conf = statusConfig[status] || statusConfig.offline;
  const size = isSelected ? 24 : 16;
  const border = isSelected ? "3px solid #ffffff" : "1.5px solid #ffffff";
  const shadow = isSelected
    ? "0 0 12px rgba(249, 115, 22, 0.9), 0 0 4px rgba(0,0,0,0.8)"
    : "0 1px 3px rgba(0,0,0,0.6)";

  return L.divIcon({
    className: "custom-fleet-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${conf.color};
        border: ${border};
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: ${isSelected ? "11px" : "8px"};
        font-weight: bold;
        line-height: 1;
        transition: transform 0.2s ease;
        transform: ${isSelected ? "scale(1.25)" : "scale(1)"};
      " class="${conf.shapeClass}">
        <span style="display:inline-block; transform: ${status === "fault" ? "rotate(-45deg)" : "none"}">
          ${conf.symbol}
        </span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Controller component to pan the map when a vehicle is selected
function MapPanController({ selectedLat, selectedLng }: { selectedLat?: number; selectedLng?: number }) {
  const map = useMap();

  useEffect(() => {
    if (selectedLat !== undefined && selectedLng !== undefined) {
      map.setView([selectedLat, selectedLng], Math.max(map.getZoom(), 13), {
        animate: true,
      });
    }
  }, [selectedLat, selectedLng, map]);

  return null;
}

export default function FleetMap() {
  const allVehiclesMap = useFleetStore((state) => state.allVehicles);
  const connectionStatus = useFleetStore((state) => state.connectionStatus);
  const loading = useFleetStore((state) => state.loading);
  const selectedVehicleId = useSelectionStore((state) => state.selectedVehicleId);
  const selectVehicle = useSelectionStore((state) => state.selectVehicle);

  const vehicleList = useMemo(() => {
    return Array.from(allVehiclesMap.values());
  }, [allVehiclesMap]);

  const selectedVehicle = useMemo(() => {
    return selectedVehicleId ? allVehiclesMap.get(selectedVehicleId) : undefined;
  }, [selectedVehicleId, allVehiclesMap]);

  return (
    <section className="overflow-hidden rounded-xl border border-stone-800/90 bg-stone-900/80 shadow-xl backdrop-blur-sm">
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/90 p-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Fleet Location Map</span>
            {selectedVehicle && (
              <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-orange-400 border border-orange-500/30">
                Selected: {selectedVehicle.vehicle_id}
              </span>
            )}
          </h2>

          <p className="mt-1 text-sm italic text-stone-400">
            {vehicleList.length === 0
              ? loading
                ? "Loading fleet coordinates..."
                : "No vehicles loaded"
              : `Showing ${vehicleList.length} live vehicles on interactive map`}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2.5 rounded-full border border-stone-700/60 bg-stone-950/80 px-3 py-1">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500 shadow-sm shadow-green-500/50"
                : connectionStatus === "connecting"
                  ? "bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse"
                  : "bg-red-500 shadow-sm shadow-red-500/50"
            }`}
          />
          <span className="text-xs font-medium italic text-stone-300">
            {connectionStatus === "connected"
              ? "Live Stream Active"
              : connectionStatus === "connecting"
                ? "Connecting..."
                : "Stream Offline"}
          </span>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="h-[460px] w-full relative">
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

          <MapPanController
            selectedLat={selectedVehicle?.lat}
            selectedLng={selectedVehicle?.lng}
          />

          <MarkerClusterGroup chunkedLoading maxClusterRadius={45}>
            {vehicleList.map((vehicle) => {
              const isSelected = vehicle.vehicle_id === selectedVehicleId;
              return (
                <Marker
                  key={vehicle.vehicle_id}
                  position={[vehicle.lat, vehicle.lng]}
                  icon={createVehicleIcon(vehicle.status, isSelected)}
                  eventHandlers={{
                    click: () => selectVehicle(vehicle.vehicle_id),
                  }}
                >
                  <Popup>
                    <div className="space-y-1.5 p-1 text-stone-900 font-sans">
                      <div className="flex items-center justify-between border-b pb-1">
                        <strong className="text-sm font-bold text-orange-600">
                          {vehicle.vehicle_id}
                        </strong>
                        <span className="text-xs capitalize font-semibold px-1.5 py-0.5 rounded bg-stone-100">
                          {vehicle.status}
                        </span>
                      </div>
                      <div className="text-xs space-y-0.5">
                        <p><strong>Battery:</strong> {vehicle.soc_pct.toFixed(1)}%</p>
                        <p><strong>Speed:</strong> {vehicle.speed_kmh.toFixed(1)} km/h</p>
                        <p><strong>Temp:</strong> {vehicle.battery_temp_c.toFixed(1)}°C</p>
                        <p className="text-stone-500 font-mono text-[10px]">
                          {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
                        </p>
                      </div>
                      <button
                        onClick={() => selectVehicle(vehicle.vehicle_id)}
                        className="mt-2 w-full rounded bg-orange-600 px-2 py-1 text-xs font-semibold text-white hover:bg-orange-500"
                      >
                        Inspect Telemetry
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Accessible Status Legend with Shapes and Symbols */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-800/90 bg-stone-950/60 p-3.5 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-stone-400 italic">Legend:</span>
          {(Object.entries(statusConfig) as [VehicleStatus, (typeof statusConfig)[VehicleStatus]][]).map(
            ([status, conf]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: conf.color }}
                  className={`inline-flex h-4 w-4 items-center justify-center text-[9px] font-bold text-white shadow-sm ${conf.shapeClass}`}
                >
                  <span style={{ transform: status === "fault" ? "rotate(-45deg)" : "none" }}>
                    {conf.symbol}
                  </span>
                </span>
                <span className="capitalize font-medium text-stone-300">
                  {conf.label}
                </span>
              </div>
            )
          )}
        </div>

        <div className="text-stone-500 italic text-[11px]">
          Click marker to sync with list & telemetry
        </div>
      </div>
    </section>
  );
}
