import {
  GRID_SIZE,
  WORLD_HEIGHT,
  WORLD_MIN_Y,
  WORLD_WIDTH,
} from "../../world/data/mapConstants.js";
import {
  beginPrivateCitizen1WaypointDwell,
  ensurePrivateCitizen1Spawn,
  releasePrivateCitizen1MergeReservation,
  shouldBlockVehicleForPrivateCitizenMergeReservation,
  updatePrivateCitizen1Dwell,
  updatePrivateCitizen1MergeReservation,
  updatePrivateCitizen1StartWait,
} from "../../traffic/privatecitizen1/systems/privateCitizen1System.js";
import {
  getTrafficLightSignal,
  TRAFFIC_SIGNAL,
} from "./trafficLightSystem.js";
import {
  getHighwayLightSignal,
  HIGHWAY_SIGNAL,
} from "./highwayLightSystem.js";
import {
  createSolidVehicleShape,
  getSolidVehicleBounds,
  isSolidVehicleShape,
  solidVehiclesOverlap,
} from "../../world/systems/worldCollision.js";
function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function moveTowards(value, target, maximumChange) {
  if (value < target) {
    return Math.min(value + maximumChange, target);
  }

  if (value > target) {
    return Math.max(value - maximumChange, target);
  }

  return target;
}

function rotateTowards(current, target, maximumChange) {
  const difference = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );

  // Keep the destination on the same rotational branch as the vehicle.
  // Returning the raw target at the -PI/PI seam makes interpolation look
  // like a full 360 degree turn even when the vehicle is already facing right.
  const nearestTarget = current + difference;

  if (Math.abs(difference) <= maximumChange) {
    return nearestTarget;
  }

  return current + Math.sign(difference) * maximumChange;
}

function randomBetween(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

function pickWeighted(items, getWeight) {
  const totalWeight = items.reduce(
    (total, item) => total + Math.max(0, getWeight(item)),
    0,
  );

  if (totalWeight <= 0) {
    return items[0] ?? null;
  }

  let remainingWeight = Math.random() * totalWeight;

  for (const item of items) {
    remainingWeight -= Math.max(0, getWeight(item));

    if (remainingWeight <= 0) {
      return item;
    }
  }

  return items[items.length - 1] ?? null;
}

function getRotationTowards(from, to) {
  return Math.atan2(
    to.x - from.x,
    -(to.y - from.y),
  );
}

function getForwardVector(rotation) {
  return {
    x: Math.sin(rotation),
    y: -Math.cos(rotation),
  };
}

function getRightVector(rotation) {
  return {
    x: Math.cos(rotation),
    y: Math.sin(rotation),
  };
}



function distanceBetween(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function isAtWorldEdge(vehicle) {
  const edgeMargin = GRID_SIZE;

  return (
    vehicle.x <= edgeMargin ||
    vehicle.y <= WORLD_MIN_Y + edgeMargin ||
    vehicle.x >= WORLD_WIDTH - edgeMargin ||
    vehicle.y >= WORLD_HEIGHT - edgeMargin
  );
}

export function getPopulationVehicleCollisionShape(
  vehicle,
  position = vehicle,
  padding = 0,
) {
  return createSolidVehicleShape(
    {
      width: vehicle.collisionWidth ?? vehicle.width,
      length: vehicle.collisionLength ?? vehicle.length,
    },
    position,
    padding,
  );
}

export function getPopulationVehicleCollisionBox(
  vehicle,
  position = vehicle,
  padding = 0,
) {
  return getSolidVehicleBounds(
    getPopulationVehicleCollisionShape(
      vehicle,
      position,
      padding,
    ),
  );
}

function normaliseSolidCollisionShape(collisionArea) {
  if (isSolidVehicleShape(collisionArea)) {
    return collisionArea;
  }

  return {
    x: collisionArea.x + collisionArea.width / 2,
    y: collisionArea.y + collisionArea.height / 2,
    width: collisionArea.width,
    length: collisionArea.height,
    rotation: 0,
  };
}

export function createPopulationTrafficState() {
  return {
    vehicles: [],
    vehiclePool: [],
    nextVehicleNumber: 1,
    spawnTimer: 0,
    activeStreams: [],
    streamCursor: 0,
    nextStreamNumber: 1,
    currentProfileId: null,
    seeded: false,
    mergeControllers: {},
    permanentLoopSpawnTimers: {},
    lastTrafficMinuteOfDay: null,
    spatialIndex: null,
    collisionVehiclesBuffer: [],
    vehiclesToRemove: new Set(),
    activeVehicleIds: new Set(),
    aiTowRequestVehicleIds: new Set(),
    towReservedTileOwners: new Map(),
    towReservedCorridorAllowedVehicleIds: new Map(),
    privateCitizenMergeReservedTileOwners: new Map(),
  };
}

function normaliseMinuteOfDay(minuteOfDay) {
  const dayMinutes = 24 * 60;
  return ((minuteOfDay % dayMinutes) + dayMinutes) % dayMinutes;
}

function interpolate(start, end, progress) {
  return start + (end - start) * clamp(progress, 0, 1);
}

export function getPopulationTrafficProfile(
  minuteOfDay,
  config,
) {
  const minute = normaliseMinuteOfDay(minuteOfDay ?? 0);

  if (minute < config.dawnStartMinute) {
    return {
      id: "overnight",
      targetVehicleCount: config.overnightVehicleCount,
    };
  }

  if (minute < config.morningRushStartMinute) {
    const progress =
      (minute - config.dawnStartMinute) /
      (config.morningRushStartMinute - config.dawnStartMinute);

    return {
      id: "dawn",
      targetVehicleCount: Math.round(
        interpolate(
          config.overnightVehicleCount,
          config.morningRushVehicleCount,
          progress,
        ),
      ),
    };
  }

  if (minute < config.morningRushEndMinute) {
    return {
      id: "morning-rush",
      targetVehicleCount: config.morningRushVehicleCount,
    };
  }

  if (minute < config.eveningRushStartMinute) {
    return {
      id: "daytime",
      targetVehicleCount: config.daytimeVehicleCount,
    };
  }

  if (minute < config.eveningRushEndMinute) {
    return {
      id: "evening-rush",
      targetVehicleCount: config.eveningRushVehicleCount,
    };
  }

  const progress =
    (minute - config.eveningRushEndMinute) /
    (config.midnightMinute - config.eveningRushEndMinute);

  return {
    id: "late-night",
    targetVehicleCount: Math.round(
      interpolate(
        config.eveningRushVehicleCount,
        config.overnightVehicleCount,
        progress,
      ),
    ),
  };
}

export function getPopulationTargetCount(
  minuteOfDayOrTrafficPeriod,
  config,
) {
  if (Number.isFinite(minuteOfDayOrTrafficPeriod)) {
    return clamp(
      getPopulationTrafficProfile(
        minuteOfDayOrTrafficPeriod,
        config,
      ).targetVehicleCount,
      0,
      config.maximumVehicleCount,
    );
  }

  if (
    Number.isFinite(
      minuteOfDayOrTrafficPeriod?.minuteOfDay,
    )
  ) {
    return getPopulationTargetCount(
      minuteOfDayOrTrafficPeriod.minuteOfDay,
      config,
    );
  }

  const fallbackCount =
    config.daytimeVehicleCount ??
    config.baseVehicleCount ??
    0;

  return clamp(
    Math.round(
      fallbackCount *
        (minuteOfDayOrTrafficPeriod?.densityMultiplier ?? 1),
    ),
    0,
    config.maximumVehicleCount,
  );
}

export function populationTrafficOverlaps(
  collisionArea,
  vehicles,
  ignoredVehicleId = null,
  padding = 0,
) {
  const collisionShape = normaliseSolidCollisionShape(
    collisionArea,
  );

  return vehicles.some((vehicle) => {
    if (vehicle.id === ignoredVehicleId) {
      return false;
    }

    return solidVehiclesOverlap(
      collisionShape,
      getPopulationVehicleCollisionShape(
        vehicle,
        vehicle,
        padding,
      ),
    );
  });
}

function getRoutePeriodWeight(route, trafficProfile) {
  return (
    route.periodWeights?.[trafficProfile.id] ??
    route.weight ??
    1
  );
}

function pickRoute(routes, trafficProfile) {
  return pickWeighted(
    routes,
    (candidate) => getRoutePeriodWeight(
      candidate,
      trafficProfile,
    ),
  );
}

function pickVehicleType(vehicleTypes, route) {
  const allowedTypes = route.vehicleTypes
    ? vehicleTypes.filter((type) => {
        return route.vehicleTypes.includes(type.id);
      })
    : vehicleTypes;

  return pickWeighted(
    allowedTypes,
    (candidate) => candidate.weight,
  );
}

function canSpawnVehicle({
  vehicle,
  state,
  playerCollisionBox,
  canOccupyWorld,
  config,
}) {
  const physicalShape = getPopulationVehicleCollisionShape(
    vehicle,
    vehicle,
    config.collisionPadding,
  );

  const spawnShape = getPopulationVehicleCollisionShape(
    vehicle,
    vehicle,
    config.spawnClearance,
  );
  const minimumSpawnSeparation = Math.max(
    0,
    vehicle.route.minimumSpawnSeparation ?? 0,
  );

  if (!canOccupyWorld(physicalShape)) {
    return false;
  }

  if (
    minimumSpawnSeparation > 0 &&
    state.vehicles.some((otherVehicle) => {
      return (
        otherVehicle.flowGroup === vehicle.flowGroup &&
        Math.hypot(
          otherVehicle.x - vehicle.x,
          otherVehicle.y - vehicle.y,
        ) < minimumSpawnSeparation
      );
    })
  ) {
    return false;
  }

  if (
    playerCollisionBox &&
    solidVehiclesOverlap(
      spawnShape,
      normaliseSolidCollisionShape(playerCollisionBox),
    )
  ) {
    return false;
  }

  return !populationTrafficOverlaps(
    spawnShape,
    state.vehicles,
    null,
    config.spawnClearance,
  );
}

function getActiveZone(route, pointIndex) {
  return route.points[pointIndex]?.zoneId ?? null;
}

function isPassengerBusVehicle(vehicle) {
  return vehicle.typeId === "danfo";
}

function advancePopulationRoute(vehicle) {
  vehicle.pointIndex += 1;

  if (vehicle.pointIndex >= vehicle.route.points.length) {
    if (vehicle.route.permanentLoop) {
      // Loop routes repeat their first point at the end. Once that closing
      // point is reached, continue towards point 1 without teleporting.
      vehicle.pointIndex = 1;
      vehicle.activeZoneId = getActiveZone(vehicle.route, 1);
      vehicle.terminalLayoverRemainingMinutes =
        vehicle.route.terminalLayoverMinutes ?? 0;
      vehicle.waitingAtTerminal =
        vehicle.terminalLayoverRemainingMinutes > 0;
      vehicle.speed = 0;
      if (isPassengerBusVehicle(vehicle)) {
        vehicle.nextBusStopIndex = 0;
        vehicle.activeBusStopId = null;
      }
      return false;
    }

    if (isAtWorldEdge(vehicle)) {
      return true;
    }

    vehicle.pointIndex = vehicle.route.points.length - 1;
    vehicle.speed = 0;
    vehicle.blocked = true;
    return false;
  }

  vehicle.activeZoneId = getActiveZone(
    vehicle.route,
    vehicle.pointIndex,
  );

  return false;
}


function distancePointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.0001) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function getDanfoRouteStops(route, busStops, tolerance) {
  if (!busStops?.length || !route?.points?.length) return [];

  const explicitStopIds = route.points
    .map((routePoint) => routePoint.busStopId)
    .filter(Boolean);

  if (explicitStopIds.length > 0) {
    const stopById = new Map(busStops.map((stop) => [stop.id, stop]));
    return explicitStopIds
      .map((stopId) => stopById.get(stopId))
      .filter(Boolean);
  }

  return busStops.filter((stop) => {
    const centre = { x: stop.x + stop.width / 2, y: stop.y + stop.height / 2 };
    for (let i = 0; i < route.points.length - 1; i += 1) {
      if (distancePointToSegment(centre, route.points[i], route.points[i + 1]) <= tolerance) return true;
    }
    return false;
  });
}

function updateDanfoBusStop(vehicle, busStops, deltaSeconds, config) {
  if (!isPassengerBusVehicle(vehicle)) return false;
  if (!vehicle.routeBusStops) {
    vehicle.routeBusStops = getDanfoRouteStops(vehicle.route, busStops, config.danfoBusStopRouteTolerance);
  }
  if (vehicle.busStopDwellRemaining > 0) {
    vehicle.busStopDwellRemaining = Math.max(0, vehicle.busStopDwellRemaining - deltaSeconds);
    vehicle.speed = 0;
    vehicle.blocked = true;
    return true;
  }
  const nextStop = vehicle.routeBusStops[vehicle.nextBusStopIndex];
  if (!nextStop) return false;
  const centreX = nextStop.x + nextStop.width / 2;
  const centreY = nextStop.y + nextStop.height / 2;
  const distance = Math.hypot(vehicle.x - centreX, vehicle.y - centreY);
  if (distance <= config.danfoBusStopApproachDistance) {
    vehicle.busStopDwellRemaining = config.danfoBusStopDwellSeconds;
    vehicle.activeBusStopId = nextStop.id;
    vehicle.nextBusStopIndex += 1;
    vehicle.speed = 0;
    vehicle.blocked = true;
    return true;
  }
  return false;
}

function createVehicle({
  state,
  route,
  vehicleType,
  config,
  streamId = null,
}) {
  const startIndex = clamp(
    route.initialPointIndex ?? 0,
    0,
    Math.max(0, route.points.length - 2),
  );
  const start = route.points[startIndex];
  const target = route.points[startIndex + 1];
  const routeSpeedMultiplier = clamp(
    route.speedMultiplier,
    config.minimumRouteSpeedMultiplier,
    config.maximumRouteSpeedMultiplier,
  );

  const vehicleData = {
    id: `population-${state.nextVehicleNumber}`,
    typeId: route.vehicleTypeId ?? vehicleType.id,
    routeId: route.id,
    route,
    pointIndex: startIndex + 1,
    originSpawnId: route.originSpawnId ?? route.spawnId,
    destinationSpawnId: route.destinationSpawnId,
    flowGroup: route.flowGroup,
    streamId,
    isPermanentLoop: Boolean(route.permanentLoop),
    isBrt: Boolean(route.brt),

    x: start.x,
    y: start.y,
    rotation: getRotationTowards(start, target),
    previousX: start.x,
    previousY: start.y,
    previousRotation: getRotationTowards(start, target),
    aiUpdateAccumulator: 0,
    aiGameMinutesAccumulator: 0,
    lastSafeX: start.x,
    lastSafeY: start.y,
    lastSafeRotation: getRotationTowards(start, target),

    width: vehicleType.width,
    length: vehicleType.length,
    renderWidth: vehicleType.renderWidth ?? vehicleType.width,
    renderLength: vehicleType.renderLength ?? vehicleType.length,
    collisionWidth:
      vehicleType.collisionWidth ?? vehicleType.width,
    collisionLength:
      vehicleType.collisionLength ?? vehicleType.length,
    colour: vehicleType.colour,
    outlineColour: vehicleType.outlineColour,
    frontMarkerColour: vehicleType.frontMarkerColour,
    displayLabel:
      route.displayLabel ?? vehicleType.displayLabel ?? null,
    spriteUrl: route.spriteUrl ?? vehicleType.spriteUrl ?? null,
    spriteCrop: vehicleType.spriteCrop ?? null,

    speed: 0,
    acceleration:
      vehicleType.acceleration ?? config.acceleration,
    cruiseSpeed:
      randomBetween(
        vehicleType.minimumSpeed,
        vehicleType.maximumSpeed,
      ) *
      routeSpeedMultiplier *
      (config.cruiseSpeedMultiplier ?? 1),

    blocked: false,
    waitingForLeader: false,
    waitingAtYield: false,
    waitingAtTrafficLight: false,
    waitingForTowReservation: false,
    waitingAtMerge: false,
    waitingForMergeIntent: false,
    mergeSignalActive: false,
    mergeGranted: false,
    mergeId: null,
    mergeRole: null,
    trafficLightId: null,
    trafficLightSignal: null,
    blockingVehicleId: null,
    blockedByPlayer: false,
    hardBlockedSeconds: 0,
    repeatedBlockerId: null,
    repeatedBlockerHits: 0,
    blockerContactLatched: false,
    waitingForReportedTow: false,
    collisionRetryDelaySeconds: 0,
    hornCooldownSeconds: 0,
    hornStoppedSeconds: 0,
    hornTriggerSeconds: null,
    collisionResolution: null,
    towStallSeconds: 0,
    towAssigned: false,
    beingTowed: false,
    routeBusStops: null,
    nextBusStopIndex: 0,
    activeBusStopId: null,
    busStopDwellRemaining: 0,
    terminalLayoverRemainingMinutes:
      route.initialLayoverMinutes ?? 0,
    waitingAtTerminal:
      (route.initialLayoverMinutes ?? 0) > 0,
    privateCitizen1StartWaitRemainingSeconds:
      route.initialRealTimeWaitSeconds ?? 0,
    waitingAtPrivateCitizenStart:
      (route.initialRealTimeWaitSeconds ?? 0) > 0,
    privateCitizen1DwellRemainingMinutes: 0,
    privateCitizen1CompletedDwellPointIndex: null,
    waitingAtPrivateCitizenStop: false,
    privateCitizen1MergeReservationKey: null,
    waitingForPrivateCitizenMerge: false,
    waitingForPrivateCitizenMergeReservation: false,
    activeZoneId: getActiveZone(route, 1),
  };

  const pooledVehicle = state.vehiclePool?.pop();

  if (!pooledVehicle) {
    return vehicleData;
  }

  Object.keys(pooledVehicle).forEach((key) => {
    delete pooledVehicle[key];
  });
  Object.assign(pooledVehicle, vehicleData);
  return pooledVehicle;
}

function trySpawnPopulationVehicle({
  state,
  route,
  vehicleTypes,
  streamId,
  playerCollisionBox,
  canOccupyWorld,
  config,
}) {
  if (!route || route.points.length < 2) {
    return false;
  }

  const vehicleType = pickVehicleType(
    vehicleTypes,
    route,
  );

  if (!vehicleType) {
    return false;
  }

  const vehicle = createVehicle({
    state,
    route,
    vehicleType,
    config,
    streamId,
  });

  if (
    !canSpawnVehicle({
      vehicle,
      state,
      playerCollisionBox,
      canOccupyWorld,
      config,
    })
  ) {
    return false;
  }

  state.nextVehicleNumber += 1;
  state.vehicles.push(vehicle);
  return true;
}

function getManagedFleetRoutes(routes) {
  return routes.filter((route) => {
    return (
      (route.permanentLoop || route.persistentFleet) &&
      (route.loopVehicleCount ?? 0) > 0
    );
  });
}

function getRegularPopulationRoutes(routes) {
  return routes.filter((route) => {
    return !route.permanentLoop && !route.persistentFleet;
  });
}

function getPermanentLoopTargetCount(routes) {
  return getManagedFleetRoutes(routes).reduce((total, route) => {
    return total + Math.max(0, route.loopVehicleCount ?? 0);
  }, 0);
}

function createAndAddPrivateCitizen1Vehicle({
  state,
  route,
  vehicleTypes,
  config,
}) {
  const vehicleType = pickVehicleType(vehicleTypes, route);

  if (!vehicleType) {
    return false;
  }

  const vehicle = createVehicle({
    state,
    route,
    vehicleType,
    config,
    streamId: "private-citizen-1-direct-spawn",
  });

  // Spawn horizontally on the road, facing east.
  vehicle.rotation = Math.PI / 2;
  vehicle.previousRotation = Math.PI / 2;
  vehicle.lastSafeRotation = Math.PI / 2;

  state.nextVehicleNumber += 1;
  state.vehicles.push(vehicle);
  return true;
}

function ensurePermanentLoopTraffic({
  state,
  routes,
  vehicleTypes,
  playerCollisionBox,
  canOccupyWorld,
  config,
  deltaSeconds = 0,
}) {
  let spawnedCount = 0;

  for (const route of getManagedFleetRoutes(routes)) {
    // Police and other initial-only fleets are placed directly in their
    // reserved parking bays while the world is seeded. They are never added
    // later during gameplay, so they cannot appear out of thin air.
    if (route.initialFleetOnly) {
      if (!state.seeded) {
        const desiredCount = Math.max(0, route.loopVehicleCount ?? 0);
        let existingCount = state.vehicles.filter((vehicle) => {
          return vehicle.routeId === route.id;
        }).length;

        while (existingCount < desiredCount) {
          const vehicleType = pickVehicleType(vehicleTypes, route);
          if (!vehicleType) break;

          const vehicle = createVehicle({
            state,
            route,
            vehicleType,
            config,
            streamId: `initial-parked-${route.id}`,
          });
          vehicle.speed = 0;
          vehicle.waitingAtTerminal = true;
          vehicle.terminalLayoverRemainingMinutes = 24 * 60;

          state.nextVehicleNumber += 1;
          state.vehicles.push(vehicle);
          existingCount += 1;
          spawnedCount += 1;
        }
      }
      continue;
    }

    const existingTimer =
      state.permanentLoopSpawnTimers[route.id];
    const spawnTimer = Math.max(
      0,
      (
        existingTimer ??
        route.initialSpawnDelaySeconds ??
        0
      ) -
        deltaSeconds,
    );
    state.permanentLoopSpawnTimers[route.id] = spawnTimer;

    const desiredCount = Math.max(0, route.loopVehicleCount ?? 0);
    let existingCount = state.vehicles.filter((vehicle) => {
      return vehicle.routeId === route.id;
    }).length;

    if (spawnTimer > 0) {
      continue;
    }

    while (existingCount < desiredCount) {
      const spawned = trySpawnPopulationVehicle({
        state,
        route,
        vehicleTypes,
        streamId: `permanent-loop-${route.id}`,
        playerCollisionBox,
        canOccupyWorld,
        config,
      });

      if (!spawned) {
        state.permanentLoopSpawnTimers[route.id] =
          route.spawnRetryDelaySeconds ?? 1;
        break;
      }

      existingCount += 1;
      spawnedCount += 1;
      state.permanentLoopSpawnTimers[route.id] =
        route.loopSpawnIntervalSeconds ?? 0;

      if ((route.loopSpawnIntervalSeconds ?? 0) > 0) {
        break;
      }
    }
  }

  return spawnedCount;
}

function createTrafficObject(vehicle) {
  return {
    id: vehicle.id,
    x: vehicle.x,
    y: vehicle.y,
    width: vehicle.width,
    length: vehicle.length,
    rotation: vehicle.rotation,
    speed: Number.isFinite(vehicle.speed)
      ? Math.max(0, vehicle.speed)
      : 0,
    routeId: vehicle.routeId,
    pointIndex: vehicle.pointIndex,
    requiresMergeClearance: Boolean(
      vehicle.waitingAtMerge ||
      vehicle.waitingForMergeIntent ||
      vehicle.mergeSignalActive
    ),
    isPlayer: false,
  };
}

function createPlayerObject(player) {
  if (!player) {
    return null;
  }

  return {
    id: "player",
    x: player.x,
    y: player.y,
    width: player.width,
    length: player.length,
    rotation: player.rotation,
    speed: Math.abs(player.speed ?? 0),
    isPlayer: true,
  };
}


function getSpatialCellKey(column, row) {
  return `${column}:${row}`;
}

function createTrafficSpatialIndex(
  vehicles,
  cellSize,
  reusableIndex = null,
) {
  const index = reusableIndex ?? {
    cells: new Map(),
    cellSize,
    cellPool: [],
    vehicleCells: new Map(),
    vehicleReferences: new Map(),
    seenVehicleIds: new Set(),
  };
  const cells = index.cells;
  const cellPool = index.cellPool ?? [];
  const vehicleCells = index.vehicleCells ?? new Map();
  const vehicleReferences =
    index.vehicleReferences ?? new Map();
  const seenVehicleIds = index.seenVehicleIds ?? new Set();

  if (index.cellSize !== cellSize) {
    for (const cell of cells.values()) {
      cell.length = 0;
      cellPool.push(cell);
    }
    cells.clear();
    vehicleCells.clear();
    vehicleReferences.clear();
  }

  seenVehicleIds.clear();

  for (const vehicle of vehicles) {
    const vehicleId = vehicle.id;
    const column = Math.floor(vehicle.x / cellSize);
    const row = Math.floor(vehicle.y / cellSize);
    const key = getSpatialCellKey(column, row);
    const previousKey = vehicleCells.get(vehicleId);

    seenVehicleIds.add(vehicleId);
    vehicleReferences.set(vehicleId, vehicle);

    if (previousKey === key) {
      continue;
    }

    if (previousKey) {
      const previousCell = cells.get(previousKey);
      const previousIndex = previousCell?.indexOf(vehicle) ?? -1;
      if (previousIndex >= 0) {
        previousCell.splice(previousIndex, 1);
      }
      if (previousCell?.length === 0) {
        cells.delete(previousKey);
        cellPool.push(previousCell);
      }
    }

    const cell = cells.get(key) ?? cellPool.pop() ?? [];
    cell.push(vehicle);
    cells.set(key, cell);
    vehicleCells.set(vehicleId, key);
  }

  for (const [vehicleId, key] of vehicleCells) {
    if (seenVehicleIds.has(vehicleId)) {
      continue;
    }

    const vehicle = vehicleReferences.get(vehicleId);
    const cell = cells.get(key);
    const vehicleIndex = cell?.indexOf(vehicle) ?? -1;
    if (vehicleIndex >= 0) {
      cell.splice(vehicleIndex, 1);
    }
    if (cell?.length === 0) {
      cells.delete(key);
      cellPool.push(cell);
    }
    vehicleCells.delete(vehicleId);
    vehicleReferences.delete(vehicleId);
  }

  index.cellSize = cellSize;
  index.cellPool = cellPool;
  index.vehicleCells = vehicleCells;
  index.vehicleReferences = vehicleReferences;
  index.seenVehicleIds = seenVehicleIds;
  return index;
}

function updateVehicleSpatialCell(spatialIndex, vehicle) {
  if (!spatialIndex || !vehicle?.id) {
    return;
  }

  const column = Math.floor(vehicle.x / spatialIndex.cellSize);
  const row = Math.floor(vehicle.y / spatialIndex.cellSize);
  const key = getSpatialCellKey(column, row);
  const previousKey = spatialIndex.vehicleCells.get(vehicle.id);

  if (key === previousKey) {
    return;
  }

  if (previousKey) {
    const previousCell = spatialIndex.cells.get(previousKey);
    const previousIndex = previousCell?.indexOf(vehicle) ?? -1;
    if (previousIndex >= 0) {
      previousCell.splice(previousIndex, 1);
    }
    if (previousCell?.length === 0) {
      spatialIndex.cells.delete(previousKey);
      spatialIndex.cellPool.push(previousCell);
    }
  }

  const cell =
    spatialIndex.cells.get(key) ??
    spatialIndex.cellPool.pop() ??
    [];
  cell.push(vehicle);
  spatialIndex.cells.set(key, cell);
  spatialIndex.vehicleCells.set(vehicle.id, key);
  spatialIndex.vehicleReferences.set(vehicle.id, vehicle);
}

function getNearbyTrafficVehicles(
  spatialIndex,
  x,
  y,
  radius,
) {
  const minimumColumn = Math.floor(
    (x - radius) / spatialIndex.cellSize,
  );
  const maximumColumn = Math.floor(
    (x + radius) / spatialIndex.cellSize,
  );
  const minimumRow = Math.floor(
    (y - radius) / spatialIndex.cellSize,
  );
  const maximumRow = Math.floor(
    (y + radius) / spatialIndex.cellSize,
  );

  const nearby = [];

  for (
    let column = minimumColumn;
    column <= maximumColumn;
    column += 1
  ) {
    for (
      let row = minimumRow;
      row <= maximumRow;
      row += 1
    ) {
      const cell = spatialIndex.cells.get(
        getSpatialCellKey(column, row),
      );

      if (cell) {
        nearby.push(...cell);
      }
    }
  }

  return nearby;
}

export function populationTrafficStateOverlaps(
  collisionArea,
  state,
  ignoredVehicleId = null,
  padding = 0,
) {
  if (!state?.spatialIndex) {
    return populationTrafficOverlaps(
      collisionArea,
      state?.vehicles ?? [],
      ignoredVehicleId,
      padding,
    );
  }

  const collisionShape = normaliseSolidCollisionShape(
    collisionArea,
  );
  const bounds = getSolidVehicleBounds(collisionShape);
  const searchDistance =
    Math.max(bounds.width, bounds.height) / 2 +
    GRID_SIZE * 1.5 +
    padding;
  const nearbyVehicles = getNearbyTrafficVehicles(
    state.spatialIndex,
    collisionShape.x,
    collisionShape.y,
    searchDistance,
  );

  return populationTrafficOverlaps(
    collisionShape,
    nearbyVehicles,
    ignoredVehicleId,
    padding,
  );
}

function createActiveZoneIndex(vehicles) {
  const zones = new Map();

  for (const vehicle of vehicles) {
    if (!vehicle.activeZoneId) {
      continue;
    }

    const zoneVehicles = zones.get(vehicle.activeZoneId) ?? [];
    zoneVehicles.push(vehicle);
    zones.set(vehicle.activeZoneId, zoneVehicles);
  }

  return zones;
}

function getProjectedHalfExtent(object, axis) {
  const objectForward = getForwardVector(object.rotation);
  const objectRight = getRightVector(object.rotation);

  return (
    Math.abs(
      objectForward.x * axis.x +
      objectForward.y * axis.y
    ) *
      object.length /
      2 +
    Math.abs(
      objectRight.x * axis.x +
      objectRight.y * axis.y
    ) *
      object.width /
      2
  );
}

function findNearestLeader(
  vehicle,
  nearbyVehicles,
  player,
  sightShape,
  config,
  leaderDetectionDistance,
) {
  const forward = getForwardVector(vehicle.rotation);
  const right = getRightVector(vehicle.rotation);

  const objects = nearbyVehicles
    .filter((other) => other.id !== vehicle.id)
    .map(createTrafficObject);

  const playerObject = createPlayerObject(player);

  if (playerObject) {
    objects.push(playerObject);
  }

  let nearest = null;

  for (const object of objects) {
    const objectShape = createSolidVehicleShape(
      object,
      object,
    );

    if (
      sightShape &&
      !solidVehiclesOverlap(sightShape, objectShape)
    ) {
      continue;
    }

    const differenceX = object.x - vehicle.x;
    const differenceY = object.y - vehicle.y;

    const centreForwardDistance =
      differenceX * forward.x +
      differenceY * forward.y;

    if (
      centreForwardDistance <= 0 ||
      centreForwardDistance >
        leaderDetectionDistance +
          vehicle.length / 2 +
          object.length / 2
    ) {
      continue;
    }

    const sameRoute =
      !object.isPlayer &&
      object.routeId === vehicle.routeId;

    if (sameRoute) {
      const routeProgressAhead =
        object.pointIndex > vehicle.pointIndex ||
        (object.pointIndex === vehicle.pointIndex &&
          centreForwardDistance > 0);

      if (!routeProgressAhead) {
        continue;
      }
    } else if (!object.isPlayer) {
      // A nearby vehicle on a crossing road must not become a phantom
      // leader. Different-route traffic is followed only when it is already
      // travelling in roughly the same direction as this vehicle's current
      // path. Merge and yield conflicts are handled by their dedicated
      // systems, while the hard collision check remains the final safeguard.
      const objectForward = getForwardVector(object.rotation);
      const headingAlignment =
        forward.x * objectForward.x +
        forward.y * objectForward.y;
      const minimumHeadingAlignment =
        config.leaderHeadingAlignment ?? 0.72;

      if (headingAlignment < minimumHeadingAlignment) {
        continue;
      }
    }

    const lateralDistance = Math.abs(
      differenceX * right.x +
      differenceY * right.y,
    );

    const objectProjectedHalfWidth =
      getProjectedHalfExtent(object, right);

    const allowedLateralDistance =
      vehicle.width / 2 +
      objectProjectedHalfWidth +
      config.followingLateralTolerance;

    if (lateralDistance > allowedLateralDistance) {
      continue;
    }

    const objectProjectedHalfLength =
      getProjectedHalfExtent(object, forward);

    const bumperGap =
      centreForwardDistance -
      vehicle.length / 2 -
      objectProjectedHalfLength;

    if (!nearest || bumperGap < nearest.gap) {
      nearest = {
        object,
        gap: bumperGap,
      };
    }
  }

  return nearest;
}

function getLeaderLimitedSpeed(
  vehicle,
  leader,
  config,
) {
  if (!leader) {
    return vehicle.cruiseSpeed;
  }

  const mergeClearance =
    leader.object.requiresMergeClearance
      ? Number.isFinite(config.mergeQueueExtraGap)
        ? config.mergeQueueExtraGap
        : 0
      : 0;

  const totalExtraClearance = mergeClearance;

  const emergencyGap =
    config.emergencyStopGap + totalExtraClearance;

  if (leader.gap <= emergencyGap) {
    return 0;
  }

  const desiredGap =
    config.minimumFollowingGap +
    totalExtraClearance +
    vehicle.speed * config.followingTimeSeconds;

  if (leader.gap >= desiredGap) {
    return vehicle.cruiseSpeed;
  }

  const availableBrakingDistance = Math.max(
    0,
    leader.gap - emergencyGap,
  );

  const safeStoppingSpeed = Math.sqrt(
    2 * config.braking * availableBrakingDistance,
  );

  const leaderSpeed = Math.max(
    0,
    leader.object.speed - config.leaderSpeedBuffer,
  );

  return Math.min(
    vehicle.cruiseSpeed,
    leaderSpeed,
    safeStoppingSpeed,
  );
}

function getTurnLimitedSpeed(vehicle, config) {
  const currentTarget =
    vehicle.route.points[vehicle.pointIndex];

  const nextTarget =
    vehicle.route.points[vehicle.pointIndex + 1];

  if (!currentTarget || !nextTarget) {
    return vehicle.cruiseSpeed;
  }

  const distanceToTurn = distanceBetween(
    vehicle,
    currentTarget,
  );
  const turnSlowdownDistance = Math.max(
    config.turnSlowdownDistance ?? 0,
    vehicle.length * 1.5,
  );

  if (distanceToTurn > turnSlowdownDistance) {
    return vehicle.cruiseSpeed;
  }

  if (currentTarget.zoneId || nextTarget.zoneId) {
    return Math.min(
      vehicle.cruiseSpeed,
      config.roundaboutSpeed,
    );
  }

  const currentRotation = getRotationTowards(
    vehicle,
    currentTarget,
  );

  const nextRotation = getRotationTowards(
    currentTarget,
    nextTarget,
  );

  const turnAmount = Math.abs(
    Math.atan2(
      Math.sin(nextRotation - currentRotation),
      Math.cos(nextRotation - currentRotation),
    ),
  );

  if (turnAmount >= config.sharpTurnAngle) {
    return Math.min(
      vehicle.cruiseSpeed,
      config.sharpTurnSpeed,
    );
  }

  if (turnAmount >= config.normalTurnAngle) {
    return Math.min(
      vehicle.cruiseSpeed,
      config.normalTurnSpeed,
    );
  }

  return vehicle.cruiseSpeed;
}

function getDirectionVector(direction) {
  if (direction === "east") {
    return { x: 1, y: 0 };
  }

  if (direction === "west") {
    return { x: -1, y: 0 };
  }

  if (direction === "south") {
    return { x: 0, y: 1 };
  }

  return { x: 0, y: -1 };
}

const trafficLightReservationCache = new Map();
const MAX_TRAFFIC_LIGHT_RESERVATIONS = 4096;

function getTrafficLightPathCells(
  vehicle,
  light,
  approach,
  config,
) {
  const boxTiles =
    light.controlledBoxTiles ??
    config.trafficLightControlledBoxTiles ??
    2;
  const halfTiles = boxTiles / 2;
  const minimumColumn = Math.floor(light.x / GRID_SIZE - halfTiles);
  const minimumRow = Math.floor(light.y / GRID_SIZE - halfTiles);
  const maximumColumn = minimumColumn + boxTiles - 1;
  const maximumRow = minimumRow + boxTiles - 1;
  const pathCells = new Map();
  const routePoints = [
    { x: vehicle.x, y: vehicle.y },
    ...vehicle.route.points.slice(vehicle.pointIndex),
  ];
  let enteredControlledBox = false;

  function addSample(x, y) {
    const column = Math.floor(x / GRID_SIZE);
    const row = Math.floor(y / GRID_SIZE);
    const insideControlledBox =
      column >= minimumColumn &&
      column <= maximumColumn &&
      row >= minimumRow &&
      row <= maximumRow;

    if (insideControlledBox) {
      enteredControlledBox = true;
      pathCells.set(`${column}:${row}`, { column, row });
    }

    return insideControlledBox;
  }

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const start = routePoints[index];
    const end = routePoints[index + 1];
    const segmentLength = distanceBetween(start, end);
    const steps = Math.max(
      1,
      Math.ceil(segmentLength / (GRID_SIZE / 6)),
    );
    let segmentEnteredBox = false;

    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      const insideControlledBox = addSample(
        start.x + (end.x - start.x) * progress,
        start.y + (end.y - start.y) * progress,
      );
      segmentEnteredBox ||= insideControlledBox;

      if (
        enteredControlledBox &&
        segmentEnteredBox &&
        !insideControlledBox &&
        pathCells.size > 0
      ) {
        return [...pathCells.values()];
      }
    }
  }

  if (pathCells.size > 0) {
    return [...pathCells.values()];
  }

  // Fallback for an unusually short route ending at the junction.
  if (approach.axis === "horizontal") {
    const row = clamp(
      Math.floor(approach.stopY / GRID_SIZE),
      minimumRow,
      maximumRow,
    );

    for (
      let column = minimumColumn;
      column <= maximumColumn;
      column += 1
    ) {
      pathCells.set(`${column}:${row}`, { column, row });
    }
  } else {
    const column = clamp(
      Math.floor(approach.stopX / GRID_SIZE),
      minimumColumn,
      maximumColumn,
    );

    for (let row = minimumRow; row <= maximumRow; row += 1) {
      pathCells.set(`${column}:${row}`, { column, row });
    }
  }

  return [...pathCells.values()];
}

function getTrafficLightExitClearanceShapes(
  vehicle,
  light,
  config,
) {
  const halfBox =
    GRID_SIZE *
    (
      light.controlledBoxTiles ??
      config.trafficLightControlledBoxTiles ??
      2
    ) /
    2;
  const clearanceDistance =
    vehicle.length +
    (config.trafficLightExitClearanceBuffer ?? 0);
  const sampleSpacing = Math.max(
    GRID_SIZE / 3,
    vehicle.width * 0.7,
  );
  const routePoints = [
    { x: vehicle.x, y: vehicle.y },
    ...vehicle.route.points.slice(vehicle.pointIndex),
  ];
  const clearanceShapes = [];
  let enteredControlledBox = false;
  let exitedControlledBox = false;
  let distanceAfterExit = 0;
  let previousSample = routePoints[0];
  let distanceSinceShape = sampleSpacing;

  function isInsideControlledBox(position) {
    return (
      Math.abs(position.x - light.x) < halfBox &&
      Math.abs(position.y - light.y) < halfBox
    );
  }

  for (
    let index = 0;
    index < routePoints.length - 1;
    index += 1
  ) {
    const start = routePoints[index];
    const end = routePoints[index + 1];
    const segmentLength = distanceBetween(start, end);
    const steps = Math.max(
      1,
      Math.ceil(segmentLength / sampleSpacing),
    );
    const rotation = getRotationTowards(start, end);

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const sample = {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      };
      const sampleDistance = distanceBetween(
        previousSample,
        sample,
      );
      const insideControlledBox =
        isInsideControlledBox(sample);

      if (insideControlledBox) {
        enteredControlledBox = true;
      } else if (enteredControlledBox) {
        exitedControlledBox = true;
      }

      if (exitedControlledBox) {
        distanceAfterExit += sampleDistance;
        distanceSinceShape += sampleDistance;

        if (
          distanceSinceShape >= sampleSpacing ||
          clearanceShapes.length === 0
        ) {
          clearanceShapes.push(
            getPopulationVehicleCollisionShape(
              vehicle,
              {
                x: sample.x,
                y: sample.y,
                rotation,
              },
              config.collisionPadding,
            ),
          );
          distanceSinceShape = 0;
        }

        if (distanceAfterExit >= clearanceDistance) {
          return clearanceShapes;
        }
      }

      previousSample = sample;
    }
  }

  return clearanceShapes;
}

function getCachedTrafficLightReservationShapes({
  vehicle,
  light,
  approach,
  config,
}) {
  const cacheKey = [
    vehicle.routeId,
    vehicle.pointIndex,
    light.id,
    approach.id,
    vehicle.collisionWidth ?? vehicle.width,
    vehicle.collisionLength ?? vehicle.length,
    light.controlledBoxTiles ??
      config.trafficLightControlledBoxTiles,
    config.trafficLightExitClearanceBuffer,
    config.collisionPadding,
  ].join(":");
  const cachedShapes =
    trafficLightReservationCache.get(cacheKey);

  if (cachedShapes) {
    trafficLightReservationCache.delete(cacheKey);
    trafficLightReservationCache.set(cacheKey, cachedShapes);
    return cachedShapes;
  }

  const controlledPathShapes = getTrafficLightPathCells(
    vehicle,
    light,
    approach,
    config,
  ).map((cell) => {
    return createSolidVehicleShape(
      {
        width: GRID_SIZE,
        length: GRID_SIZE,
      },
      {
        x: (cell.column + 0.5) * GRID_SIZE,
        y: (cell.row + 0.5) * GRID_SIZE,
        rotation: 0,
      },
    );
  });
  const reservationShapes = Object.freeze([
    ...controlledPathShapes,
    ...getTrafficLightExitClearanceShapes(
      vehicle,
      light,
      config,
    ),
  ]);

  if (
    trafficLightReservationCache.size >=
    MAX_TRAFFIC_LIGHT_RESERVATIONS
  ) {
    const oldestKey =
      trafficLightReservationCache.keys().next().value;
    trafficLightReservationCache.delete(oldestKey);
  }

  trafficLightReservationCache.set(
    cacheKey,
    reservationShapes,
  );
  return reservationShapes;
}

function trafficLightPathIsOccupied({
  vehicle,
  light,
  approach,
  nearbyVehicles,
  playerCollisionBox,
  config,
}) {
  const reservedPathShapes =
    getCachedTrafficLightReservationShapes({
      vehicle,
      light,
      approach,
      config,
    });

  if (
    playerCollisionBox &&
    reservedPathShapes.some((pathShape) => {
      return solidVehiclesOverlap(
        pathShape,
        normaliseSolidCollisionShape(playerCollisionBox),
      );
    })
  ) {
    return true;
  }

  return nearbyVehicles.some((otherVehicle) => {
    return (
      otherVehicle.id !== vehicle.id &&
      reservedPathShapes.some((pathShape) => {
        return solidVehiclesOverlap(
          pathShape,
          getPopulationVehicleCollisionShape(otherVehicle),
        );
      })
    );
  });
}

function getTrafficLightControl({
  vehicle,
  nearbyVehicles,
  playerCollisionBox,
  trafficLights,
  trafficLightState,
  trafficLightConfig,
  config,
}) {
  if (
    !trafficLightState ||
    !trafficLightConfig ||
    !trafficLights?.length
  ) {
    return null;
  }

  const vehicleForward = getForwardVector(vehicle.rotation);
  const frontX =
    vehicle.x + vehicleForward.x * (vehicle.length / 2);
  const frontY =
    vehicle.y + vehicleForward.y * (vehicle.length / 2);

  let nearestControl = null;

  for (const light of trafficLights) {
    for (const approach of light.approaches) {
      const direction = getDirectionVector(approach.direction);
      const headingAlignment =
        vehicleForward.x * direction.x +
        vehicleForward.y * direction.y;

      if (headingAlignment < config.trafficLightHeadingAlignment) {
        continue;
      }

      const differenceX = approach.stopX - frontX;
      const differenceY = approach.stopY - frontY;
      const distanceToStop =
        differenceX * direction.x + differenceY * direction.y;

      // The vehicle is already past the stop line and committed to the
      // controlled 2x2 junction. The light must never stop it there.
      if (
        distanceToStop <= 0 ||
        distanceToStop > config.trafficLightDetectionDistance
      ) {
        continue;
      }

      const lateralX = -direction.y;
      const lateralY = direction.x;
      const lateralDistance = Math.abs(
        differenceX * lateralX + differenceY * lateralY,
      );

      if (lateralDistance > config.trafficLightLaneTolerance) {
        continue;
      }

      const signal = getTrafficLightSignal(
        light,
        approach,
        trafficLightState,
        trafficLightConfig,
      );

      const yellowCommitted =
        signal === TRAFFIC_SIGNAL.YELLOW &&
        distanceToStop <= config.trafficLightYellowCommitDistance;
      const allowRightOnRed =
        vehicle.route?.points?.[vehicle.pointIndex]?.allowRightOnRed === true;
      const signalRequiresStop =
        !allowRightOnRed &&
        (signal === TRAFFIC_SIGNAL.RED ||
          (signal === TRAFFIC_SIGNAL.YELLOW && !yellowCommitted));
      const controlledBoxBlocked = trafficLightPathIsOccupied({
        vehicle,
        light,
        approach,
        nearbyVehicles,
        playerCollisionBox,
        config,
      });

      if (!signalRequiresStop && !controlledBoxBlocked) {
        continue;
      }

      if (
        !nearestControl ||
        distanceToStop < nearestControl.distanceToStop
      ) {
        nearestControl = {
          lightId: light.id,
          approachId: approach.id,
          signal,
          distanceToStop,
          controlledBoxBlocked,
        };
      }
    }
  }

  return nearestControl;
}

function getHighwayLightControl({
  vehicle,
  nearbyVehicles,
  playerCollisionBox,
  highwayLights,
  highwayLightState,
  highwayLightConfig,
  config,
}) {
  if (!highwayLightState || !highwayLightConfig || !highwayLights?.length) {
    return null;
  }

  const vehicleForward = getForwardVector(vehicle.rotation);
  const frontX = vehicle.x + vehicleForward.x * (vehicle.length / 2);
  const frontY = vehicle.y + vehicleForward.y * (vehicle.length / 2);
  let nearestControl = null;

  for (const light of highwayLights) {
    for (const approach of light.approaches) {
      const direction = getDirectionVector(approach.direction);
      const headingAlignment =
        vehicleForward.x * direction.x + vehicleForward.y * direction.y;
      if (headingAlignment < config.trafficLightHeadingAlignment) continue;

      const differenceX = approach.stopX - frontX;
      const differenceY = approach.stopY - frontY;
      const distanceToStop = differenceX * direction.x + differenceY * direction.y;
      if (distanceToStop <= 0 || distanceToStop > config.trafficLightDetectionDistance) continue;

      const lateralX = -direction.y;
      const lateralY = direction.x;
      const lateralDistance = Math.abs(differenceX * lateralX + differenceY * lateralY);
      if (lateralDistance > config.trafficLightLaneTolerance) continue;

      const signal = getHighwayLightSignal(
        light, approach, highwayLightState, highwayLightConfig,
      );
      const yellowCommitted =
        signal === HIGHWAY_SIGNAL.YELLOW &&
        distanceToStop <= config.trafficLightYellowCommitDistance;
      const signalRequiresStop =
        signal === HIGHWAY_SIGNAL.RED ||
        (signal === HIGHWAY_SIGNAL.YELLOW && !yellowCommitted);

      // Highway green is intentionally uninterrupted by the controlled-box
      // reservation check. Normal leader following and hard collision checks
      // still prevent rear-end collisions. Merge/crossing traffic remains cautious.
      const controlledBoxBlocked =
        approach.priority === "merge"
          ? trafficLightPathIsOccupied({
              vehicle, light, approach, nearbyVehicles, playerCollisionBox, config,
            })
          : false;

      if (!signalRequiresStop && !controlledBoxBlocked) continue;
      if (!nearestControl || distanceToStop < nearestControl.distanceToStop) {
        nearestControl = {
          lightId: light.id,
          approachId: approach.id,
          signal,
          distanceToStop,
          controlledBoxBlocked,
          system: "highway",
        };
      }
    }
  }
  return nearestControl;
}

function getTrafficLightLimitedSpeed(
  vehicle,
  trafficLightControl,
  config,
) {
  if (!trafficLightControl) {
    return vehicle.cruiseSpeed;
  }

  const stoppingDistance = Math.max(
    0,
    trafficLightControl.distanceToStop -
      config.trafficLightStopBuffer,
  );

  if (stoppingDistance <= 0) {
    return 0;
  }

  const safeStoppingSpeed = Math.sqrt(
    2 * config.braking * stoppingDistance,
  );

  return Math.min(vehicle.cruiseSpeed, safeStoppingSpeed);
}

export function getPopulationVehicleSightShape(
  vehicle,
  config,
) {
  const target = vehicle.route?.points?.[vehicle.pointIndex] ?? null;
  const sightRotation = target
    ? getRotationTowards(vehicle, target)
    : vehicle.rotation;

  const forward = getForwardVector(sightRotation);
  const length = config.sightTilesAhead * GRID_SIZE;
  const width = config.sightTilesWide * GRID_SIZE;
  const centreDistance = vehicle.length / 2 + length / 2;

  return createSolidVehicleShape(
    { width, length },
    {
      x: vehicle.x + forward.x * centreDistance,
      y: vehicle.y + forward.y * centreDistance,
      rotation: sightRotation,
    },
  );
}

function getCardinalDirection(rotation) {
  const forward = getForwardVector(rotation);

  if (Math.abs(forward.x) >= Math.abs(forward.y)) {
    return forward.x >= 0 ? "east" : "west";
  }

  return forward.y >= 0 ? "south" : "north";
}

function getVehiclePathSegments(vehicle) {
  const currentTarget =
    vehicle.route?.points?.[vehicle.pointIndex] ?? null;
  const nextTarget =
    vehicle.route?.points?.[vehicle.pointIndex + 1] ?? null;

  const segments = [];

  if (currentTarget) {
    segments.push({ start: vehicle, end: currentTarget });
  }

  if (currentTarget && nextTarget) {
    segments.push({ start: currentTarget, end: nextTarget });
  }

  return segments;
}

function distanceFromPointToSegment(pointValue, start, end) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared =
    segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared <= 0.0001) {
    return distanceBetween(pointValue, start);
  }

  const projection = clamp(
    ((pointValue.x - start.x) * segmentX +
      (pointValue.y - start.y) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  );

  const nearestX = start.x + segmentX * projection;
  const nearestY = start.y + segmentY * projection;

  return Math.hypot(
    pointValue.x - nearestX,
    pointValue.y - nearestY,
  );
}

function vehiclePathApproachesPoint(
  vehicle,
  pointValue,
  tolerance,
) {
  return getVehiclePathSegments(vehicle).some((segment) => {
    return (
      distanceFromPointToSegment(
        pointValue,
        segment.start,
        segment.end,
      ) <= tolerance
    );
  });
}

function getVehicleMergeIntent(vehicle, config) {
  const target = vehicle.route?.points?.[vehicle.pointIndex] ?? null;
  const nextTarget =
    vehicle.route?.points?.[vehicle.pointIndex + 1] ?? null;

  if (!target?.mergeId || !nextTarget) {
    return null;
  }

  const distanceToStop = distanceBetween(vehicle, target);
  const sightDistance = config.sightTilesAhead * GRID_SIZE;

  if (distanceToStop > sightDistance + vehicle.length) {
    return null;
  }

  const approachRotation = getRotationTowards(vehicle, target);

  return {
    vehicle,
    vehicleId: vehicle.id,
    mergeId: target.mergeId,
    pointIndex: vehicle.pointIndex,
    releaseAfterPoints: target.mergeReleaseAfterPoints ?? 1,
    mergePoint: target,
    nextTarget,
    distanceToStop,
    approachKey: `merge:${getCardinalDirection(approachRotation)}`,
    sightShape: getPopulationVehicleSightShape(vehicle, config),
  };
}

function getMergeZoneDefinitions(routes) {
  const zones = new Map();

  routes.forEach((route) => {
    route.points.forEach((target, pointIndex) => {
      if (!target?.mergeId || zones.has(target.mergeId)) {
        return;
      }

      const previousTarget = route.points[pointIndex - 1] ?? target;
      const nextTarget = route.points[pointIndex + 1] ?? target;
      const destinationRotation = getRotationTowards(
        target,
        nextTarget,
      );

      zones.set(target.mergeId, {
        id: target.mergeId,
        point: target,
        pointIndex,
        routeId: route.id,
        previousTarget,
        nextTarget,
        destinationRotation,
        destinationDirection:
          getCardinalDirection(destinationRotation),
        releaseAfterPoints:
          target.mergeReleaseAfterPoints ?? 1,
      });
    });
  });

  return zones;
}

function createMergeConflictShape(zone, config) {
  const forward = getForwardVector(zone.destinationRotation);
  const length = config.sightTilesAhead * GRID_SIZE;
  const width = config.sightTilesWide * GRID_SIZE;
  const centreDistance = length / 2;

  return createSolidVehicleShape(
    { width, length },
    {
      x: zone.point.x + forward.x * centreDistance,
      y: zone.point.y + forward.y * centreDistance,
      rotation: zone.destinationRotation,
    },
  );
}

function getParticipantDistance(vehicle, mergePoint) {
  return distanceBetween(vehicle, mergePoint);
}

function pickFrontParticipant(participants, mergePoint) {
  return [...participants].sort((left, right) => {
    const distanceDifference =
      getParticipantDistance(left.vehicle, mergePoint) -
      getParticipantDistance(right.vehicle, mergePoint);

    if (Math.abs(distanceDifference) > 0.01) {
      return distanceDifference;
    }

    return left.vehicle.id.localeCompare(right.vehicle.id);
  })[0] ?? null;
}

function chooseAlternatingGroup(
  groups,
  lastServedGroup,
) {
  const groupNames = [...groups.keys()].sort();

  if (groupNames.length === 0) {
    return null;
  }

  if (groupNames.length === 1) {
    return groupNames[0];
  }

  if (!lastServedGroup || !groups.has(lastServedGroup)) {
    const mergeGroup = groupNames.find((groupName) => {
      return groupName.startsWith("merge:");
    });

    return mergeGroup ?? groupNames[0];
  }

  const previousIndex = groupNames.indexOf(lastServedGroup);

  for (let offset = 1; offset <= groupNames.length; offset += 1) {
    const groupName = groupNames[
      (previousIndex + offset) % groupNames.length
    ];

    if (groups.get(groupName)?.length) {
      return groupName;
    }
  }

  return groupNames[0];
}

function activeMergeGrantStillValid(
  controller,
  vehiclesById,
  config,
) {
  if (!controller.activeVehicleId) {
    return false;
  }

  const vehicle = vehiclesById.get(controller.activeVehicleId);

  if (!vehicle) {
    return false;
  }

  if (controller.activeSeconds >= config.mergeGrantTimeoutSeconds) {
    return false;
  }

  if (controller.role === "merge") {
    const clearedByRouteProgress =
      vehicle.routeId === controller.routeId &&
      vehicle.pointIndex >
        controller.pointIndex + controller.releaseAfterPoints;

    if (clearedByRouteProgress) {
      return false;
    }
  }

  const distanceFromMerge = distanceBetween(
    vehicle,
    controller.mergePoint,
  );

  if (
    controller.activeSeconds >= config.mergeGrantMinimumSeconds &&
    distanceFromMerge > config.mergeConflictClearDistance
  ) {
    return false;
  }

  return true;
}

function createMergeDestinationShape(zone, config) {
  const forward = getForwardVector(zone.destinationRotation);
  const length = config.mergeDestinationClearanceLength;
  const centreDistance =
    config.mergeDestinationClearanceOffset + length / 2;

  return createSolidVehicleShape(
    {
      width: config.mergeDestinationClearanceWidth,
      length,
    },
    {
      x: zone.point.x + forward.x * centreDistance,
      y: zone.point.y + forward.y * centreDistance,
      rotation: zone.destinationRotation,
    },
  );
}

function destinationRoadIsOccupied({
  vehicle,
  destinationShape,
  nearbyVehicles,
  collisionShapes,
  playerCollisionBox,
}) {
  if (
    playerCollisionBox &&
    solidVehiclesOverlap(
      destinationShape,
      normaliseSolidCollisionShape(playerCollisionBox),
    )
  ) {
    return true;
  }

  return nearbyVehicles.some((otherVehicle) => {
    if (otherVehicle.id === vehicle.id) {
      return false;
    }

    return solidVehiclesOverlap(
      destinationShape,
      collisionShapes.get(otherVehicle.id),
    );
  });
}

function createMergeFrameContext({
  state,
  routes,
  vehicles,
  spatialIndex,
  playerCollisionBox,
  deltaSeconds,
  config,
}) {
  const zones = getMergeZoneDefinitions(routes);
  const vehiclesById = new Map(
    vehicles.map((vehicle) => [vehicle.id, vehicle]),
  );
  const sightShapes = new Map();
  const collisionShapes = new Map();

  vehicles.forEach((vehicle) => {
    sightShapes.set(
      vehicle.id,
      getPopulationVehicleSightShape(vehicle, config),
    );
    collisionShapes.set(
      vehicle.id,
      getPopulationVehicleCollisionShape(vehicle),
    );
  });

  const intentsByZone = new Map();

  vehicles.forEach((vehicle) => {
    const intent = getVehicleMergeIntent(vehicle, config);

    if (!intent) {
      return;
    }

    const intents = intentsByZone.get(intent.mergeId) ?? [];
    intents.push(intent);
    intentsByZone.set(intent.mergeId, intents);
  });

  const decisions = new Map();
  const controllerIds = new Set([
    ...zones.keys(),
    ...intentsByZone.keys(),
    ...Object.keys(state.mergeControllers),
  ]);

  controllerIds.forEach((mergeId) => {
    const zone = zones.get(mergeId);

    if (!zone) {
      delete state.mergeControllers[mergeId];
      return;
    }

    const intents = intentsByZone.get(mergeId) ?? [];
    const controller = state.mergeControllers[mergeId] ?? {
      activeVehicleId: null,
      activeGroup: null,
      lastServedGroup: null,
      activeSeconds: 0,
      idleSeconds: 0,
    };

    controller.activeSeconds += deltaSeconds;
    controller.idleSeconds += deltaSeconds;

    if (
      !activeMergeGrantStillValid(
        controller,
        vehiclesById,
        config,
      )
    ) {
      if (controller.activeGroup) {
        controller.lastServedGroup = controller.activeGroup;
      }

      controller.activeVehicleId = null;
      controller.activeGroup = null;
      controller.activeSeconds = 0;
      controller.role = null;
    }

    if (
      intents.length === 0 &&
      controller.role !== "merge"
    ) {
      controller.activeVehicleId = null;
      controller.activeGroup = null;
      controller.activeSeconds = 0;
      controller.role = null;
    }

    const activeVehicle = controller.activeVehicleId
      ? vehiclesById.get(controller.activeVehicleId) ?? null
      : null;
    const activeMergeVehicle =
      controller.role === "merge" ? activeVehicle : null;

    if (intents.length === 0 && !activeMergeVehicle) {
      state.mergeControllers[mergeId] = controller;
      return;
    }

    controller.idleSeconds = 0;

    const conflictShape = createMergeConflictShape(zone, config);
    const destinationShape = createMergeDestinationShape(
      zone,
      config,
    );
    const conflictBounds = getSolidVehicleBounds(conflictShape);
    const destinationBounds = getSolidVehicleBounds(
      destinationShape,
    );
    const searchRadius = Math.max(
      conflictBounds.width,
      conflictBounds.height,
      destinationBounds.width,
      destinationBounds.height,
    );
    const nearbyVehicles = getNearbyTrafficVehicles(
      spatialIndex,
      zone.point.x,
      zone.point.y,
      searchRadius + config.collisionSearchDistance,
    );

    // The spatial index also contains external solid vehicles such as an
    // active tow truck. Build their shapes lazily before the merge logic
    // reads them; otherwise the first tow truck near a merge zone supplies
    // an undefined shape and aborts the complete population update.
    nearbyVehicles.forEach((vehicle) => {
      if (!collisionShapes.has(vehicle.id)) {
        collisionShapes.set(
          vehicle.id,
          getPopulationVehicleCollisionShape(vehicle),
        );
      }

      if (!sightShapes.has(vehicle.id)) {
        sightShapes.set(
          vehicle.id,
          getPopulationVehicleSightShape(vehicle, config),
        );
      }
    });

    const participants = [];
    const mergeVehicleIds = new Set();

    intents.forEach((intent) => {
      mergeVehicleIds.add(intent.vehicleId);
      participants.push({
        vehicle: intent.vehicle,
        role: "merge",
        group: intent.approachKey,
        intent,
        capacityBlocked: destinationRoadIsOccupied({
          vehicle: intent.vehicle,
          destinationShape,
          nearbyVehicles,
          collisionShapes,
          playerCollisionBox,
        }),
      });
    });

    if (
      activeMergeVehicle &&
      !mergeVehicleIds.has(activeMergeVehicle.id)
    ) {
      mergeVehicleIds.add(activeMergeVehicle.id);
      participants.push({
        vehicle: activeMergeVehicle,
        role: "merge",
        group: controller.activeGroup,
        intent: null,
        capacityBlocked: false,
      });
    }

    const mergeVisibilitySources = participants.filter(
      (participant) => participant.role === "merge",
    );

    nearbyVehicles.forEach((vehicle) => {
      if (mergeVehicleIds.has(vehicle.id)) {
        return;
      }

      const vehicleShape = collisionShapes.get(vehicle.id);
      const vehicleSight = sightShapes.get(vehicle.id);
      const seenByMerger = mergeVisibilitySources.some(
        (participant) => {
          const mergerSight = participant.intent?.sightShape ??
            conflictShape;

          return solidVehiclesOverlap(
            mergerSight,
            vehicleShape,
          );
        },
      );
      const seesMerger = mergeVisibilitySources.some(
        (participant) => {
          const mergerShape = collisionShapes.get(
            participant.vehicle.id,
          );

          return solidVehiclesOverlap(
            vehicleSight,
            mergerShape,
          );
        },
      );
      const pathConflicts = vehiclePathApproachesPoint(
        vehicle,
        zone.point,
        config.mergeConflictPathTolerance,
      );

      if (!(pathConflicts && (seenByMerger || seesMerger))) {
        return;
      }

      const target =
        vehicle.route?.points?.[vehicle.pointIndex] ?? null;
      const travelRotation = target
        ? getRotationTowards(vehicle, target)
        : vehicle.rotation;

      participants.push({
        vehicle,
        role: "through",
        group: `through:${getCardinalDirection(travelRotation)}`,
        intent: null,
        capacityBlocked: false,
      });
    });

    const groups = new Map();

    participants.forEach((participant) => {
      if (participant.capacityBlocked) {
        return;
      }

      const groupParticipants =
        groups.get(participant.group) ?? [];
      groupParticipants.push(participant);
      groups.set(participant.group, groupParticipants);
    });

    if (!controller.activeVehicleId) {
      const selectedGroup = chooseAlternatingGroup(
        groups,
        controller.lastServedGroup,
      );
      const selectedParticipant = selectedGroup
        ? pickFrontParticipant(
            groups.get(selectedGroup) ?? [],
            zone.point,
          )
        : null;

      if (selectedParticipant) {
        controller.activeVehicleId =
          selectedParticipant.vehicle.id;
        controller.activeGroup = selectedGroup;
        controller.activeSeconds = 0;
        controller.role = selectedParticipant.role;
        controller.routeId =
          selectedParticipant.vehicle.routeId;
        controller.pointIndex =
          selectedParticipant.intent?.pointIndex ??
          selectedParticipant.vehicle.pointIndex;
        controller.releaseAfterPoints =
          selectedParticipant.intent?.releaseAfterPoints ?? 0;
        controller.mergePoint = {
          x: zone.point.x,
          y: zone.point.y,
        };
      }
    }

    state.mergeControllers[mergeId] = controller;

    participants.forEach((participant) => {
      const granted =
        !participant.capacityBlocked &&
        controller.activeVehicleId === participant.vehicle.id;

      decisions.set(participant.vehicle.id, {
        mergeId,
        role: participant.role,
        granted,
        blocked: !granted,
        reason: participant.capacityBlocked
          ? "destination-crowded"
          : granted
            ? null
            : "zipper-wait",
        distanceToStop:
          participant.role === "merge"
            ? participant.intent?.distanceToStop ?? 0
            : getParticipantDistance(
                participant.vehicle,
                zone.point,
              ),
        mergePoint: zone.point,
      });
    });
  });

  return {
    decisions,
    sightShapes,
  };
}

function getMergeLimitedSpeed(
  vehicle,
  mergeDecision,
  config,
) {
  if (!mergeDecision || !mergeDecision.blocked) {
    return vehicle.cruiseSpeed;
  }

  const stopBuffer = mergeDecision.role === "merge"
    ? config.mergeStopBuffer
    : config.mergeThroughStopBuffer;
  const stoppingDistance = Math.max(
    0,
    mergeDecision.distanceToStop - stopBuffer,
  );

  if (stoppingDistance <= 0) {
    return 0;
  }

  const safeStoppingSpeed = Math.sqrt(
    2 * config.braking * stoppingDistance,
  );

  return Math.min(
    vehicle.cruiseSpeed,
    safeStoppingSpeed,
  );
}

function isYieldBlocked(
  vehicle,
  zoneVehicles,
  target,
  config,
) {
  if (
    target?.control !== "yield" ||
    !target.yieldZoneId
  ) {
    return false;
  }

  if (
    distanceBetween(vehicle, target) >
    config.yieldApproachDistance
  ) {
    return false;
  }

  return zoneVehicles.some((other) => {
    return other.id !== vehicle.id;
  });
}

const AI_FRONT_BOUNCE_REVERSE_SPEED = GRID_SIZE * 1.35;
const AI_FRONT_BOUNCE_SECONDS = 1.25;
const AI_FRONT_BOUNCE_DISTANCE = GRID_SIZE * 0.5;

function beginAiFrontCollisionBounce(vehicle) {
  if (
    !vehicle ||
    vehicle.beingTowed ||
    vehicle.collisionResolution
  ) {
    return;
  }

  vehicle.collisionResolution = {
    remainingSeconds: AI_FRONT_BOUNCE_SECONDS,
    reverseDistance: 0,
  };
}

function reverseCollisionPositionIsClear({
  vehicle,
  proposedPosition,
  vehicles,
  playerCollisionBox,
  canOccupyWorld,
  config,
}) {
  const proposedShape = getPopulationVehicleCollisionShape(
    vehicle,
    proposedPosition,
  );

  if (!canOccupyWorld(proposedShape)) {
    return false;
  }

  const currentShape = getPopulationVehicleCollisionShape(vehicle);
  const playerShape = playerCollisionBox
    ? normaliseSolidCollisionShape(playerCollisionBox)
    : null;

  const blocksSeparatingMovement = (otherShape) => {
    if (!solidVehiclesOverlap(proposedShape, otherShape)) {
      return false;
    }

    if (!solidVehiclesOverlap(currentShape, otherShape)) {
      return true;
    }

    const currentDistance = Math.hypot(
      currentShape.x - otherShape.x,
      currentShape.y - otherShape.y,
    );
    const proposedDistance = Math.hypot(
      proposedShape.x - otherShape.x,
      proposedShape.y - otherShape.y,
    );

    return proposedDistance <= currentDistance + 0.01;
  };

  if (playerShape && blocksSeparatingMovement(playerShape)) {
    return false;
  }

  return !vehicles.some((otherVehicle) => {
    if (
      otherVehicle.id === vehicle.id ||
      otherVehicle.beingTowed
    ) {
      return false;
    }

    return blocksSeparatingMovement(
      getPopulationVehicleCollisionShape(
        otherVehicle,
        otherVehicle,
        config.collisionPadding,
      ),
    );
  });
}

function updateAiCollisionResolution({
  vehicle,
  vehicles,
  deltaSeconds,
  playerCollisionBox,
  canOccupyWorld,
  config,
}) {
  const activeBounce = vehicle.collisionResolution;

  if (!activeBounce) {
    return false;
  }

  activeBounce.remainingSeconds = Math.max(
    0,
    activeBounce.remainingSeconds - deltaSeconds,
  );

  if (
    activeBounce.remainingSeconds <= 0 ||
    activeBounce.reverseDistance >= AI_FRONT_BOUNCE_DISTANCE
  ) {
    vehicle.collisionResolution = null;
    vehicle.collisionRetryDelaySeconds = 2;
    vehicle.speed = 0;
    vehicle.blocked = true;
    vehicle.hardBlockedSeconds = 0;
    vehicle.blockingVehicleId = null;
    return true;
  }

  const forward = getForwardVector(vehicle.rotation);
  const reverseDistance = Math.min(
    AI_FRONT_BOUNCE_REVERSE_SPEED * deltaSeconds,
    AI_FRONT_BOUNCE_DISTANCE - activeBounce.reverseDistance,
  );
  const proposedPosition = {
    x: vehicle.x - forward.x * reverseDistance,
    y: vehicle.y - forward.y * reverseDistance,
    rotation: vehicle.rotation,
  };

  if (
    reverseCollisionPositionIsClear({
      vehicle,
      proposedPosition,
      vehicles,
      playerCollisionBox,
      canOccupyWorld,
      config,
    })
  ) {
    vehicle.x = proposedPosition.x;
    vehicle.y = proposedPosition.y;
    vehicle.previousX = vehicle.x;
    vehicle.previousY = vehicle.y;
    vehicle.lastSafeX = vehicle.x;
    vehicle.lastSafeY = vehicle.y;
    vehicle.lastSafeRotation = vehicle.rotation;
    activeBounce.reverseDistance += reverseDistance;
  }

  vehicle.speed = 0;
  vehicle.blocked = true;
  vehicle.waitingForLeader = false;
  vehicle.blockedByPlayer = false;
  vehicle.hardBlockedSeconds = 0;
  return true;
}

function collidesWithPopulationOrPlayer({
  vehicle,
  proposedBox,
  nearbyVehicles,
  playerCollisionBox,
  config,
}) {
  const currentBox = getPopulationVehicleCollisionShape(vehicle);

  function continuesExistingOverlap(otherShape) {
    if (!solidVehiclesOverlap(proposedBox, otherShape)) {
      return false;
    }

    if (!solidVehiclesOverlap(currentBox, otherShape)) {
      return true;
    }

    const currentCentreDistance = Math.hypot(
      currentBox.x - otherShape.x,
      currentBox.y - otherShape.y,
    );
    const proposedCentreDistance = Math.hypot(
      proposedBox.x - otherShape.x,
      proposedBox.y - otherShape.y,
    );

    // If a previous frame left two vehicles intersecting, permit only motion
    // that separates their centres. This lets the leading vehicle pull clear
    // while the following vehicle remains blocked from pushing farther in.
    return proposedCentreDistance <= currentCentreDistance + 0.01;
  }

  const playerShape = playerCollisionBox
    ? normaliseSolidCollisionShape(playerCollisionBox)
    : null;

  if (
    playerShape &&
    continuesExistingOverlap(playerShape)
  ) {
    return true;
  }

  return nearbyVehicles.some((otherVehicle) => {
    if (otherVehicle.id === vehicle.id) {
      return false;
    }

    return continuesExistingOverlap(
      getPopulationVehicleCollisionShape(
        otherVehicle,
        otherVehicle,
        config.collisionPadding,
      ),
    );
  });
}

function currentVehicleOverlapsTowCorridor({
  vehicle,
  reservationOwner,
  towReservedTileOwners,
}) {
  const currentShape = getPopulationVehicleCollisionShape(
    vehicle,
    vehicle,
  );
  const bounds = getSolidVehicleBounds(currentShape);
  const minimumColumn = clamp(
    Math.floor(bounds.x / GRID_SIZE),
    0,
    Math.ceil(WORLD_WIDTH / GRID_SIZE) - 1,
  );
  const maximumColumn = clamp(
    Math.floor((bounds.x + bounds.width) / GRID_SIZE),
    0,
    Math.ceil(WORLD_WIDTH / GRID_SIZE) - 1,
  );
  const minimumRow = clamp(
    Math.floor(bounds.y / GRID_SIZE),
    Math.floor(WORLD_MIN_Y / GRID_SIZE),
    Math.ceil(WORLD_HEIGHT / GRID_SIZE) - 1,
  );
  const maximumRow = clamp(
    Math.floor((bounds.y + bounds.height) / GRID_SIZE),
    Math.floor(WORLD_MIN_Y / GRID_SIZE),
    Math.ceil(WORLD_HEIGHT / GRID_SIZE) - 1,
  );

  for (let row = minimumRow; row <= maximumRow; row += 1) {
    for (
      let column = minimumColumn;
      column <= maximumColumn;
      column += 1
    ) {
      if (
        towReservedTileOwners.get(`${column}:${row}`) !==
        reservationOwner
      ) {
        continue;
      }

      const tileShape = createSolidVehicleShape(
        { width: GRID_SIZE, length: GRID_SIZE },
        {
          x: (column + 0.5) * GRID_SIZE,
          y: (row + 0.5) * GRID_SIZE,
          rotation: 0,
        },
      );

      if (solidVehiclesOverlap(currentShape, tileShape)) {
        return true;
      }
    }
  }

  return false;
}

function positionOverlapsTowReservation({
  vehicle,
  position,
  towReservedTileOwners,
  towReservedCorridorAllowedVehicleIds,
}) {
  if (
    !(towReservedTileOwners instanceof Map) ||
    towReservedTileOwners.size === 0
  ) {
    return false;
  }

  const proposedShape = getPopulationVehicleCollisionShape(
    vehicle,
    position,
  );
  const bounds = getSolidVehicleBounds(proposedShape);
  const minimumColumn = clamp(
    Math.floor(bounds.x / GRID_SIZE),
    0,
    Math.ceil(WORLD_WIDTH / GRID_SIZE) - 1,
  );
  const maximumColumn = clamp(
    Math.floor((bounds.x + bounds.width) / GRID_SIZE),
    0,
    Math.ceil(WORLD_WIDTH / GRID_SIZE) - 1,
  );
  const minimumRow = clamp(
    Math.floor(bounds.y / GRID_SIZE),
    Math.floor(WORLD_MIN_Y / GRID_SIZE),
    Math.ceil(WORLD_HEIGHT / GRID_SIZE) - 1,
  );
  const maximumRow = clamp(
    Math.floor((bounds.y + bounds.height) / GRID_SIZE),
    Math.floor(WORLD_MIN_Y / GRID_SIZE),
    Math.ceil(WORLD_HEIGHT / GRID_SIZE) - 1,
  );

  for (let row = minimumRow; row <= maximumRow; row += 1) {
    for (
      let column = minimumColumn;
      column <= maximumColumn;
      column += 1
    ) {
      const reservationOwner = towReservedTileOwners.get(
        `${column}:${row}`,
      );

      if (!reservationOwner) {
        continue;
      }

      const reservedTileShape = createSolidVehicleShape(
        { width: GRID_SIZE, length: GRID_SIZE },
        {
          x: (column + 0.5) * GRID_SIZE,
          y: (row + 0.5) * GRID_SIZE,
          rotation: 0,
        },
      );

      if (!solidVehiclesOverlap(proposedShape, reservedTileShape)) {
        continue;
      }

      const allowedVehicleIds =
        towReservedCorridorAllowedVehicleIds?.get(
          reservationOwner,
        );
      const isCorridorIncumbent = Boolean(
        allowedVehicleIds?.has(vehicle.id),
      );

      if (isCorridorIncumbent) {
        const stillInsideReservedCorridor =
          currentVehicleOverlapsTowCorridor({
            vehicle,
            reservationOwner,
            towReservedTileOwners,
          });

        if (stillInsideReservedCorridor) {
          return false;
        }

        allowedVehicleIds.delete(vehicle.id);
      }

      return true;
    }
  }

  return false;
}


const PRIVATE_CITIZEN_MERGE_SAFETY_PADDING =
  GRID_SIZE * 0.22;

function createPrivateCitizenMergeSafetyShape(column, row) {
  return createSolidVehicleShape(
    {
      width:
        GRID_SIZE +
        PRIVATE_CITIZEN_MERGE_SAFETY_PADDING * 2,
      length:
        GRID_SIZE +
        PRIVATE_CITIZEN_MERGE_SAFETY_PADDING * 2,
    },
    {
      x: (column + 0.5) * GRID_SIZE,
      y: (row + 0.5) * GRID_SIZE,
      rotation: 0,
    },
  );
}

function positionOverlapsPrivateMergeReservation({
  vehicle,
  position,
  reservedTileOwners,
  config,
}) {
  if (
    !(reservedTileOwners instanceof Map) ||
    reservedTileOwners.size === 0
  ) {
    return false;
  }

  const proposedVehicleShape = getPopulationVehicleCollisionShape(
    vehicle,
    position,
    config.collisionPadding,
  );
  const bounds = getSolidVehicleBounds(proposedVehicleShape);
  const paddingInTiles = Math.ceil(
    PRIVATE_CITIZEN_MERGE_SAFETY_PADDING / GRID_SIZE,
  );
  const minimumColumn = clamp(
    Math.floor(bounds.x / GRID_SIZE) - paddingInTiles,
    0,
    Math.ceil(WORLD_WIDTH / GRID_SIZE) - 1,
  );
  const maximumColumn = clamp(
    Math.floor((bounds.x + bounds.width) / GRID_SIZE) +
      paddingInTiles,
    0,
    Math.ceil(WORLD_WIDTH / GRID_SIZE) - 1,
  );
  const minimumRow = clamp(
    Math.floor(bounds.y / GRID_SIZE) - paddingInTiles,
    Math.floor(WORLD_MIN_Y / GRID_SIZE),
    Math.ceil(WORLD_HEIGHT / GRID_SIZE) - 1,
  );
  const maximumRow = clamp(
    Math.floor((bounds.y + bounds.height) / GRID_SIZE) +
      paddingInTiles,
    Math.floor(WORLD_MIN_Y / GRID_SIZE),
    Math.ceil(WORLD_HEIGHT / GRID_SIZE) - 1,
  );

  for (let row = minimumRow; row <= maximumRow; row += 1) {
    for (
      let column = minimumColumn;
      column <= maximumColumn;
      column += 1
    ) {
      const reservationOwner = reservedTileOwners.get(
        `${column}:${row}`,
      );

      if (!reservationOwner) {
        continue;
      }

      const proposedPositionOverlapsReservedTile =
        solidVehiclesOverlap(
          proposedVehicleShape,
          createPrivateCitizenMergeSafetyShape(
            column,
            row,
          ),
        );

      if (
        shouldBlockVehicleForPrivateCitizenMergeReservation({
          vehicleId: vehicle.id,
          reservationOwner,
          proposedPositionOverlapsReservedTile,
        })
      ) {
        return true;
      }
    }
  }

  return false;
}

function isPrivateMergeTileOccupied({
  vehicle,
  column,
  row,
  spatialIndex,
  playerCollisionBox,
  config,
}) {
  const tileShape =
    createPrivateCitizenMergeSafetyShape(column, row);

  const playerShape = playerCollisionBox
    ? normaliseSolidCollisionShape(playerCollisionBox)
    : null;

  if (
    playerShape &&
    solidVehiclesOverlap(tileShape, playerShape)
  ) {
    return true;
  }

  const nearbyVehicles = getNearbyTrafficVehicles(
    spatialIndex,
    (column + 0.5) * GRID_SIZE,
    (row + 0.5) * GRID_SIZE,
    GRID_SIZE * 2,
  );

  return nearbyVehicles.some((otherVehicle) => {
    if (
      otherVehicle.id === vehicle.id ||
      otherVehicle.beingTowed
    ) {
      return false;
    }

    return solidVehiclesOverlap(
      tileShape,
      getPopulationVehicleCollisionShape(
        otherVehicle,
        otherVehicle,
        config.collisionPadding,
      ),
    );
  });
}

function updatePopulationVehicle({
  vehicle,
  vehicles,
  spatialIndex,
  activeZoneIndex,
  aiTowRequestVehicleIds,
  deltaSeconds,
  player,
  playerCollisionBox,
  canOccupyWorld,
  trafficLights,
  trafficLightState,
  trafficLightConfig,
  highwayLights,
  highwayLightState,
  highwayLightConfig,
  mergeFrameContext,
  busStops,
  towReservedTileOwners,
  towReservedCorridorAllowedVehicleIds,
  privateCitizenMergeReservedTileOwners,
  gameMinutesElapsed,
  config,
}) {
  if (vehicle.beingTowed || vehicle.towAssigned) {
    vehicle.speed = 0;
    vehicle.blocked = false;
    return false;
  }

  if (
    !Number.isFinite(vehicle.x) ||
    !Number.isFinite(vehicle.y) ||
    !Number.isFinite(vehicle.rotation)
  ) {
    const fallbackPoint =
      vehicle.route.points[Math.max(0, vehicle.pointIndex - 1)] ??
      vehicle.route.points[0];
    const fallbackTarget =
      vehicle.route.points[vehicle.pointIndex] ??
      vehicle.route.points[1] ??
      fallbackPoint;

    vehicle.x = Number.isFinite(vehicle.lastSafeX)
      ? vehicle.lastSafeX
      : fallbackPoint.x;
    vehicle.y = Number.isFinite(vehicle.lastSafeY)
      ? vehicle.lastSafeY
      : fallbackPoint.y;
    vehicle.rotation = Number.isFinite(vehicle.lastSafeRotation)
      ? vehicle.lastSafeRotation
      : getRotationTowards(fallbackPoint, fallbackTarget);
    vehicle.speed = 0;
    vehicle.blocked = true;
    return false;
  }

  if (!Number.isFinite(vehicle.speed)) {
    vehicle.speed = 0;
  }

  vehicle.waitingForTowReservation = false;
  vehicle.waitingForPrivateCitizenMergeReservation = false;
  vehicle.waitingForPrivateCitizenMerge = false;

  if ((vehicle.collisionRetryDelaySeconds || 0) > 0) {
    vehicle.collisionRetryDelaySeconds = Math.max(0, vehicle.collisionRetryDelaySeconds - deltaSeconds);
    vehicle.speed = 0;
    vehicle.blocked = true;
    vehicle.waitingForLeader = false;
    vehicle.blockedByPlayer = false;
    if (vehicle.collisionRetryDelaySeconds > 0) return false;
    vehicle.blocked = false;
    vehicle.blockingVehicleId = null;
    vehicle.blockerContactLatched = false;
  }

  if (
    updateAiCollisionResolution({
      vehicle,
      vehicles,
      deltaSeconds,
      playerCollisionBox,
      canOccupyWorld,
      config,
    })
  ) {
    return false;
  }

  if (vehicle.terminalLayoverRemainingMinutes > 0) {
    vehicle.terminalLayoverRemainingMinutes = Math.max(
      0,
      vehicle.terminalLayoverRemainingMinutes - gameMinutesElapsed,
    );
    vehicle.waitingAtTerminal =
      vehicle.terminalLayoverRemainingMinutes > 0;
    vehicle.speed = 0;
    vehicle.blocked = false;
    return false;
  }

  vehicle.waitingAtTerminal = false;

  if (updatePrivateCitizen1StartWait(vehicle, deltaSeconds)) {
    return false;
  }

  if (updatePrivateCitizen1Dwell(vehicle, gameMinutesElapsed)) {
    return false;
  }

  const target = vehicle.route.points[vehicle.pointIndex];

  if (!target) {
    return true;
  }

  vehicle.activeZoneId = target.zoneId ?? null;

  if (
    updatePrivateCitizen1MergeReservation({
      vehicle,
      target,
      reservations:
        privateCitizenMergeReservedTileOwners,
      isReservationTileOccupied: ({ column, row }) => {
        return isPrivateMergeTileOccupied({
          vehicle,
          column,
          row,
          spatialIndex,
          playerCollisionBox,
          config,
        });
      },
    })
  ) {
    return false;
  }

  if (updateDanfoBusStop(vehicle, busStops, deltaSeconds, config)) {
    return false;
  }

  const desiredRotation = getRotationTowards(
    vehicle,
    target,
  );

  const rotationDifference = Math.abs(
    Math.atan2(
      Math.sin(desiredRotation - vehicle.rotation),
      Math.cos(desiredRotation - vehicle.rotation),
    ),
  );

  const boxRoadTurn =
    Boolean(target.noSmooth) &&
    rotationDifference > config.boxRoadTurnAlignment;

  const steeringSpeedFactor = boxRoadTurn
    ? 1
    : clamp(
        vehicle.speed / config.fullSteeringSpeed,
        0,
        1,
      );

  const proposedRotation = rotateTowards(
    vehicle.rotation,
    desiredRotation,
    config.maximumSteeringRadiansPerSecond *
      steeringSpeedFactor *
      deltaSeconds,
  );

  const leaderDetectionDistance =
    config.leaderDetectionDistance;
  const collisionSearchDistance =
    config.collisionSearchDistance;

  const nearbyLeaderVehicles = getNearbyTrafficVehicles(
    spatialIndex,
    vehicle.x,
    vehicle.y,
    leaderDetectionDistance + collisionSearchDistance,
  );

  const sightShape =
    mergeFrameContext?.sightShapes.get(vehicle.id) ??
    getPopulationVehicleSightShape(vehicle, config);

  const leader = findNearestLeader(
    vehicle,
    nearbyLeaderVehicles,
    player,
    sightShape,
    config,
    leaderDetectionDistance,
  );

  const leaderLimitedSpeed = getLeaderLimitedSpeed(
    vehicle,
    leader,
    config,
  );
  const turnLimitedSpeed = getTurnLimitedSpeed(
    vehicle,
    config,
  );

  const yieldZoneVehicles = target?.yieldZoneId
    ? activeZoneIndex.get(target.yieldZoneId) ?? []
    : [];

  const yieldBlocked = isYieldBlocked(
    vehicle,
    yieldZoneVehicles,
    target,
    config,
  );
  const normalTrafficLightControl = getTrafficLightControl({
    vehicle,
    nearbyVehicles: nearbyLeaderVehicles,
    playerCollisionBox,
    trafficLights,
    trafficLightState,
    trafficLightConfig,
    config,
  });
  const highwayTrafficLightControl = getHighwayLightControl({
    vehicle,
    nearbyVehicles: nearbyLeaderVehicles,
    playerCollisionBox,
    highwayLights,
    highwayLightState,
    highwayLightConfig,
    config,
  });
  const trafficLightControl =
    !normalTrafficLightControl
      ? highwayTrafficLightControl
      : !highwayTrafficLightControl
        ? normalTrafficLightControl
        : normalTrafficLightControl.distanceToStop <= highwayTrafficLightControl.distanceToStop
          ? normalTrafficLightControl
          : highwayTrafficLightControl;

  const trafficLightLimitedSpeed = getTrafficLightLimitedSpeed(
    vehicle, trafficLightControl, config,
  );

  const mergeDecision =
    mergeFrameContext?.decisions.get(vehicle.id) ?? null;

  const mergeLimitedSpeed = getMergeLimitedSpeed(
    vehicle,
    mergeDecision,
    config,
  );

  const surfaceSpeedMultiplier = config.surfaceSpeedMultiplier?.(vehicle) ?? 1;
  const calculatedRequestedSpeed =
    yieldBlocked
      ? 0
      : Math.min(
          vehicle.cruiseSpeed,
          leaderLimitedSpeed,
          turnLimitedSpeed,
          trafficLightLimitedSpeed,
          mergeLimitedSpeed,
        );
  const requestedSpeed = Number.isFinite(calculatedRequestedSpeed)
    ? Math.max(0, calculatedRequestedSpeed * surfaceSpeedMultiplier)
    : 0;

  const braking = requestedSpeed < vehicle.speed;

  vehicle.speed = moveTowards(
    vehicle.speed,
    requestedSpeed,
    (
      braking
        ? config.braking
        : vehicle.acceleration ?? config.acceleration
    ) *
      deltaSeconds,
  );

  vehicle.waitingForLeader = Boolean(
    leader && leaderLimitedSpeed < vehicle.cruiseSpeed,
  );
  vehicle.blockedByPlayer = Boolean(
    vehicle.waitingForLeader && leader?.object?.isPlayer,
  );
  vehicle.blockingVehicleId =
    vehicle.waitingForLeader && !leader?.object?.isPlayer
      ? leader?.object?.id ?? null
      : null;

  vehicle.waitingAtYield = yieldBlocked;
  vehicle.waitingAtMerge = Boolean(
    mergeDecision?.role === "merge" &&
    mergeDecision.blocked,
  );
  vehicle.waitingForMergeIntent = Boolean(
    mergeDecision?.role === "through" &&
    mergeDecision.blocked,
  );
  vehicle.mergeSignalActive = Boolean(
    mergeDecision?.role === "merge",
  );
  vehicle.mergeGranted = Boolean(
    mergeDecision?.granted,
  );
  vehicle.mergeId = mergeDecision?.mergeId ?? null;
  vehicle.mergeRole = mergeDecision?.role ?? null;
  vehicle.waitingAtTrafficLight = Boolean(
    trafficLightControl &&
    trafficLightLimitedSpeed < vehicle.cruiseSpeed,
  );
  vehicle.trafficLightId =
    trafficLightControl?.lightId ?? null;
  vehicle.trafficLightSignal =
    trafficLightControl?.signal ?? null;
  vehicle.blocked =
    vehicle.waitingForLeader ||
    vehicle.waitingAtYield ||
    vehicle.waitingAtMerge ||
    vehicle.waitingForMergeIntent ||
    vehicle.waitingAtTrafficLight;

  const differenceX = target.x - vehicle.x;
  const differenceY = target.y - vehicle.y;
  const distanceToTarget = Math.hypot(
    differenceX,
    differenceY,
  );

  if (!Number.isFinite(distanceToTarget)) {
    vehicle.speed = 0;
    vehicle.blocked = true;
    return false;
  }

  if (distanceToTarget <= 0.5) {
    if (mergeDecision?.blocked) {
      vehicle.speed = 0;
      vehicle.blocked = true;

      if (mergeDecision.role === "merge") {
        vehicle.waitingAtMerge = true;
      } else {
        vehicle.waitingForMergeIntent = true;
      }

      return false;
    }

    vehicle.x = target.x;
    vehicle.y = target.y;
    vehicle.lastSafeX = vehicle.x;
    vehicle.lastSafeY = vehicle.y;
    vehicle.lastSafeRotation = vehicle.rotation;
    releasePrivateCitizen1MergeReservation(
      vehicle,
      privateCitizenMergeReservedTileOwners,
        );
    if (beginPrivateCitizen1WaypointDwell(vehicle)) {
      return false;
    }
    return advancePopulationRoute(vehicle);
  }

  const movementDistance = Math.min(
    vehicle.speed * deltaSeconds,
    distanceToTarget,
  );

  if (!Number.isFinite(movementDistance)) {
    vehicle.speed = 0;
    vehicle.blocked = true;
    return false;
  }

  if (movementDistance <= 0.001) {
    vehicle.hardBlockedSeconds = 0;
    return false;
  }

  const movementStepCount = Math.max(
    1,
    Math.ceil(movementDistance / (GRID_SIZE * 0.2)),
  );
  const movementStartX = vehicle.x;
  const movementStartY = vehicle.y;
  const movementStartRotation = vehicle.rotation;
  const movementRotationDifference = Math.atan2(
    Math.sin(proposedRotation - movementStartRotation),
    Math.cos(proposedRotation - movementStartRotation),
  );

  for (
    let movementStep = 1;
    movementStep <= movementStepCount;
    movementStep += 1
  ) {
    const stepProgress = movementStep / movementStepCount;
    const stepDistance = movementDistance * stepProgress;
    const movementRatio =
      distanceToTarget > 0
        ? stepDistance / distanceToTarget
        : 1;

    const proposedPosition = {
      x: movementStartX + differenceX * movementRatio,
      y: movementStartY + differenceY * movementRatio,
      rotation:
        movementStartRotation +
        movementRotationDifference * stepProgress,
    };

    if (
      !Number.isFinite(proposedPosition.x) ||
      !Number.isFinite(proposedPosition.y) ||
      !Number.isFinite(proposedPosition.rotation)
    ) {
      vehicle.speed = 0;
      vehicle.blocked = true;
      return false;
    }

    const proposedBox = getPopulationVehicleCollisionShape(
      vehicle,
      proposedPosition,
    );

    const overlapsTowReservation =
      positionOverlapsTowReservation({
        vehicle,
        position: proposedPosition,
        towReservedTileOwners,
        towReservedCorridorAllowedVehicleIds,
      });
    const overlapsPrivateMergeReservation =
      positionOverlapsPrivateMergeReservation({
        vehicle,
        position: proposedPosition,
        reservedTileOwners:
          privateCitizenMergeReservedTileOwners,
        config,
      });

    if (
      overlapsTowReservation ||
      overlapsPrivateMergeReservation
    ) {
      vehicle.speed = overlapsPrivateMergeReservation
        ? 0
        : moveTowards(
            vehicle.speed,
            0,
            config.emergencyBraking * deltaSeconds,
          );
      vehicle.waitingForTowReservation =
        overlapsTowReservation;
      vehicle.waitingForPrivateCitizenMergeReservation =
        overlapsPrivateMergeReservation;
      vehicle.blocked = true;
      vehicle.hardBlockedSeconds = 0;
      vehicle.blockingVehicleId = null;
      return false;
    }

    const nearbyCollisionVehicles =
      getNearbyTrafficVehicles(
        spatialIndex,
        proposedPosition.x,
        proposedPosition.y,
        collisionSearchDistance,
      );
    const blockedByHardCollision =
      !canOccupyWorld(proposedBox) ||
      collidesWithPopulationOrPlayer({
        vehicle,
        proposedBox,
        nearbyVehicles: nearbyCollisionVehicles,
        playerCollisionBox,
        config,
      });

    if (blockedByHardCollision) {
      beginAiFrontCollisionBounce(vehicle);

      if (!vehicle.blockingVehicleId) {
        const nearestCollisionVehicle =
          nearbyCollisionVehicles
            .filter((otherVehicle) => {
              return (
                otherVehicle.id !== vehicle.id &&
                solidVehiclesOverlap(
                  proposedBox,
                  getPopulationVehicleCollisionShape(
                    otherVehicle,
                    otherVehicle,
                    config.collisionPadding,
                  ),
                )
              );
            })
            .sort((first, second) => {
              return (
                Math.hypot(
                  first.x - proposedPosition.x,
                  first.y - proposedPosition.y,
                ) -
                Math.hypot(
                  second.x - proposedPosition.x,
                  second.y - proposedPosition.y,
                )
              );
            })[0] ?? null;
        vehicle.blockingVehicleId =
          nearestCollisionVehicle?.id ?? null;

      }
      vehicle.speed = moveTowards(
        vehicle.speed,
        0,
        config.emergencyBraking * deltaSeconds,
      );

      vehicle.blocked = true;
      vehicle.hardBlockedSeconds += deltaSeconds;
      return false;
    }

    vehicle.x = proposedPosition.x;
    vehicle.y = proposedPosition.y;
    vehicle.rotation = proposedPosition.rotation;
    vehicle.lastSafeX = vehicle.x;
    vehicle.lastSafeY = vehicle.y;
    vehicle.lastSafeRotation = vehicle.rotation;
  }

  vehicle.hardBlockedSeconds = 0;
  vehicle.blockerContactLatched = false;

  if (movementDistance + 0.01 < distanceToTarget) {
    return false;
  }

  vehicle.x = target.x;
  vehicle.y = target.y;
  vehicle.lastSafeX = vehicle.x;
  vehicle.lastSafeY = vehicle.y;
  vehicle.lastSafeRotation = vehicle.rotation;

  releasePrivateCitizen1MergeReservation(
    vehicle,
    privateCitizenMergeReservedTileOwners,
  );

  if (beginPrivateCitizen1WaypointDwell(vehicle)) {
    return false;
  }

  return advancePopulationRoute(vehicle);
}

function randomInteger(minimum, maximum) {
  return Math.floor(
    randomBetween(minimum, maximum + 1),
  );
}

function resolveTrafficProfile({
  minuteOfDay,
  trafficPeriod,
  config,
}) {
  if (Number.isFinite(minuteOfDay)) {
    return getPopulationTrafficProfile(
      minuteOfDay,
      config,
    );
  }

  if (Number.isFinite(trafficPeriod?.minuteOfDay)) {
    return getPopulationTrafficProfile(
      trafficPeriod.minuteOfDay,
      config,
    );
  }

  const fallbackProfiles = {
    "morning-rush": {
      id: "morning-rush",
      targetVehicleCount: config.morningRushVehicleCount,
    },
    "evening-rush": {
      id: "evening-rush",
      targetVehicleCount: config.eveningRushVehicleCount,
    },
    overnight: {
      id: "overnight",
      targetVehicleCount: config.overnightVehicleCount,
    },
    "late-night": {
      id: "late-night",
      targetVehicleCount: config.overnightVehicleCount,
    },
  };

  return (
    fallbackProfiles[trafficPeriod?.id] ?? {
      id: "daytime",
      targetVehicleCount: config.daytimeVehicleCount,
    }
  );
}

export function seedPopulationTraffic({
  state,
  routes,
  vehicleTypes,
  minuteOfDay,
  trafficPeriod = null,
  playerCollisionBox = null,
  canOccupyWorld,
  config,
}) {
  if (state.seeded) {
    return state.vehicles.length;
  }


  const trafficProfile = resolveTrafficProfile({
    minuteOfDay,
    trafficPeriod,
    config,
  });

  ensurePrivateCitizen1Spawn({
    state,
    routes,
    createAndAddVehicle: (route) => {
      return createAndAddPrivateCitizen1Vehicle({
        state,
        route,
        vehicleTypes,
        config,
      });
    },
  });

  ensurePermanentLoopTraffic({
    state,
    routes,
    vehicleTypes,
    playerCollisionBox,
    canOccupyWorld,
    config,
  });

  const regularRoutes = getRegularPopulationRoutes(routes);
  // Startup traffic must obey the same rule as later traffic: every car
  // enters at point zero of a declared spawn route. Seed at most one vehicle
  // per edge gateway; the stream spawner adds the rest as gateways clear.
  for (const route of regularRoutes) {
    trySpawnPopulationVehicle({
      state,
      route,
      vehicleTypes,
      streamId: `initial-gateway-${route.id}`,
      playerCollisionBox,
      canOccupyWorld,
      config,
    });
  }

  state.seeded = true;
  state.currentProfileId = trafficProfile.id;
  state.spawnTimer = config.spawnIntervalSeconds;

  return state.vehicles.length;
}

function createTrafficStream({
  state,
  routes,
  trafficProfile,
  config,
  excludedRouteIds = new Set(),
}) {
  const availableRoutes = routes.filter((route) => {
    return !excludedRouteIds.has(route.id);
  });

  const route = pickRoute(
    availableRoutes.length > 0 ? availableRoutes : routes,
    trafficProfile,
  );

  if (!route) {
    return null;
  }

  const stream = {
    id: `traffic-stream-${state.nextStreamNumber}`,
    routeId: route.id,
    destinationSpawnId: route.destinationSpawnId,
    profileId: trafficProfile.id,
    remainingVehicles: randomInteger(
      config.streamMinimumVehicles,
      config.streamMaximumVehicles,
    ),
    blockedAttempts: 0,
  };

  state.nextStreamNumber += 1;
  return stream;
}

function getStreamRoute(stream, routes) {
  return routes.find((route) => {
    return route.id === stream?.routeId;
  }) ?? null;
}

function ensureTrafficStreams({
  state,
  routes,
  trafficProfile,
  config,
}) {
  state.activeStreams = state.activeStreams.filter((stream) => {
    return (
      stream.profileId === trafficProfile.id &&
      stream.remainingVehicles > 0
    );
  });

  while (
    state.activeStreams.length < config.maximumConcurrentStreams &&
    state.activeStreams.length < routes.length
  ) {
    const excludedRouteIds = new Set(
      state.activeStreams.map((stream) => stream.routeId),
    );

    const stream = createTrafficStream({
      state,
      routes,
      trafficProfile,
      config,
      excludedRouteIds,
    });

    if (!stream) {
      break;
    }

    state.activeStreams.push(stream);
  }
}

function removeTrafficStream(state, streamId) {
  state.activeStreams = state.activeStreams.filter((stream) => {
    return stream.id !== streamId;
  });

  if (state.activeStreams.length === 0) {
    state.streamCursor = 0;
    return;
  }

  state.streamCursor %= state.activeStreams.length;
}

function updateTrafficStreamSpawning({
  state,
  routes,
  vehicleTypes,
  trafficProfile,
  targetVehicleCount,
  playerCollisionBox,
  canOccupyWorld,
  config,
}) {
  if (state.vehicles.length >= targetVehicleCount) {
    state.activeStreams = [];
    state.streamCursor = 0;
    return 0;
  }

  ensureTrafficStreams({
    state,
    routes,
    trafficProfile,
    config,
  });

  let spawnedCount = 0;
  let attempts = 0;

  while (
    attempts < config.maximumSpawnAttemptsPerFrame &&
    state.activeStreams.length > 0 &&
    state.vehicles.length < targetVehicleCount
  ) {
    attempts += 1;
    state.streamCursor %= state.activeStreams.length;

    const stream = state.activeStreams[state.streamCursor];
    const route = getStreamRoute(stream, routes);

    if (!route) {
      removeTrafficStream(state, stream.id);
      continue;
    }

    const spawned = trySpawnPopulationVehicle({
      state,
      route,
      vehicleTypes,
      streamId: stream.id,
      playerCollisionBox,
      canOccupyWorld,
      config,
    });

    if (spawned) {
      spawnedCount += 1;
      stream.remainingVehicles -= 1;
      stream.blockedAttempts = 0;

      if (stream.remainingVehicles <= 0) {
        removeTrafficStream(state, stream.id);
      } else {
        state.streamCursor =
          (state.streamCursor + 1) %
          state.activeStreams.length;
      }
    } else {
      stream.blockedAttempts += 1;

      if (
        stream.blockedAttempts >=
        config.streamMaximumBlockedAttempts
      ) {
        removeTrafficStream(state, stream.id);
      } else {
        state.streamCursor =
          (state.streamCursor + 1) %
          state.activeStreams.length;
      }
    }
  }

  return spawnedCount;
}


export function updatePopulationTraffic({
  state,
  routes,
  vehicleTypes,
  minuteOfDay = null,
  trafficPeriod = null,
  deltaSeconds,
  player,
  viewPosition = null,
  externalVehicles = [],
  playerCollisionBox,
  canOccupyWorld,
  trafficLights = [],
  trafficLightState = null,
  trafficLightConfig = null,
  highwayLights = [],
  highwayLightState = null,
  highwayLightConfig = null,
  busStops = [],
  config,
}) {
  state.towReservedTileOwners ??= new Map();
  state.towReservedCorridorAllowedVehicleIds ??= new Map();
  state.privateCitizenMergeReservedTileOwners ??= new Map();

  const trafficProfile = resolveTrafficProfile({
    minuteOfDay,
    trafficPeriod,
    config,
  });

  const regularRoutes = getRegularPopulationRoutes(routes);
  const permanentLoopCount = getPermanentLoopTargetCount(routes);
  const currentTrafficMinute = Number.isFinite(minuteOfDay)
    ? normaliseMinuteOfDay(minuteOfDay)
    : null;
  const gameMinutesElapsed =
    currentTrafficMinute == null ||
    state.lastTrafficMinuteOfDay == null
      ? 0
      : Math.min(
          5,
          normaliseMinuteOfDay(
            currentTrafficMinute - state.lastTrafficMinuteOfDay,
          ),
        );

  if (currentTrafficMinute != null) {
    state.lastTrafficMinuteOfDay = currentTrafficMinute;
  }

  ensurePrivateCitizen1Spawn({
    state,
    routes,
    createAndAddVehicle: (route) => {
      return createAndAddPrivateCitizen1Vehicle({
        state,
        route,
        vehicleTypes,
        config,
      });
    },
  });

  ensurePermanentLoopTraffic({
    state,
    routes,
    vehicleTypes,
    playerCollisionBox,
    canOccupyWorld,
    config,
    deltaSeconds,
  });

  const targetVehicleCount = clamp(
    trafficProfile.targetVehicleCount + permanentLoopCount,
    0,
    config.maximumVehicleCount,
  );

  if (state.currentProfileId !== trafficProfile.id) {
    state.currentProfileId = trafficProfile.id;
    state.activeStreams = [];
    state.streamCursor = 0;
  }

  state.spawnTimer -= deltaSeconds;

  if (
    state.vehicles.length < targetVehicleCount &&
    state.spawnTimer <= 0
  ) {
    const spawnedVehicleCount = updateTrafficStreamSpawning({
      state,
      routes: regularRoutes,
      vehicleTypes,
      trafficProfile,
      targetVehicleCount,
      playerCollisionBox,
      canOccupyWorld,
      config,
    });

    state.spawnTimer = spawnedVehicleCount > 0
      ? config.spawnIntervalSeconds
      : config.spawnIntervalSeconds * 0.5;
  }

  const vehiclesToRemove = state.vehiclesToRemove;
  vehiclesToRemove.clear();

  const collisionVehicles = state.collisionVehiclesBuffer;
  collisionVehicles.length = 0;
  for (const vehicle of state.vehicles) {
    collisionVehicles.push(vehicle);
  }
  for (const vehicle of externalVehicles) {
    collisionVehicles.push(vehicle);
  }
  const spatialIndex = createTrafficSpatialIndex(
    collisionVehicles,
    config.spatialCellSize,
    state.spatialIndex,
  );
  state.spatialIndex = spatialIndex;

  // Reserve Private Citizen 1's merge tile before any vehicle moves this
  // frame. This prevents another vehicle from entering a tile that was free
  // at frame start while the private car is preparing to merge.
  for (const reservationVehicle of state.vehicles) {
    const reservationTarget =
      reservationVehicle.route?.points?.[
        reservationVehicle.pointIndex
      ];

    updatePrivateCitizen1MergeReservation({
      vehicle: reservationVehicle,
      target: reservationTarget,
      reservations:
        state.privateCitizenMergeReservedTileOwners,
      isReservationTileOccupied: ({ column, row }) => {
        return isPrivateMergeTileOccupied({
          vehicle: reservationVehicle,
          column,
          row,
          spatialIndex,
          playerCollisionBox,
          config,
        });
      },
    });
  }

  const activeZoneIndex = createActiveZoneIndex(
    state.vehicles,
  );
  const mergeFrameContext = createMergeFrameContext({
    state,
    routes,
    vehicles: state.vehicles,
    spatialIndex,
    playerCollisionBox,
    deltaSeconds,
    config,
  });

  for (const vehicle of state.vehicles) {
    vehicle.previousX = vehicle.x;
    vehicle.previousY = vehicle.y;
    vehicle.previousRotation = vehicle.rotation;
    vehicle.aiUpdateAccumulator =
      (vehicle.aiUpdateAccumulator ?? 0) + deltaSeconds;
    vehicle.aiGameMinutesAccumulator =
      (vehicle.aiGameMinutesAccumulator ?? 0) + gameMinutesElapsed;

    const playerDistance = player
      ? Math.hypot(vehicle.x - player.x, vehicle.y - player.y)
      : Number.POSITIVE_INFINITY;
    const viewDistance = viewPosition
      ? Math.hypot(
          vehicle.x - viewPosition.x,
          vehicle.y - viewPosition.y,
        )
      : Number.POSITIVE_INFINITY;
    const nearestInterestDistance = Math.min(
      playerDistance,
      viewDistance,
    );
    const updateInterval =
      nearestInterestDistance <= config.fullRateUpdateDistance
        ? 0
        : nearestInterestDistance <= config.mediumRateUpdateDistance
          ? config.mediumUpdateIntervalSeconds
          : config.distantUpdateIntervalSeconds;

    if (
      updateInterval > 0 &&
      vehicle.aiUpdateAccumulator + 0.000001 < updateInterval
    ) {
      continue;
    }

    const vehicleDeltaSeconds = Math.min(
      vehicle.aiUpdateAccumulator,
      config.maximumDeferredUpdateSeconds,
    );
    const vehicleGameMinutesElapsed =
      vehicle.aiGameMinutesAccumulator;
    vehicle.aiUpdateAccumulator = 0;
    vehicle.aiGameMinutesAccumulator = 0;
    const previousActiveZoneId = vehicle.activeZoneId;
    const shouldDespawn = updatePopulationVehicle({
      vehicle,
      vehicles: state.vehicles,
      spatialIndex,
      activeZoneIndex,
      aiTowRequestVehicleIds: state.aiTowRequestVehicleIds,
      deltaSeconds: vehicleDeltaSeconds,
      player,
      playerCollisionBox,
      canOccupyWorld,
      trafficLights,
      trafficLightState,
      trafficLightConfig,
      highwayLights,
      highwayLightState,
      highwayLightConfig,
      mergeFrameContext,
      busStops,
      towReservedTileOwners: state.towReservedTileOwners,
      towReservedCorridorAllowedVehicleIds:
        state.towReservedCorridorAllowedVehicleIds,
      privateCitizenMergeReservedTileOwners:
        state.privateCitizenMergeReservedTileOwners,
      gameMinutesElapsed: vehicleGameMinutesElapsed,
      config,
    });

    if (!shouldDespawn) {
      updateVehicleSpatialCell(spatialIndex, vehicle);
    }

    if (previousActiveZoneId !== vehicle.activeZoneId) {
      if (previousActiveZoneId) {
        const previousZoneVehicles =
          activeZoneIndex.get(previousActiveZoneId) ?? [];

        const previousVehicleIndex =
          previousZoneVehicles.findIndex((zoneVehicle) => {
            return zoneVehicle.id === vehicle.id;
          });
        if (previousVehicleIndex >= 0) {
          previousZoneVehicles.splice(previousVehicleIndex, 1);
        }

        if (previousZoneVehicles.length > 0) {
          activeZoneIndex.set(
            previousActiveZoneId,
            previousZoneVehicles,
          );
        } else {
          activeZoneIndex.delete(previousActiveZoneId);
        }
      }

      if (vehicle.activeZoneId && !shouldDespawn) {
        const nextZoneVehicles =
          activeZoneIndex.get(vehicle.activeZoneId) ?? [];

        if (!nextZoneVehicles.some((zoneVehicle) => {
          return zoneVehicle.id === vehicle.id;
        })) {
          nextZoneVehicles.push(vehicle);
          activeZoneIndex.set(
            vehicle.activeZoneId,
            nextZoneVehicles,
          );
        }
      }
    }

    const towableStall =
      !vehicle.beingTowed &&
      !vehicle.towAssigned &&
      vehicle.hardBlockedSeconds > 0 &&
      vehicle.blocked &&
      vehicle.speed <= (config.towMinimumStalledSpeed ?? 8) &&
      !vehicle.blockedByPlayer &&
      !vehicle.waitingAtTrafficLight &&
      !vehicle.waitingForTowReservation &&
      !vehicle.waitingForPrivateCitizenMerge &&
      !vehicle.waitingForPrivateCitizenMergeReservation &&
      !vehicle.waitingAtTerminal &&
      !vehicle.waitingAtPrivateCitizenStop &&
      !vehicle.waitingAtPrivateCitizenStart &&
      !vehicle.waitingAtYield &&
      !vehicle.waitingAtMerge &&
      !vehicle.waitingForMergeIntent &&
      !vehicle.waitingForLeader &&
      vehicle.busStopDwellRemaining <= 0;

    vehicle.towStallSeconds = towableStall
      ? (vehicle.towStallSeconds ?? 0) + vehicleDeltaSeconds
      : 0;


    if (shouldDespawn) {
      releasePrivateCitizen1MergeReservation(
        vehicle,
        state.privateCitizenMergeReservedTileOwners,
      );
      vehiclesToRemove.add(vehicle.id);
    }
  }

  if (vehiclesToRemove.size > 0) {
    const maximumPoolSize = 96;

    for (const vehicle of state.vehicles) {
      if (
        vehiclesToRemove.has(vehicle.id) &&
        state.vehiclePool.length < maximumPoolSize
      ) {
        state.vehiclePool.push(vehicle);
      }
    }

    state.vehicles = state.vehicles.filter((vehicle) => {
      return !vehiclesToRemove.has(vehicle.id);
    });
  }

  // The index is rebuilt once at the beginning of the next traffic tick.
  // Rebuilding it again here doubled broad-phase work for no gameplay gain;
  // a single 30 Hz tick of positional staleness is covered by collision
  // padding and the following-distance controller.

  const activeVehicleIds = state.activeVehicleIds;
  activeVehicleIds.clear();
  state.vehicles.forEach((vehicle) => {
    activeVehicleIds.add(vehicle.id);
  });

  for (
    const [reservationKey, ownerId] of
    state.privateCitizenMergeReservedTileOwners.entries()
  ) {
    if (!activeVehicleIds.has(ownerId)) {
      state.privateCitizenMergeReservedTileOwners.delete(
        reservationKey,
      );
    }
  }

  Object.entries(state.mergeControllers).forEach(
    ([mergeId, controller]) => {
      if (
        controller.activeVehicleId &&
        !activeVehicleIds.has(controller.activeVehicleId)
      ) {
        controller.activeVehicleId = null;
        controller.activeGroup = null;
        controller.activeSeconds = 0;
      }

      if (
        !controller.activeVehicleId &&
        controller.idleSeconds >
          config.mergeControllerIdleExpirySeconds
      ) {
        delete state.mergeControllers[mergeId];
      }
    },
  );
}









