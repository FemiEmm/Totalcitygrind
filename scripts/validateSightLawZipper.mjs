import assert from "node:assert/strict";

import {
  POPULATION_TRAFFIC_CONFIG,
} from "../src/population/data/populationVehicles.js";
import {
  createPopulationTrafficState,
  getPopulationVehicleSightShape,
  updatePopulationTraffic,
} from "../src/population/systems/populationTraffic.js";

const alwaysDrivable = () => true;

function makeRoute(id, points) {
  return {
    id,
    originSpawnId: `${id}-origin`,
    destinationSpawnId: `${id}-destination`,
    flowGroup: "test",
    speedMultiplier: 1,
    weight: 1,
    periodWeights: { daytime: 1 },
    points,
  };
}

function makeVehicle({
  id,
  route,
  pointIndex = 1,
  x,
  y,
  rotation,
  speed = 0,
  cruiseSpeed = 100,
}) {
  return {
    id,
    typeId: "private-car",
    routeId: route.id,
    route,
    pointIndex,
    originSpawnId: route.originSpawnId,
    destinationSpawnId: route.destinationSpawnId,
    flowGroup: route.flowGroup,
    streamId: null,
    x,
    y,
    rotation,
    width: 32,
    length: 56,
    colour: "#fff",
    outlineColour: "#000",
    frontMarkerColour: "#fff",
    speed,
    cruiseSpeed,
    blocked: false,
    waitingForLeader: false,
    waitingAtYield: false,
    waitingAtTrafficLight: false,
    waitingAtMerge: false,
    waitingForMergeIntent: false,
    mergeSignalActive: false,
    mergeGranted: false,
    mergeId: null,
    mergeRole: null,
    trafficLightId: null,
    trafficLightSignal: null,
    hardBlockedSeconds: 0,
    activeZoneId: null,
  };
}

function update(state, routes, count, deltaSeconds = 0.05) {
  updatePopulationTraffic({
    state,
    routes,
    vehicleTypes: [],
    minuteOfDay: 12 * 60,
    deltaSeconds,
    player: null,
    playerCollisionBox: null,
    canOccupyWorld: alwaysDrivable,
    config: {
      ...POPULATION_TRAFFIC_CONFIG,
      maximumVehicleCount: count,
      daytimeVehicleCount: count,
    },
  });
}

const sightRoute = makeRoute("sight-east", [
  { x: 0, y: 8 * 120 },
  { x: 4000, y: 8 * 120 },
]);
const sightVehicle = makeVehicle({
  id: "sight-car",
  route: sightRoute,
  x: 16 * 120,
  y: 8 * 120,
  rotation: Math.PI / 2,
});
const sightShape = getPopulationVehicleSightShape(
  sightVehicle,
  POPULATION_TRAFFIC_CONFIG,
);

assert.equal(sightShape.width, 3 * 120);
assert.equal(sightShape.length, 3 * 120);
assert.ok(
  sightShape.x > sightVehicle.x,
  "Eastbound 3x3 sight must be positioned ahead of the car",
);

const mergeRoute = makeRoute("merging-south-to-east", [
  { x: 200, y: 0 },
  {
    x: 200,
    y: 200,
    mergeId: "test-zipper",
    mergeReleaseAfterPoints: 1,
    noSmooth: true,
  },
  { x: 500, y: 200, noSmooth: true },
  { x: 700, y: 200 },
]);
const throughRoute = makeRoute("through-east", [
  { x: 0, y: 200 },
  { x: 700, y: 200 },
]);

const crowdedState = createPopulationTrafficState();
crowdedState.seeded = true;
crowdedState.spawnTimer = Number.POSITIVE_INFINITY;
crowdedState.vehicles = [
  makeVehicle({
    id: "crowded-merger",
    route: mergeRoute,
    x: 200,
    y: 120,
    rotation: Math.PI,
    speed: 70,
  }),
  makeVehicle({
    id: "destination-blocker",
    route: throughRoute,
    x: 310,
    y: 200,
    rotation: Math.PI / 2,
    speed: 0,
    cruiseSpeed: 0,
  }),
];

for (let step = 0; step < 30; step += 1) {
  update(crowdedState, [mergeRoute, throughRoute], 2);
}

const crowdedMerger = crowdedState.vehicles.find((vehicle) => {
  return vehicle.id === "crowded-merger";
});
assert.equal(
  crowdedMerger.waitingAtMerge,
  true,
  "A car must wait when the destination road is physically occupied",
);
assert.ok(
  crowdedMerger.y < 200,
  "A blocked merger must remain before the merge point",
);

const zipperState = createPopulationTrafficState();
zipperState.seeded = true;
zipperState.spawnTimer = Number.POSITIVE_INFINITY;
zipperState.vehicles = [
  makeVehicle({
    id: "merge-1",
    route: mergeRoute,
    x: 200,
    y: 120,
    rotation: Math.PI,
    speed: 35,
  }),
  makeVehicle({
    id: "merge-2",
    route: mergeRoute,
    x: 200,
    y: 20,
    rotation: Math.PI,
    speed: 35,
  }),
  makeVehicle({
    id: "through-1",
    route: throughRoute,
    x: 90,
    y: 200,
    rotation: Math.PI / 2,
    speed: 45,
  }),
  makeVehicle({
    id: "through-2",
    route: throughRoute,
    x: 0,
    y: 200,
    rotation: Math.PI / 2,
    speed: 45,
  }),
];

update(zipperState, [mergeRoute, throughRoute], 4);
let controller = zipperState.mergeControllers["test-zipper"];
assert.equal(
  controller.activeVehicleId,
  "merge-1",
  "The first zipper grant should allow the front merging car",
);
assert.equal(
  zipperState.vehicles.find((vehicle) => vehicle.id === "through-1")
    .waitingForMergeIntent,
  true,
  "The through car must see the merge signal and wait",
);

const merge1 = zipperState.vehicles.find((vehicle) => {
  return vehicle.id === "merge-1";
});
Object.assign(merge1, {
  x: 620,
  y: 200,
  pointIndex: 3,
  rotation: Math.PI / 2,
});
controller.activeSeconds = 1;
update(zipperState, [mergeRoute, throughRoute], 4);
controller = zipperState.mergeControllers["test-zipper"];
assert.equal(
  controller.activeVehicleId,
  "through-1",
  "After a merger clears, the zipper must alternate to through traffic",
);

const through1 = zipperState.vehicles.find((vehicle) => {
  return vehicle.id === "through-1";
});
Object.assign(through1, {
  x: 620,
  y: 200,
  pointIndex: 1,
});
controller.activeSeconds = 1;
update(zipperState, [mergeRoute, throughRoute], 4);
controller = zipperState.mergeControllers["test-zipper"];
assert.equal(
  controller.activeVehicleId,
  "merge-2",
  "After through traffic clears, the zipper must alternate back to the merger",
);

console.log("3x3 sight law and zipper-merge checks passed");
