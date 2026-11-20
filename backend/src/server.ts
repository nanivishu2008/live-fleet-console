import app from "./app.js";
import { vehicles } from "./data/vehicles.js";
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Total vehicles generated: ${vehicles.length}`);
});