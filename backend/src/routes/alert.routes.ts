import { Router } from "express";
import { alerts } from "../data/alerts.js";

const router = Router();

// GET /v1/alerts
router.get("/", (req, res) => {
  const state =
    typeof req.query.state === "string"
      ? req.query.state
      : "";

  const limit =
    typeof req.query.limit === "string"
      ? Number(req.query.limit)
      : 50;

  const cursor =
    typeof req.query.cursor === "string"
      ? Number(req.query.cursor)
      : 0;

  // Validate state
  if (
    state &&
    state !== "open" &&
    state !== "acknowledged"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid alert state",
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

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    return !state || alert.state === state;
  });

  // Apply pagination
  const items = filteredAlerts.slice(
    cursor,
    cursor + limit
  );

  const nextCursor =
    cursor + items.length < filteredAlerts.length
      ? String(cursor + items.length)
      : null;

  return res.status(200).json({
    success: true,
    total: filteredAlerts.length,
    items,
    next_cursor: nextCursor,
  });
});

// POST /v1/alerts/:id/ack
router.post("/:id/ack", (req, res) => {
  const alertId = req.params.id;
  const version = req.body?.version;

  // Validate version
  if (
    !Number.isInteger(version) ||
    version < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid alert version is required",
    });
  }

  // Find alert
  const alert = alerts.find(
    (item) => item.id === alertId
  );

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: "Alert not found",
    });
  }

  // Check whether the alert version is outdated
  if (alert.version !== version) {
    return res.status(409).json({
      success: false,
      message: "Alert has been modified. Please refresh.",
      current_version: alert.version,
    });
  }

  // Acknowledge alert
  alert.state = "acknowledged";
  alert.version++;

  return res.status(200).json({
    success: true,
    message: "Alert acknowledged successfully",
    data: alert,
  });
});

export default router;