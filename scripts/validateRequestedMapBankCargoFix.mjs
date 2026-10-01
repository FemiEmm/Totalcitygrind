import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");

const workHub = fs.readFileSync(
  path.join(root, "src/world/data/workHub.js"),
  "utf8",
);
const route = fs.readFileSync(
  path.join(
    root,
    "src/traffic/privatecitizen1/data/privateCitizen1Route.js",
  ),
  "utf8",
);
const vehicleData = fs.readFileSync(
  path.join(root, "src/population/data/populationVehicles.js"),
  "utf8",
);
const trafficSystem = fs.readFileSync(
  path.join(
    root,
    "src/population/systems/populationTraffic.js",
  ),
  "utf8",
);

const errors = [];

[
  'gridRect(9, 10, 1, 1)',
  'gridRect(10, 10, 1, 1)',
  'const brtCornerRebuildArea = gridRect(9, 9, 2, 2)',
].forEach((required) => {
  if (!workHub.includes(required)) {
    errors.push(`Missing Work Hub change: ${required}`);
  }
});

if (route.includes("oneLane(47, 14, SOUTH")) {
  errors.push("Private Citizen 1 still enters X47 Y14");
}

if (!route.includes("twoLaneHorizontal(49, 12, EAST)")) {
  errors.push("Private Citizen 1 does not continue to X49 Y13");
}

if (!route.includes("serviceTile(49, 14, SOUTH")) {
  errors.push("Private Citizen 1 does not turn into X49 Y14");
}

const cargoStart = vehicleData.indexOf('id: "cargo-truck"');
const cargoEnd = vehicleData.indexOf(
  'id: "delivery-van"',
  cargoStart,
);
const cargoBlock = vehicleData.slice(cargoStart, cargoEnd);

if (cargoBlock.includes("spriteCrop")) {
  errors.push("Cargo truck still contains the invalid sprite crop");
}

// The user explicitly asked not to change BRT turning behaviour.
if (trafficSystem.includes("if (vehicle.isBrt && boxRoadTurn)")) {
  errors.push("BRT turning behaviour was modified");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  "PASS: BRT map tiles, bank approach, and cargo sprite were changed without modifying BRT turning behaviour.",
);
