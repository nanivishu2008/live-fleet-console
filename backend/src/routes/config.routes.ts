import { Router } from "express";
import { activeFaults, updateFaults } from "../simulator/fault.config.js";

const router = Router();

router.get("/faults", (_req, res) => {
  return res.status(200).json({
    success: true,
    data: activeFaults,
  });
});

router.post("/faults", (req, res) => {
  const updated = updateFaults(req.body ?? {});
  return res.status(200).json({
    success: true,
    message: "Faults configuration updated",
    data: updated,
  });
});

export default router;
