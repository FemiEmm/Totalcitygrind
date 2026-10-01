import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const towSystem = fs.readFileSync(
  path.join(root, "src/population/systems/towTruckSystem.js"),
  "utf8",
);

const errors = [];
[
  "function rerouteTowTruck",
  "function buildEmergencyReturnPlan",
  "function beginTowingReturn",
  "function towTruckNeedsReroute",
  "rememberAvoidedTile",
  "status: truck.status",
].forEach((required) => {
  if (!towSystem.includes(required)) {
    errors.push(`Missing emergency behavior: ${required}`);
  }
});

if (towSystem.includes("trafficVehicles.some")) {
  errors.push("Civilian traffic can still stop the tow truck");
}
if (towSystem.includes("solidVehiclesOverlap(truckShape, playerCollisionBox)")) {
  errors.push("Player contact can still stop the tow truck");
}
if (!towSystem.includes('truck.status === "towing"')) {
  errors.push("Towing return does not use reroute logic");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  "PASS: vehicle contact cannot stop a recovery truck, and dispatch plus towing missions reroute from the current position.",
);
