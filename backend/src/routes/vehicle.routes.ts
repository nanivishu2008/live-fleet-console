import { Router } from "express";
import { vehicles } from "../data/vehicles.js";

const router = Router();

const validStatuses = new Set([
  "moving",
  "idle",
  "charging",
  "offline",
  "fault",
]);

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

  // Validate pagination
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(cursor) ||
    cursor < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid pagination parameters",
    });
  }

  // Apply search and filters
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      !q || vehicle.vehicle_id.toLowerCase().includes(q);

    const matchesStatus =
      !status || vehicle.status === status;

    const matchesSocMin =
      socMin === undefined || vehicle.soc_pct >= socMin;

    const matchesSocMax =
      socMax === undefined || vehicle.soc_pct <= socMax;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSocMin &&
      matchesSocMax
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