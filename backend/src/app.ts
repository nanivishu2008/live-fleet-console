import express from "express";
import cors from "cors";
import vehicleRoutes from "./routes/vehicle.routes.js";
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

export default app;