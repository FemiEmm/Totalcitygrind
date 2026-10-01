import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");

const trafficSource = fs.readFileSync(
  path.join(
    root,
    "src/population/systems/populationTraffic.js",
  ),
  "utf8",
);

const errors = [];

[
  "function getOrCreateMergeCollisionShape",
  "function getOrCreateMergeSightShape",
  "if (!otherVehicleShape)",
  "if (!vehicleShape || !vehicleSight)",
  "mergerShape &&",
].forEach((required) => {
  if (!trafficSource.includes(required)) {
    errors.push(`Missing external-shape safeguard: ${required}`);
  }
});

if (
  trafficSource.includes(
    "collisionShapes.get(otherVehicle.id),",
  )
) {
  errors.push(
    "Destination merge check still passes an undefined cached shape directly",
  );
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  "PASS: external tow trucks receive safe merge collision/sight shapes and undefined shapes are never passed to solidVehiclesOverlap.",
);
