import { Router } from "express";
import { vehicles } from "../data/vehicles.js";

const router = Router();

// Get locations of all vehicles for the fleet map
router.get("/locations", (_req, res) => {
  const locations = vehicles.map((vehicle) => ({
    vehicle_id: vehicle.vehicle_id,
    status: vehicle.status,
    lat: vehicle.lat,
    lng: vehicle.lng,
  }));

  return res.status(200).json({
    success: true,
    total: locations.length,
    items: locations,
  });
});

const validStatuses = new Set([
  "moving",
  "idle",
  "charging",
  "offline",
  "fault",
]);

export interface HistoryPoint {
  ts: string;
  soc_pct: number;
  battery_temp_c: number;
  speed_kmh: number;
}

router.get("/:id/history", (req, res) => {
  const vehicleId = req.params.id;

  // Find the requested vehicle
  const vehicle = vehicles.find(
    (item) => item.vehicle_id === vehicleId
  );

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Vehicle not found",
    });
  }

  // Read query parameters
  const points =
    typeof req.query.points === "string"
      ? Number(req.query.points)
      : 24;

  const from =
    typeof req.query.from === "string"
      ? new Date(req.query.from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const to =
    typeof req.query.to === "string"
      ? new Date(req.query.to)
      : new Date();

  // Validate input
  if (
    !Number.isInteger(points) ||
    points < 2 ||
    points > 200 ||
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from >= to
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid history parameters",
    });
  }

  // Calculate time interval between readings
  const interval =
    (to.getTime() - from.getTime()) / (points - 1);

  // Define a real time gap window (e.g. 10% of points omitted to simulate real data gap)
  const gapStart = Math.floor(points * 0.4);
  const gapEnd = Math.floor(points * 0.52);

  // Generate mock historical readings with real time gaps
  const history: HistoryPoint[] = [];

  for (let index = 0; index < points; index++) {
    // Introduce real gap by omitting readings during this range
    if (index >= gapStart && index <= gapEnd) {
      continue;
    }

    const timestamp = new Date(
      from.getTime() + interval * index
    );

    const progress = index / (points - 1);
    const socVariation = Math.random() * 8;

    history.push({
      ts: timestamp.toISOString(),
      soc_pct: Number(
        Math.min(
          100,
          Math.max(
            0,
            vehicle.soc_pct - (1 - progress) * socVariation
          )
        ).toFixed(1)
      ),
      battery_temp_c: Number(
        (
          vehicle.battery_temp_c +
          (Math.random() * 4 - 2)
        ).toFixed(1)
      ),
      speed_kmh:
        vehicle.status === "moving"
          ? Number((Math.random() * 40 + 10).toFixed(1))
          : 0,
    });
  }

  // Return a plain array of { ts, soc_pct, battery_temp_c, speed_kmh } per contract
  return res.status(200).json(history);
});

router.get("/", (req, res) => {
  // Read query parameters
  const q =
    typeof req.query.q === "string"
      ? req.query.q.trim().toLowerCase()
      : "";

  const status =
    typeof req.query.status === "string"
      ? req.query.status
      : "";

  const socMin =
    typeof req.query.soc_min === "string"
      ? Number(req.query.soc_min)
      : undefined;

  const socMax =
    typeof req.query.soc_max === "string"
      ? Number(req.query.soc_max)
      : undefined;

  const bbox =
    typeof req.query.bbox === "string"
      ? req.query.bbox.trim()
      : "";

  const limit =
    typeof req.query.limit === "string"
      ? Number(req.query.limit)
      : 50;

  const cursor =
    typeof req.query.cursor === "string"
      ? Number(req.query.cursor)
      : 0;

  // Validate status
  if (status && !validStatuses.has(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid vehicle status",
    });
  }

  // Validate SOC
  if (
    (socMin !== undefined && (!Number.isFinite(socMin) || socMin < 0 || socMin > 100)) ||
    (socMax !== undefined && (!Number.isFinite(socMax) || socMax < 0 || socMax > 100)) ||
    (socMin !== undefined && socMax !== undefined && socMin > socMax)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid SOC range",
    });
  }

  // Validate bbox (west,south,east,north)
  let bboxCoords: [number, number, number, number] | null = null;
  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (
      parts.length !== 4 ||
      !parts.every(Number.isFinite) ||
      parts[0] > parts[2] || // west > east
      parts[1] > parts[3]    // south > north
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid bbox format. Expected: west,south,east,north",
      });
    }
    bboxCoords = parts as [number, number, number, number];
  }

  // Validate pagination
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 2000 ||
    !Number.isInteger(cursor) ||
    cursor < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid pagination parameters",
    });
  }

  // Apply search, filters, and bbox
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      !q || vehicle.vehicle_id.toLowerCase().includes(q);

    const matchesStatus =
      !status || vehicle.status === status;

    const matchesSocMin =
      socMin === undefined || vehicle.soc_pct >= socMin;

    const matchesSocMax =
      socMax === undefined || vehicle.soc_pct <= socMax;

    let matchesBbox = true;
    if (bboxCoords) {
      const [west, south, east, north] = bboxCoords;
      matchesBbox =
        vehicle.lng >= west &&
        vehicle.lng <= east &&
        vehicle.lat >= south &&
        vehicle.lat <= north;
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSocMin &&
      matchesSocMax &&
      matchesBbox
    );
  });

  // Apply pagination after filtering
  const items = filteredVehicles.slice(
    cursor,
    cursor + limit
  );

  const nextCursor =
    cursor + items.length < filteredVehicles.length
      ? String(cursor + items.length)
      : null;

  return res.status(200).json({
    success: true,
    total: filteredVehicles.length,
    items,
    next_cursor: nextCursor,
  });
});

export default router;
