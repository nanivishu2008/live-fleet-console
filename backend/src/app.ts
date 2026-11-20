import express from "express";
import cors from "cors";
import vehicleRoutes from "./routes/vehicle.routes.js";
import fleetRoutes from "./routes/fleet.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import streamRoutes from "./routes/stream.routes.js";

const app = express();

// Allow requests from our frontend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());
// Test route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fleet Console API is running"
  });
});

app.use("/v1/vehicles", vehicleRoutes);
app.use("/v1/fleet", fleetRoutes);
app.use("/v1/alerts", alertRoutes);
app.use("/v1/stream", streamRoutes);

export default app;