import { Router } from "express";
import { vehicles } from "../data/vehicles.js";

const router = Router();

router.get("/summary", (req, res) => {
  // Count vehicles by status
  const statusCounts = {
    moving: 0,
    idle: 0,
    charging: 0,
    offline: 0,
    fault: 0,
  };

  // Calculate total battery charge
  let totalSoc = 0;

  for (const vehicle of vehicles) {
    statusCounts[vehicle.status]++;

    totalSoc += vehicle.soc_pct;
  }

  // Calculate average battery charge
  const averageSoc =
    vehicles.length > 0
      ? Number((totalSoc / vehicles.length).toFixed(1))
      : 0;

  return res.status(200).json({
    success: true,
    data: {
      total_vehicles: vehicles.length,
      ...statusCounts,
      average_soc: averageSoc,
    },
  });
});

export default router;