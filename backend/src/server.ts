import app from "./app.js";
import { vehicles } from "./data/vehicles.js";
import { startVehicleSimulator } from "./simulator/vehicle.simulator.js";

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Total vehicles: ${vehicles.length}`);

  startVehicleSimulator();
});