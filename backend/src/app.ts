import express from "express";
import cors from "cors";
import vehicleRoutes from "./routes/vehicle.routes.js";
import fleetRoutes from "./routes/fleet.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import streamRoutes from "./routes/stream.routes.js";
import configRoutes from "./routes/config.routes.js";
import { activeFaults } from "./simulator/fault.config.js";

const app = express();

// Allow requests from our frontend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Latency injection middleware for all REST routes (except config and stream)
app.use((req, _res, next) => {
  if (
    activeFaults.latencyMs > 0 &&
    !req.path.startsWith("/v1/config") &&
    !req.path.startsWith("/v1/stream") &&
    !req.path.startsWith("/health")
  ) {
    setTimeout(next, activeFaults.latencyMs);
  } else {
    next();
  }
});

// Test route
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Fleet Console API is running"
  });
});

app.use("/v1/vehicles", vehicleRoutes);
app.use("/v1/fleet", fleetRoutes);
app.use("/v1/alerts", alertRoutes);
app.use("/v1/stream", streamRoutes);
app.use("/v1/config", configRoutes);

export default app;
