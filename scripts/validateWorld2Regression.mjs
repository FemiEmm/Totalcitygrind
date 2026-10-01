import assert from "node:assert/strict";
import {
  WORLD2_BUILDINGS,
  WORLD2_ROADS,
  WORLD2_TRAFFIC_SPAWN_POINTS,
} from "../src/world2/data/worldMap2.js";
import { WORLD2_POPULATION_ROUTES } from "../src/world2/data/populationRoutes.js";
import { ALL_SIGNAL_LIGHTS } from "../src/world2/data/trafficLights.js";
import { MOTO_EAZI_LOCATIONS } from "../src/world2/data/motoEaziLocations.js";
import { raceOfferedOnDay } from "../src/characters/systems/mutiuEncounter.js";

const mentionsBridge = (value) =>
  /bridge|seven stone|unity-arch/i.test(String(value ?? ""));
const overlaps = (first, second) =>
  first.x < second.x + second.width &&
  first.x + first.width > second.x &&
  first.y < second.y + second.height &&
  first.y + first.height > second.y;

assert.equal(
  WORLD2_ROADS.some(
    (road) =>
      road.type === "bridge" ||
      road.kind === "bridge" ||
      mentionsBridge(road.id) ||
      mentionsBridge(road.name),
  ),
  false,
  "World 2 still contains bridge road data",
);
assert.equal(
  WORLD2_TRAFFIC_SPAWN_POINTS.some(
    (spawn) =>
      mentionsBridge(spawn.id) ||
      mentionsBridge(spawn.roadId) ||
      /unity-(?:north|south)-approach/i.test(spawn.roadId),
  ),
  false,
  "World 2 still contains a bridge/approach traffic spawn",
);
assert.equal(
  WORLD2_POPULATION_ROUTES.some(
    (route) =>
      mentionsBridge(route.id) ||
      route.roadIds?.some(
        (roadId) =>
          mentionsBridge(roadId) ||
          /unity-(?:north|south)-approach/i.test(roadId),
      ),
  ),
  false,
  "World 2 still contains an AI bridge route",
);
assert.equal(
  ALL_SIGNAL_LIGHTS.some(
    (light) => mentionsBridge(light.id) || mentionsBridge(light.label),
  ),
  false,
  "World 2 still contains a bridge traffic light",
);
assert.equal(
  MOTO_EAZI_LOCATIONS.some(
    (location) =>
      mentionsBridge(location.id) || mentionsBridge(location.label),
  ),
  false,
  "World 2 still contains a bridge destination",
);

const overlapsWithRoad = WORLD2_BUILDINGS.flatMap((building) =>
  WORLD2_ROADS.filter((road) => overlaps(building, road)).map(
    (road) => building.id + " overlaps " + road.id,
  ),
);
assert.deepEqual(
  overlapsWithRoad,
  [],
  "World 2 buildings overlap roads after bridge removal",
);

const offeredDays = Array.from(
  { length: 1000 },
  (_, index) => index + 1,
).filter(raceOfferedOnDay).length;
assert.ok(
  offeredDays >= 610 && offeredDays <= 650,
  "Mutiu invitation frequency drifted: " + offeredDays + "/1000 days",
);

console.log(
  "World 2 regression passed: no bridge artifacts, no building/road overlaps, Mutiu offers " +
    offeredDays +
    "/1000 nights.",
);
