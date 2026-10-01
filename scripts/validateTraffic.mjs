import assert from "node:assert/strict";

import {
  POPULATION_ROUTES,
  POPULATION_SPAWN_POINTS,
} from "../src/population/data/populationRoutes.js";
import {
  POPULATION_TRAFFIC_CONFIG,
  POPULATION_VEHICLE_TYPES,
} from "../src/population/data/populationVehicles.js";
import {
  TRAFFIC_LIGHT_CONFIG,
  TRAFFIC_LIGHTS,
} from "../src/population/data/trafficLights.js";
import {
  createPopulationTrafficState,
  getPopulationVehicleCollisionShape,
  seedPopulationTraffic,
  updatePopulationTraffic,
} from "../src/population/systems/populationTraffic.js";
import {
  GRID_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../src/world/data/mapConstants.js";
import {
  roads,
} from "../src/world/data/worldMap.js";
import {
  findObstacleCollision,
  getSolidVehicleBounds,
  solidVehiclesOverlap,
} from "../src/world/systems/worldCollision.js";

const EDGE_MARGIN = GRID_SIZE;
const SAMPLE_DISTANCE = 20;

function canPopulationVehicleOccupy(collisionShape) {
  const bounds = getSolidVehicleBounds(collisionShape);
  const stagingDistance = GRID_SIZE * 3;

  return (
    bounds.x >= -stagingDistance &&
    bounds.y >= -stagingDistance &&
    bounds.x + bounds.width <= WORLD_WIDTH + stagingDistance &&
    bounds.y + bounds.height <= WORLD_HEIGHT + stagingDistance &&
    findObstacleCollision(collisionShape) === null
  );
}
const regularRoutes = POPULATION_ROUTES.filter((route) => {
  return !route.permanentLoop;
});
const permanentLoopRoutes = POPULATION_ROUTES.filter((route) => {
  return route.permanentLoop;
});
const brtLoopRoutes = permanentLoopRoutes.filter((route) => {
  return route.brt;
});

const requiredCrossroadLights = new Set([
  "residential-crossroads-lights",
  "work-hub-crossroads-lights",
  "wealthy-crossroads-lights",
  "nightlife-crossroads-lights",
]);

TRAFFIC_LIGHTS.forEach((light) => {
  requiredCrossroadLights.delete(light.id);
});

assert.deepEqual(
  [...requiredCrossroadLights],
  [],
  "Every primary crossroads must have traffic lights",
);

function isAtWorldEdge(point) {
  return (
    point.x <= EDGE_MARGIN ||
    point.y <= EDGE_MARGIN ||
    point.x >= WORLD_WIDTH - EDGE_MARGIN ||
    point.y >= WORLD_HEIGHT - EDGE_MARGIN
  );
}

function pointIsOnRoad(point, road) {
  return (
    point.x >= road.x &&
    point.x <= road.x + road.width &&
    point.y >= road.y &&
    point.y <= road.y + road.height
  );
}

function pointIsDrivable(point) {
  return roads.some((road) => pointIsOnRoad(point, road));
}

function sampleRoute(route) {
  const samples = [];

  for (let index = 0; index < route.points.length - 1; index += 1) {
    const start = route.points[index];
    const end = route.points[index + 1];
    const distance = Math.hypot(
      end.x - start.x,
      end.y - start.y,
    );
    const steps = Math.max(
      1,
      Math.ceil(distance / SAMPLE_DISTANCE),
    );

    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      samples.push({
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      });
    }
  }

  return samples;
}

assert.equal(
  POPULATION_SPAWN_POINTS.length,
  regularRoutes.length,
  "Every ordinary route must expose one edge spawn binding",
);

assert.equal(
  new Set(
    POPULATION_SPAWN_POINTS.map((spawnPoint) => spawnPoint.routeId),
  ).size,
  POPULATION_SPAWN_POINTS.length,
  "Traffic spawn binding route IDs must be unique",
);

const offEdgeSpawns = POPULATION_SPAWN_POINTS.filter((spawnPoint) => {
  return !isAtWorldEdge(spawnPoint);
});

assert.deepEqual(
  offEdgeSpawns.map((spawnPoint) => spawnPoint.id),
  [],
  "Every traffic spawn gateway must be on the world edge",
);

const startupState = createPopulationTrafficState();

seedPopulationTraffic({
  state: startupState,
  routes: POPULATION_ROUTES,
  vehicleTypes: POPULATION_VEHICLE_TYPES,
  minuteOfDay: 6 * 60,
  playerCollisionBox: null,
  canOccupyWorld: canPopulationVehicleOccupy,
  config: POPULATION_TRAFFIC_CONFIG,
});

const invalidStartupPositions = startupState.vehicles.filter((vehicle) => {
  if (vehicle.isPermanentLoop) return false;
  const routeStart = vehicle.route.points[0];

  return vehicle.x !== routeStart.x || vehicle.y !== routeStart.y;
});

assert.deepEqual(
  invalidStartupPositions.map((vehicle) => vehicle.id),
  [],
  "Every startup vehicle must begin at point zero of its declared spawn route",
);

assert.equal(
  startupState.vehicles.filter((vehicle) => !vehicle.isPermanentLoop).length,
  new Set(POPULATION_SPAWN_POINTS.map((spawnPoint) => spawnPoint.id)).size,
  "Startup traffic must place one ordinary vehicle at each physical edge gateway",
);

const invalidSpeedVehicle = startupState.vehicles.find((vehicle) => {
  return !vehicle.isPermanentLoop;
});
const invalidSpeedStart = {
  x: invalidSpeedVehicle.x,
  y: invalidSpeedVehicle.y,
};

invalidSpeedVehicle.speed = Number.NaN;
startupState.spawnTimer = Number.POSITIVE_INFINITY;

updatePopulationTraffic({
  state: startupState,
  routes: POPULATION_ROUTES,
  vehicleTypes: POPULATION_VEHICLE_TYPES,
  minuteOfDay: 6 * 60 + 0.05,
  deltaSeconds: 0.05,
  player: null,
  viewPosition: invalidSpeedStart,
  playerCollisionBox: null,
  canOccupyWorld: canPopulationVehicleOccupy,
  trafficLights: [],
  config: POPULATION_TRAFFIC_CONFIG,
});

assert.ok(
  Number.isFinite(invalidSpeedVehicle.speed) &&
    Number.isFinite(invalidSpeedVehicle.x) &&
    Number.isFinite(invalidSpeedVehicle.y),
  "Invalid vehicle math must be converted into a safe finite stop",
);

assert.ok(
  Math.hypot(
    invalidSpeedVehicle.x - invalidSpeedStart.x,
    invalidSpeedVehicle.y - invalidSpeedStart.y,
  ) < GRID_SIZE,
  "Invalid vehicle math must never snap a vehicle to its route waypoint",
);

const clinicRoute = POPULATION_ROUTES.find((route) => {
  return route.id === "north-clinic-to-west-community";
});
const clinicState = createPopulationTrafficState();
const fixedRedLightState = { elapsedSeconds: 0 };
const singleVehicleConfig = {
  ...POPULATION_TRAFFIC_CONFIG,
  maximumVehicleCount: 1,
  spawnIntervalSeconds: 999,
  maximumSpawnAttemptsPerFrame: 1,
};

for (let step = 0; step < 500; step += 1) {
  updatePopulationTraffic({
    state: clinicState,
    routes: [clinicRoute],
    vehicleTypes: POPULATION_VEHICLE_TYPES.filter((vehicleType) => {
      return vehicleType.id === "private-car";
    }),
    minuteOfDay: 6 * 60 + step * 0.05,
    deltaSeconds: 0.05,
    player: null,
    playerCollisionBox: null,
    canOccupyWorld: () => true,
    trafficLights: TRAFFIC_LIGHTS,
    trafficLightState: fixedRedLightState,
    trafficLightConfig: TRAFFIC_LIGHT_CONFIG,
    config: singleVehicleConfig,
  });
}

const clinicVehicle = clinicState.vehicles[0];

assert.equal(
  clinicVehicle.trafficLightId,
  "clinic-t-junction-lights",
  "Southbound Clinic Access traffic must detect the X18 Y6 signal",
);
assert.equal(
  clinicVehicle.waitingAtTrafficLight,
  true,
  "Southbound Clinic Access traffic must stop for its red signal",
);
assert.ok(
  clinicVehicle.y < 6.95 * GRID_SIZE,
  "Clinic traffic must remain behind the junction stop line on red",
);

fixedRedLightState.elapsedSeconds = 10;

for (let step = 0; step < 200; step += 1) {
  updatePopulationTraffic({
    state: clinicState,
    routes: [clinicRoute],
    vehicleTypes: POPULATION_VEHICLE_TYPES,
    minuteOfDay: 6 * 60 + 25 + step * 0.05,
    deltaSeconds: 0.05,
    player: null,
    playerCollisionBox: null,
    canOccupyWorld: () => true,
    trafficLights: TRAFFIC_LIGHTS,
    trafficLightState: fixedRedLightState,
    trafficLightConfig: TRAFFIC_LIGHT_CONFIG,
    config: singleVehicleConfig,
  });
}

assert.ok(
  clinicState.vehicles.length === 0 ||
    clinicState.vehicles[0].y >= 7 * GRID_SIZE,
  "Clinic traffic must proceed through the junction when its signal turns green",
);

const boxRuleState = createPopulationTrafficState();

seedPopulationTraffic({
  state: boxRuleState,
  routes: [clinicRoute],
  vehicleTypes: POPULATION_VEHICLE_TYPES,
  minuteOfDay: 6 * 60,
  playerCollisionBox: null,
  canOccupyWorld: canPopulationVehicleOccupy,
  config: singleVehicleConfig,
});

const boxRuleApproachingVehicle = boxRuleState.vehicles[0];
Object.assign(boxRuleApproachingVehicle, {
  x: 18.5 * GRID_SIZE,
  y: 6.1 * GRID_SIZE,
  rotation: Math.PI,
  pointIndex: 1,
  lastSafeX: 18.5 * GRID_SIZE,
  lastSafeY: 6.1 * GRID_SIZE,
  lastSafeRotation: Math.PI,
  speed: 80,
});

const boxRuleBlockingVehicle = {
  ...boxRuleApproachingVehicle,
  id: "controlled-box-blocker",
  x: 18.5 * GRID_SIZE,
  y: 7.7 * GRID_SIZE,
  lastSafeX: 18.5 * GRID_SIZE,
  lastSafeY: 7.7 * GRID_SIZE,
  speed: 0,
  terminalLayoverRemainingMinutes: 999,
  waitingAtTerminal: true,
};
boxRuleState.vehicles.push(boxRuleBlockingVehicle);
boxRuleState.spawnTimer = Number.POSITIVE_INFINITY;

const fixedGreenLightState = { elapsedSeconds: 10 };

for (let step = 0; step < 300; step += 1) {
  updatePopulationTraffic({
    state: boxRuleState,
    routes: [clinicRoute],
    vehicleTypes: POPULATION_VEHICLE_TYPES,
    minuteOfDay: 6 * 60 + step * 0.05,
    deltaSeconds: 0.05,
    player: null,
    playerCollisionBox: null,
    canOccupyWorld: canPopulationVehicleOccupy,
    trafficLights: TRAFFIC_LIGHTS,
    trafficLightState: fixedGreenLightState,
    trafficLightConfig: TRAFFIC_LIGHT_CONFIG,
    config: singleVehicleConfig,
  });
}

assert.equal(
  boxRuleApproachingVehicle.trafficLightSignal,
  "green",
  "The controlled-box regression must use a green signal",
);
assert.equal(
  boxRuleApproachingVehicle.waitingAtTrafficLight,
  true,
  "A green signal must not admit traffic into an occupied 2x2 junction box",
);
assert.ok(
  boxRuleApproachingVehicle.y < 6.95 * GRID_SIZE,
  "A vehicle must wait behind the stop line while the controlled box is occupied",
);

boxRuleState.vehicles = boxRuleState.vehicles.filter((vehicle) => {
  return vehicle.id !== boxRuleBlockingVehicle.id;
});

for (let step = 0; step < 200; step += 1) {
  updatePopulationTraffic({
    state: boxRuleState,
    routes: [clinicRoute],
    vehicleTypes: POPULATION_VEHICLE_TYPES,
    minuteOfDay: 6 * 60 + 15 + step * 0.05,
    deltaSeconds: 0.05,
    player: null,
    playerCollisionBox: null,
    canOccupyWorld: canPopulationVehicleOccupy,
    trafficLights: TRAFFIC_LIGHTS,
    trafficLightState: fixedGreenLightState,
    trafficLightConfig: TRAFFIC_LIGHT_CONFIG,
    config: singleVehicleConfig,
  });
}

assert.ok(
  boxRuleState.vehicles.length === 0 ||
    boxRuleState.vehicles[0].y >= 7 * GRID_SIZE,
  "Traffic must enter after the green controlled box becomes clear",
);

const collisionRecoveryBrtRoute = POPULATION_ROUTES.find((route) => {
  return route.id === "brt-1-clockwise-city-loop";
});
const collisionRecoveryCarRoute = POPULATION_ROUTES.find((route) => {
  return route.id === "north-highway-to-west-expressway";
});
const collisionRecoveryState = createPopulationTrafficState();

seedPopulationTraffic({
  state: collisionRecoveryState,
  routes: [collisionRecoveryBrtRoute, collisionRecoveryCarRoute],
  vehicleTypes: POPULATION_VEHICLE_TYPES,
  minuteOfDay: 6 * 60,
  playerCollisionBox: null,
  canOccupyWorld: canPopulationVehicleOccupy,
  config: {
    ...POPULATION_TRAFFIC_CONFIG,
    maximumVehicleCount: 2,
    spawnIntervalSeconds: 999,
  },
});

const collisionRecoveryBrt = collisionRecoveryState.vehicles.find(
  (vehicle) => vehicle.isBrt,
);
const collisionRecoveryCar = collisionRecoveryState.vehicles.find(
  (vehicle) => !vehicle.isBrt,
);

Object.assign(collisionRecoveryBrt, {
  x: 58.45 * GRID_SIZE,
  y: 14.2 * GRID_SIZE,
  rotation: Math.PI,
  pointIndex: 3,
  lastSafeX: 58.45 * GRID_SIZE,
  lastSafeY: 14.2 * GRID_SIZE,
  lastSafeRotation: Math.PI,
  speed: 80,
});
Object.assign(collisionRecoveryCar, {
  x: 58.45 * GRID_SIZE,
  y: 14.55 * GRID_SIZE,
  rotation: Math.PI,
  pointIndex: 2,
  lastSafeX: 58.45 * GRID_SIZE,
  lastSafeY: 14.55 * GRID_SIZE,
  lastSafeRotation: Math.PI,
  speed: 20,
});

assert.equal(
  solidVehiclesOverlap(
    getPopulationVehicleCollisionShape(collisionRecoveryBrt),
    getPopulationVehicleCollisionShape(collisionRecoveryCar),
  ),
  true,
  "The rear-end recovery test must begin with overlapping vehicles",
);

const collisionRecoveryCarStartY = collisionRecoveryCar.y;

for (let step = 0; step < 120; step += 1) {
  updatePopulationTraffic({
    state: collisionRecoveryState,
    routes: [collisionRecoveryBrtRoute, collisionRecoveryCarRoute],
    vehicleTypes: POPULATION_VEHICLE_TYPES,
    minuteOfDay: 6 * 60 + step * 0.05,
    deltaSeconds: 0.05,
    player: null,
    playerCollisionBox: null,
    canOccupyWorld: canPopulationVehicleOccupy,
    trafficLights: [],
    config: {
      ...POPULATION_TRAFFIC_CONFIG,
      maximumVehicleCount: 2,
      spawnIntervalSeconds: 999,
    },
  });
}

assert.ok(
  collisionRecoveryCar.y > collisionRecoveryCarStartY,
  "A leading car must be allowed to pull clear after a rear-end overlap",
);
assert.equal(
  solidVehiclesOverlap(
    getPopulationVehicleCollisionShape(collisionRecoveryBrt),
    getPopulationVehicleCollisionShape(collisionRecoveryCar),
  ),
  false,
  "A BRT rear-end overlap must separate instead of deadlocking",
);

const interiorRouteEnds = regularRoutes.filter((route) => {
  return !isAtWorldEdge(route.points.at(-1));
});

assert.deepEqual(
  interiorRouteEnds.map((route) => route.id),
  [],
  "Population routes may only finish at a world edge",
);

const spawnGatewayIds = new Set(
  POPULATION_SPAWN_POINTS.map((spawnPoint) => spawnPoint.id),
);
const invalidDestinations = regularRoutes.filter((route) => {
  return (
    !route.destinationSpawnId ||
    route.destinationSpawnId === route.originSpawnId ||
    !spawnGatewayIds.has(route.destinationSpawnId)
  );
});

assert.deepEqual(
  invalidDestinations.map((route) => route.id),
  [],
  "Every traffic route must name a different, valid edge destination",
);

assert.equal(
  brtLoopRoutes.length,
  2,
  "Traffic must define exactly two permanent city-loop buses",
);

assert.equal(
  brtLoopRoutes.reduce((total, route) => {
    return total + (route.loopVehicleCount ?? 0);
  }, 0),
  2,
  "Permanent routes must create exactly two BRT buses",
);

const invalidBrtLoops = brtLoopRoutes.filter((route) => {
  const start = route.points[0];
  const end = route.points.at(-1);

  return (
    !route.brt ||
    !route.vehicleTypes?.includes("brt") ||
    route.terminalLayoverMinutes !== 30 ||
    start.x !== end.x ||
    start.y !== end.y
  );
});

assert.deepEqual(
  invalidBrtLoops.map((route) => route.id),
  [],
  "Each BRT must be a closed loop with a 30-minute terminal layover",
);

const offRoadRoutes = POPULATION_ROUTES.flatMap((route) => {
  const invalidSample = sampleRoute(route).find((point) => {
    return !pointIsDrivable(point);
  });

  return invalidSample
    ? [
        `${route.id} at ${Math.round(invalidSample.x)},${Math.round(invalidSample.y)}`,
      ]
    : [];
});

assert.deepEqual(
  offRoadRoutes,
  [],
  "Every sampled traffic route segment must remain on a road",
);

const invalidRoadWidths = roads.filter((road) => {
  const narrowDimension = Math.min(road.width, road.height);
  const expectedWidths =
    road.type === "dirt" || road.type === "local"
      ? [GRID_SIZE]
      : [GRID_SIZE * 2];

  return !expectedWidths.includes(narrowDimension);
});

assert.deepEqual(
  invalidRoadWidths.map((road) => road.id),
  [],
  "Main/highway roads must be two tiles wide; local and dirt roads one tile wide",
);

const simulationConfig = {
  ...POPULATION_TRAFFIC_CONFIG,
  baseVehicleCount: 1,
  maximumVehicleCount: 1,
  spawnIntervalSeconds: 999,
  maximumSpawnAttemptsPerFrame: 1,
};

const simulationFailures = [];

for (const route of regularRoutes) {
  const state = createPopulationTrafficState();
  let spawned = false;
  let completedAtEdge = false;
  let lastPosition = null;

  for (let step = 0; step < 24000; step += 1) {
    if (spawned) {
      state.spawnTimer = Number.POSITIVE_INFINITY;
    }

    if (state.vehicles[0]) {
      lastPosition = {
        x: state.vehicles[0].x,
        y: state.vehicles[0].y,
      };
    }

    updatePopulationTraffic({
      state,
      routes: [route],
      vehicleTypes: [POPULATION_VEHICLE_TYPES[0]],
      trafficPeriod: {
        id: "normal",
        densityMultiplier: 1,
      },
      deltaSeconds: 0.05,
      player: null,
      playerCollisionBox: null,
      canOccupyWorld: canPopulationVehicleOccupy,
      config: simulationConfig,
    });

    if (state.vehicles.length > 0) {
      spawned = true;
    }

    if (spawned && state.vehicles.length === 0) {
      completedAtEdge =
        lastPosition !== null &&
        isAtWorldEdge(lastPosition);
      break;
    }
  }

  if (!spawned || !completedAtEdge) {
    console.error(
      `Route simulation failed: ${route.id}; ` +
        `spawned=${spawned}; vehicles=${state.vehicles.length}; ` +
        `last=${lastPosition ? `${Math.round(lastPosition.x)},${Math.round(lastPosition.y)}` : "none"}`,
    );
    simulationFailures.push(route.id);
  }
}

assert.deepEqual(
  simulationFailures,
  [],
  "Every traffic route must spawn, navigate, and leave only at a world edge",
);

const brtVehicleType = POPULATION_VEHICLE_TYPES.find((vehicleType) => {
  return vehicleType.id === "brt";
});
const brtSimulationFailures = [];

for (const route of brtLoopRoutes) {
  const state = createPopulationTrafficState();
  let minuteOfDay = 6 * 60;
  let movedAwayFromTerminal = false;
  let completedLoop = false;

  for (let step = 0; step < 36000; step += 1) {
    minuteOfDay += 0.05;

    updatePopulationTraffic({
      state,
      routes: [route],
      vehicleTypes: [brtVehicleType],
      minuteOfDay,
      deltaSeconds: 0.05,
      player: null,
      playerCollisionBox: null,
      canOccupyWorld: canPopulationVehicleOccupy,
      config: simulationConfig,
    });

    const vehicle = state.vehicles[0];

    if (!vehicle) {
      continue;
    }

    movedAwayFromTerminal ||= Math.hypot(
      vehicle.x - route.points[0].x,
      vehicle.y - route.points[0].y,
    ) > GRID_SIZE;

    if (
      movedAwayFromTerminal &&
      vehicle.waitingAtTerminal &&
      vehicle.terminalLayoverRemainingMinutes > 0
    ) {
      completedLoop = true;
      break;
    }
  }

  if (
    state.vehicles.length !== 1 ||
    !movedAwayFromTerminal ||
    !completedLoop
  ) {
    brtSimulationFailures.push(route.id);
  }
}

assert.deepEqual(
  brtSimulationFailures,
  [],
  "Each BRT must drive its complete route, return to the terminal, and begin its layover",
);

const recoveryRoute = POPULATION_ROUTES.find((route) => {
  return route.id === "west-expressway-to-east";
});
const recoveryState = createPopulationTrafficState();

updatePopulationTraffic({
  state: recoveryState,
  routes: [recoveryRoute],
  vehicleTypes: [POPULATION_VEHICLE_TYPES[0]],
  trafficPeriod: {
    id: "normal",
    densityMultiplier: 1,
  },
  deltaSeconds: 0.05,
  player: null,
  playerCollisionBox: null,
  canOccupyWorld: canPopulationVehicleOccupy,
  config: simulationConfig,
});

assert.ok(
  recoveryState.vehicles[0],
  "The blocked-road recovery test must spawn a vehicle",
);

recoveryState.spawnTimer = Number.POSITIVE_INFINITY;

for (let step = 0; step < 80; step += 1) {
  updatePopulationTraffic({
    state: recoveryState,
    routes: [recoveryRoute],
    vehicleTypes: [POPULATION_VEHICLE_TYPES[0]],
    trafficPeriod: {
      id: "normal",
      densityMultiplier: 1,
    },
    deltaSeconds: 0.05,
    player: null,
    playerCollisionBox: null,
    canOccupyWorld: () => false,
    config: simulationConfig,
  });
}

const blockedPosition = {
  x: recoveryState.vehicles[0].x,
  y: recoveryState.vehicles[0].y,
};

for (let step = 0; step < 160; step += 1) {
  updatePopulationTraffic({
    state: recoveryState,
    routes: [recoveryRoute],
    vehicleTypes: [POPULATION_VEHICLE_TYPES[0]],
    trafficPeriod: {
      id: "normal",
      densityMultiplier: 1,
    },
    deltaSeconds: 0.05,
    player: null,
    playerCollisionBox: null,
    canOccupyWorld: canPopulationVehicleOccupy,
    config: simulationConfig,
  });
}

assert.ok(
  recoveryState.vehicles.length === 0 ||
    Math.hypot(
      recoveryState.vehicles[0].x - blockedPosition.x,
      recoveryState.vehicles[0].y - blockedPosition.y,
    ) > GRID_SIZE,
  "A vehicle must attempt to move again after a blocked road clears",
);

console.log(
  `Traffic validation passed: ${POPULATION_SPAWN_POINTS.length} edge gateways, ` +
    `${regularRoutes.length} simulated edge-to-edge routes, ` +
    "two closed BRT terminal loops with 30-minute layovers, " +
    "four primary signal-controlled crossroads, " +
    "valid destinations, and blocked-road recovery",
);
