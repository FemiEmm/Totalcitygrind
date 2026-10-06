import {
  GRID_COLUMNS,
  GRID_ROWS,
  GRID_SIZE,
} from "../../world/data/mapConstants.js";
import {
  createSolidVehicleShape,
  solidVehiclesOverlap,
} from "../../world/systems/worldCollision.js";
function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function tileKey(column, row) {
  return `${column}:${row}`;
}

function getVehicleTile(vehicle) {
  return {
    column: clamp(
      Math.floor(vehicle.x / GRID_SIZE),
      0,
      GRID_COLUMNS - 1,
    ),
    row: clamp(
      Math.floor(vehicle.y / GRID_SIZE),
      0,
      GRID_ROWS - 1,
    ),
  };
}

function pathTileKeys(path) {
  return path.map((point) => {
    const tile = getVehicleTile(point);
    return tileKey(tile.column, tile.row);
  });
}

export function createRoadTileMap(roads) {
  const roadTiles = new Map();

  roads.forEach((road) => {
    if (road.type === "dirt") {
      return;
    }

    const firstColumn = clamp(
      Math.floor(road.x / GRID_SIZE),
      0,
      GRID_COLUMNS - 1,
    );
    const lastColumn = clamp(
      Math.ceil((road.x + road.width) / GRID_SIZE) - 1,
      0,
      GRID_COLUMNS - 1,
    );
    const firstRow = clamp(
      Math.floor(road.y / GRID_SIZE),
      0,
      GRID_ROWS - 1,
    );
    const lastRow = clamp(
      Math.ceil((road.y + road.height) / GRID_SIZE) - 1,
      0,
      GRID_ROWS - 1,
    );

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (
        let column = firstColumn;
        column <= lastColumn;
        column += 1
      ) {
        roadTiles.set(tileKey(column, row), {
          column,
          row,
          x: (column + 0.5) * GRID_SIZE,
          y: (row + 0.5) * GRID_SIZE,
        });
      }
    }
  });

  return roadTiles;
}

function findNearestRoadTile(position, roadTiles) {
  const sourceTile = getVehicleTile(position);
  const direct = roadTiles.get(
    tileKey(sourceTile.column, sourceTile.row),
  );

  if (direct) {
    return direct;
  }

  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  roadTiles.forEach((roadTile) => {
    const distance =
      Math.abs(roadTile.column - sourceTile.column) +
      Math.abs(roadTile.row - sourceTile.row);

    if (distance < nearestDistance) {
      nearest = roadTile;
      nearestDistance = distance;
    }
  });

  return nearest;
}

export function createTrafficDensity(vehicles) {
  const density = new Map();

  vehicles.forEach((vehicle) => {
    if (vehicle.beingTowed) {
      return;
    }

    const tile = getVehicleTile(vehicle);
    const key = tileKey(tile.column, tile.row);
    density.set(key, (density.get(key) ?? 0) + 1);
  });

  return density;
}

function trafficLightIsInsideView(trafficLight, viewBounds) {
  if (!viewBounds) {
    return true;
  }

  return (
    trafficLight.x >= viewBounds.x &&
    trafficLight.x <= viewBounds.x + viewBounds.width &&
    trafficLight.y >= viewBounds.y &&
    trafficLight.y <= viewBounds.y + viewBounds.height
  );
}

function vehicleIsInsideTrafficLightMovementSquare(vehicle, trafficLight) {
  const halfSquare = GRID_SIZE;
  return (
    vehicle.x >= trafficLight.x - halfSquare &&
    vehicle.x <= trafficLight.x + halfSquare &&
    vehicle.y >= trafficLight.y - halfSquare &&
    vehicle.y <= trafficLight.y + halfSquare
  );
}

function reconstructPath(cameFrom, currentKey, roadTiles) {
  const path = [];
  let key = currentKey;

  while (key) {
    const tile = roadTiles.get(key);
    if (tile) {
      path.push({ x: tile.x, y: tile.y });
    }
    key = cameFrom.get(key) ?? null;
  }

  return path.reverse();
}

export function findAvailableRoadPath({
  start,
  destination,
  roadTiles,
  trafficDensity,
  occupiedTilePenalty,
  forbiddenTileKeys = null,
}) {
  const startTile = findNearestRoadTile(start, roadTiles);
  const destinationTile = findNearestRoadTile(
    destination,
    roadTiles,
  );

  if (!startTile || !destinationTile) {
    return [];
  }

  const startKey = tileKey(startTile.column, startTile.row);
  const destinationKey = tileKey(
    destinationTile.column,
    destinationTile.row,
  );
  const open = new Set([startKey]);
  const cameFrom = new Map();
  const travelCost = new Map([[startKey, 0]]);
  const estimatedCost = new Map([
    [
      startKey,
      Math.abs(startTile.column - destinationTile.column) +
        Math.abs(startTile.row - destinationTile.row),
    ],
  ]);
  const neighbours = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (open.size > 0) {
    let currentKey = null;
    let currentEstimate = Number.POSITIVE_INFINITY;

    open.forEach((candidateKey) => {
      const estimate =
        estimatedCost.get(candidateKey) ??
        Number.POSITIVE_INFINITY;
      if (estimate < currentEstimate) {
        currentEstimate = estimate;
        currentKey = candidateKey;
      }
    });

    if (currentKey === destinationKey) {
      return reconstructPath(
        cameFrom,
        currentKey,
        roadTiles,
      );
    }

    open.delete(currentKey);
    const current = roadTiles.get(currentKey);

    for (const [columnOffset, rowOffset] of neighbours) {
      const neighbourColumn = current.column + columnOffset;
      const neighbourRow = current.row + rowOffset;
      const neighbourKey = tileKey(
        neighbourColumn,
        neighbourRow,
      );
      const neighbour = roadTiles.get(neighbourKey);

      if (!neighbour) {
        continue;
      }

      if (
        forbiddenTileKeys?.has(neighbourKey) &&
        neighbourKey !== destinationKey &&
        neighbourKey !== startKey
      ) {
        continue;
      }

      const congestion =
        trafficDensity.get(neighbourKey) ?? 0;
      const candidateCost =
        (travelCost.get(currentKey) ?? 0) +
        1 +
        congestion * occupiedTilePenalty;

      if (
        candidateCost >=
        (travelCost.get(neighbourKey) ??
          Number.POSITIVE_INFINITY)
      ) {
        continue;
      }

      cameFrom.set(neighbourKey, currentKey);
      travelCost.set(neighbourKey, candidateCost);
      estimatedCost.set(
        neighbourKey,
        candidateCost +
          Math.abs(neighbourColumn - destinationTile.column) +
          Math.abs(neighbourRow - destinationTile.row),
      );
      open.add(neighbourKey);
    }
  }

  return [];
}

function rotationTowards(source, target) {
  return Math.atan2(
    target.y - source.y,
    target.x - source.x,
  ) + Math.PI / 2;
}

function rotateTowards(current, target, maximumChange) {
  const difference = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  return current +
    clamp(difference, -maximumChange, maximumChange);
}

function truckPositionIsClear({
  truck,
  position,
  trafficVehicles,
  ignoredVehicleId,
  playerCollisionBox,
  canOccupyWorld,
  config,
}) {
  const truckShape = createSolidVehicleShape(
    truck,
    position,
    config.collisionPadding,
  );

  if (!canOccupyWorld(truckShape)) {
    return false;
  }

  if (
    playerCollisionBox &&
    solidVehiclesOverlap(truckShape, playerCollisionBox)
  ) {
    return false;
  }

  return !trafficVehicles.some((vehicle) => {
    if (
      vehicle.id === ignoredVehicleId ||
      vehicle.beingTowed
    ) {
      return false;
    }

    return solidVehiclesOverlap(
      truckShape,
      createSolidVehicleShape(
        {
          width: vehicle.collisionWidth ?? vehicle.width,
          length: vehicle.collisionLength ?? vehicle.length,
        },
        vehicle,
        config.collisionPadding,
      ),
    );
  });
}

function moveTruckAlongPath(
  truck,
  deltaSeconds,
  config,
  collisionContext,
) {
  const speed =
    truck.status === "towing"
      ? config.towingSpeed
      : config.speed;
  let remainingMovement = speed * deltaSeconds;
  let processedPathPoints = 0;
  let moved = false;

  while (
    remainingMovement > 0 &&
    processedPathPoints <
      config.maximumPathPointsPerUpdate
  ) {
    const target = truck.path[truck.pathIndex];

    if (!target) {
      truck.speed = moved ? speed : 0;
      return { complete: true, blocked: false };
    }

    const differenceX = target.x - truck.x;
    const differenceY = target.y - truck.y;
    const distance = Math.hypot(differenceX, differenceY);

    if (distance <= config.arrivalDistance) {
      truck.x = target.x;
      truck.y = target.y;
      truck.pathIndex += 1;
      processedPathPoints += 1;
      continue;
    }

    const desiredRotation = rotationTowards(truck, target);
    const batchDistance = Math.min(
      remainingMovement,
      distance,
      config.movementBatchDistance,
    );
    const batchSeconds =
      speed > 0 ? batchDistance / speed : 0;
    const proposedRotation = rotateTowards(
      truck.rotation,
      desiredRotation,
      config.steeringRadiansPerSecond * batchSeconds,
    );
    const proposedPosition = {
      x:
        truck.x +
        (differenceX / distance) * batchDistance,
      y:
        truck.y +
        (differenceY / distance) * batchDistance,
      rotation: proposedRotation,
    };

    if (
      !truckPositionIsClear({
        truck,
        position: proposedPosition,
        config,
        ...collisionContext,
      })
    ) {
      truck.speed = 0;
      return { complete: false, blocked: true };
    }

    truck.x = proposedPosition.x;
    truck.y = proposedPosition.y;
    truck.rotation = proposedRotation;
    remainingMovement -= batchDistance;
    moved = true;
  }

  if (!moved) {
    truck.speed = 0;
  }

  truck.speed = moved ? speed : 0;
  return {
    complete: truck.pathIndex >= truck.path.length,
    blocked: false,
  };
}

function attachVehicle(truck, vehicle) {
  truck.status = "towing";
  truck.targetVehicleId = vehicle.id;
  truck.path = truck.returnPath;
  truck.pathIndex = 0;
  vehicle.beingTowed = true;
  vehicle.towAssigned = false;
  vehicle.speed = 0;
  vehicle.blocked = false;
  vehicle.hardBlockedSeconds = 0;
  vehicle.towStallSeconds = 0;
}

function updateAttachedVehicle(truck, vehicle, config) {
  const offset =
    truck.length / 2 +
    vehicle.length / 2 +
    config.attachmentGap;
  const forwardX = Math.sin(truck.rotation);
  const forwardY = -Math.cos(truck.rotation);

  vehicle.previousX = vehicle.x;
  vehicle.previousY = vehicle.y;
  vehicle.previousRotation = vehicle.rotation;
  vehicle.x = truck.x - forwardX * offset;
  vehicle.y = truck.y - forwardY * offset;
  vehicle.rotation = truck.rotation;
  vehicle.speed = 0;
}

function releaseTruckReservation(state, truck) {
  truck.reservedTileKeys.forEach((key) => {
    if (state.reservedTileOwners.get(key) === truck.id) {
      state.reservedTileOwners.delete(key);
    }
  });

  state.corridorAllowedVehicleIds.delete(truck.id);
  truck.reservedTileKeys.clear();
}

function resetTruckAtBase(state, truck, targetVehicle = null) {
  releaseTruckReservation(state, truck);

  if (targetVehicle) {
    targetVehicle.towAssigned = false;
    targetVehicle.beingTowed = false;
  }

  truck.x = truck.base.x;
  truck.y = truck.base.y;
  truck.rotation = truck.base.rotation ?? 0;
  truck.previousX = truck.x;
  truck.previousY = truck.y;
  truck.previousRotation = truck.rotation;
  truck.status = "parked";
  truck.speed = 0;
  truck.blockedSeconds = 0;
  truck.path = [];
  truck.outboundPath = [];
  truck.returnPath = [];
  truck.pathIndex = 0;
  truck.targetVehicleId = null;
}

function isVehicleVisibleInView(vehicle, viewBounds) {
  if (!viewBounds) {
    return true;
  }

  const halfExtent =
    Math.max(vehicle.width ?? 0, vehicle.length ?? 0) / 2;

  return (
    vehicle.x + halfExtent >= viewBounds.x &&
    vehicle.x - halfExtent <= viewBounds.x + viewBounds.width &&
    vehicle.y + halfExtent >= viewBounds.y &&
    vehicle.y - halfExtent <= viewBounds.y + viewBounds.height
  );
}

function resolveOffCameraTowJobs({
  state,
  trafficState,
  viewBounds,
}) {
  if (!viewBounds) {
    return;
  }

  const removedVehicleIds = new Set();

  for (const truck of state.trucks) {
    if (
      truck.status !== "dispatching" ||
      !truck.targetVehicleId
    ) {
      continue;
    }

    const targetVehicle = trafficState.vehicles.find(
      (vehicle) => vehicle.id === truck.targetVehicleId,
    );

    if (
      !targetVehicle ||
      isVehicleVisibleInView(targetVehicle, viewBounds)
    ) {
      continue;
    }

    removedVehicleIds.add(targetVehicle.id);
    state.trafficReport = {
      status: "cleared",
      message: "Traffic cleared. The obstructing car was removed.",
      remainingSeconds: 0,
      checks: [],
    };
    resetTruckAtBase(state, truck, targetVehicle);
  }

  if (removedVehicleIds.size === 0) {
    return;
  }

  for (const vehicle of trafficState.vehicles) {
    if (
      removedVehicleIds.has(vehicle.id) &&
      trafficState.vehiclePool.length < 96
    ) {
      trafficState.vehiclePool.push(vehicle);
    }
  }

  trafficState.vehicles = trafficState.vehicles.filter(
    (vehicle) => !removedVehicleIds.has(vehicle.id),
  );

  removedVehicleIds.forEach((vehicleId) => {
    trafficState.activeVehicleIds.delete(vehicleId);
  });

  for (
    const [reservationKey, ownerId] of
    trafficState.privateCitizenMergeReservedTileOwners.entries()
  ) {
    if (removedVehicleIds.has(ownerId)) {
      trafficState.privateCitizenMergeReservedTileOwners.delete(
        reservationKey,
      );
    }
  }
}

function buildRoundTripPlan({
  truck,
  candidate,
  state,
  trafficDensity,
  config,
}) {
  const otherReservations = new Set(
    [...state.reservedTileOwners.entries()]
      .filter(([, ownerId]) => ownerId !== truck.id)
      .map(([key]) => key),
  );

  const outboundPath = findAvailableRoadPath({
    start: truck.base,
    destination: candidate,
    roadTiles: state.roadTiles,
    trafficDensity,
    occupiedTilePenalty: config.occupiedTilePenalty,
    forbiddenTileKeys: otherReservations,
  });

  if (outboundPath.length === 0) {
    return null;
  }

  const roadReturnPath = findAvailableRoadPath({
    start: candidate,
    destination: truck.base,
    roadTiles: state.roadTiles,
    trafficDensity,
    occupiedTilePenalty: config.occupiedTilePenalty,
    forbiddenTileKeys: otherReservations,
  });

  if (roadReturnPath.length === 0) {
    return null;
  }

  const returnPath = [
    ...roadReturnPath,
    { x: truck.base.x, y: truck.base.y },
  ];

  return {
    outboundPath,
    returnPath,
    reservedTileKeys: new Set([
      ...pathTileKeys(outboundPath),
      ...pathTileKeys(returnPath),
    ]),
  };
}





function assignReportedTrafficJob({
  state,
  trafficState,
  candidate,
  config,
}) {
  const trafficDensity = createTrafficDensity(trafficState.vehicles);
  const availableTrucks = state.trucks
    .filter((truck) => truck.status === "parked")
    .sort((first, second) => (
      Math.hypot(first.base.x - candidate.x, first.base.y - candidate.y) -
      Math.hypot(second.base.x - candidate.x, second.base.y - candidate.y)
    ));

  for (const truck of availableTrucks) {
    const plan = buildRoundTripPlan({
      truck,
      candidate,
      state,
      trafficDensity,
      config,
    });
    if (!plan) continue;

    truck.targetVehicleId = candidate.id;
    truck.outboundPath = plan.outboundPath;
    truck.returnPath = plan.returnPath;
    truck.reservedTileKeys.clear();
    truck.path = truck.outboundPath;
    truck.pathIndex = 0;
    truck.status = "dispatching";
    candidate.towAssigned = true;
    candidate.speed = 0;
    candidate.blocked = false;
    state.trafficReport = {
      status: "dispatched",
      message: "Tow truck dispatched to the reported blockage.",
      remainingSeconds: 0,
      checks: [],
    };
    return true;
  }

  state.trafficReport.status = "waiting";
  state.trafficReport.message = "All tow trucks are busy. Your report is queued.";
  state.trafficReport.remainingSeconds = 0;
  return false;
}

function updateReportedTrafficCheck({
  state,
  trafficState,
  deltaSeconds,
  config: _config,
}) {
  const report = state.trafficReport;
  if (!report || !["checking", "waiting"].includes(report.status)) return;

  if (report.status === "checking") {
    report.remainingSeconds = Math.max(0, report.remainingSeconds - deltaSeconds);
    if (report.remainingSeconds > 0) return;
  }

  for (const check of report.checks) {
    const remainingVehicles = check.vehicleIds
      .map((vehicleId) => trafficState.vehicles.find((vehicle) => vehicle.id === vehicleId))
      .filter((vehicle) => (
        vehicle &&
        !vehicle.beingTowed &&
        !vehicle.towAssigned &&
        vehicleIsInsideTrafficLightMovementSquare(vehicle, check.trafficLight)
      ));

    if (remainingVehicles.length < 2) continue;
    const removedVehicle = remainingVehicles[0];
    trafficState.vehicles = trafficState.vehicles.filter(
      (vehicle) => vehicle.id !== removedVehicle.id,
    );
    trafficState.activeVehicleIds?.delete(removedVehicle.id);
    trafficState.aiTowRequestVehicleIds?.delete(removedVehicle.id);
    removedVehicle.beingTowed = false;
    removedVehicle.towAssigned = false;
    if (
      Array.isArray(trafficState.vehiclePool) &&
      trafficState.vehiclePool.length < 96
    ) {
      trafficState.vehiclePool.push(removedVehicle);
    }
    state.trafficReport = {
      status: "cleared",
      message: "Traffic cleared. One obstructing car was removed.",
      remainingSeconds: 0,
      checks: [],
    };
    return;
  }

  state.trafficReport = {
    status: "clear",
    message: "The reported traffic moved before the check finished.",
    remainingSeconds: 0,
    checks: [],
  };
}

export function createTowTruckState(_bases, _config) {
  return {
    roadTiles: null,
    reservedTileOwners: new Map(),
    corridorAllowedVehicleIds: new Map(),
    trafficReport: {
      status: "idle",
      message: "Report a visible traffic-light blockage.",
      remainingSeconds: 0,
      checks: [],
    },
    trucks: [],
  };
}

export function reportViewportTraffic({
  state,
  trafficState,
  trafficLights,
  viewBounds,
}) {
  if (["checking", "waiting"].includes(state.trafficReport?.status)) return false;

  const checks = trafficLights
    .filter((trafficLight) => trafficLightIsInsideView(trafficLight, viewBounds))
    .map((trafficLight) => ({
      trafficLight,
      vehicleIds: trafficState.vehicles
        .filter((vehicle) => (
          !vehicle.beingTowed &&
          !vehicle.towAssigned &&
          vehicleIsInsideTrafficLightMovementSquare(vehicle, trafficLight)
        ))
        .map((vehicle) => vehicle.id),
    }))
    .filter((check) => check.vehicleIds.length >= 2);

  if (checks.length === 0) {
    state.trafficReport = {
      status: "clear",
      message: "No two-car traffic-light blockage is visible.",
      remainingSeconds: 0,
      checks: [],
    };
    return false;
  }

  state.trafficReport = {
    status: "checking",
    message: "Checking the reported blockage for 5 seconds...",
    remainingSeconds: 5,
    checks,
  };
  return true;
}

export function isTowTruckTileReserved(
  state,
  position,
  requestingTowTruckId = null,
) {
  const tile = getVehicleTile(position);
  const owner = state.reservedTileOwners.get(
    tileKey(tile.column, tile.row),
  );
  return Boolean(owner && owner !== requestingTowTruckId);
}

export function updateTowTrucks({
  state,
  trafficState,
  roads,
  trafficLights: _trafficLights,
  playerCollisionBox,
  canOccupyWorld,
  deltaSeconds,
  config,
  gameClock = null,
  gameMinute = null,
  viewBounds = null,
}) {
  state.trucks.length = 0;
  state.reservedTileOwners.clear();
  state.corridorAllowedVehicleIds.clear();
  trafficState.towReservedTileOwners = state.reservedTileOwners;
  trafficState.towReservedCorridorAllowedVehicleIds =
    state.corridorAllowedVehicleIds;
  if (!(trafficState.aiTowRequestVehicleIds instanceof Set)) {
    trafficState.aiTowRequestVehicleIds = new Set();
  } else {
    trafficState.aiTowRequestVehicleIds.clear();
  }
  updateReportedTrafficCheck({
    state,
    trafficState,
    deltaSeconds,
    config,
  });
  return;

  state.roadTiles ??= createRoadTileMap(roads);

  // Tow trucks now use immediate collision checks instead of claiming a
  // complete outbound-and-return corridor. Keep these legacy maps empty so
  // population vehicles continue moving and only react to the truck itself.
  state.reservedTileOwners.clear();
  state.corridorAllowedVehicleIds.clear();
  trafficState.towReservedTileOwners = state.reservedTileOwners;
  trafficState.towReservedCorridorAllowedVehicleIds =
    state.corridorAllowedVehicleIds;

  // AI drivers may report the same blocker after five separate contact/bounce attempts.
  for (const vehicleId of [...(trafficState.aiTowRequestVehicleIds || [])]) {
    const candidate = trafficState.vehicles.find((vehicle) => vehicle.id === vehicleId && !vehicle.beingTowed && !vehicle.towAssigned);
    if (!candidate) {
      trafficState.aiTowRequestVehicleIds.delete(vehicleId);
      continue;
    }
    if (assignReportedTrafficJob({ state, trafficState, candidate, config })) {
      trafficState.aiTowRequestVehicleIds.delete(vehicleId);
      break;
    }
  }
  // Civilian towing is now triggered only by the player's viewport report.
  updateReportedTrafficCheck({
    state,
    trafficState,
    deltaSeconds,
    config,
  });

  resolveOffCameraTowJobs({
    state,
    trafficState,
    viewBounds,
  });

  state.trucks.forEach((truck) => {
    truck.previousX = truck.x;
    truck.previousY = truck.y;
    truck.previousRotation = truck.rotation;

    if (truck.status === "parked") {
      return;
    }

    const targetVehicle = trafficState.vehicles.find(
      (vehicle) => vehicle.id === truck.targetVehicleId,
    );

    if (!targetVehicle) {
      resetTruckAtBase(state, truck);
      return;
    }

    if (truck.status === "dispatching") {
      const movementResult = moveTruckAlongPath(
        truck,
        deltaSeconds,
        config,
        {
          trafficVehicles: trafficState.vehicles,
          ignoredVehicleId: targetVehicle.id,
          playerCollisionBox,
          canOccupyWorld,
        },
      );
      const targetDistance = Math.hypot(
        targetVehicle.x - truck.x,
        targetVehicle.y - truck.y,
      );

      truck.blockedSeconds = movementResult.blocked
        ? truck.blockedSeconds + deltaSeconds
        : 0;

      if (truck.blockedSeconds >= (config.blockedRecoverySeconds ?? 5)) {
        trafficState.vehicles = trafficState.vehicles.filter(
          (vehicle) => vehicle.id !== targetVehicle.id,
        );
        state.trafficReport = {
          status: "cleared",
          message: "Traffic cleared. The obstructing car was removed.",
          remainingSeconds: 0,
          checks: [],
        };
        resetTruckAtBase(state, truck);
        return;
      }

      if (targetDistance <= config.attachmentDistance) {
        attachVehicle(truck, targetVehicle);
      }
      return;
    }

    if (truck.status === "towing") {
      const movementResult = moveTruckAlongPath(
        truck,
        deltaSeconds,
        config,
        {
          trafficVehicles: trafficState.vehicles,
          ignoredVehicleId: targetVehicle.id,
          playerCollisionBox,
          canOccupyWorld,
        },
      );
      updateAttachedVehicle(truck, targetVehicle, config);

      if (!movementResult.complete) {
        return;
      }

      trafficState.vehicles = trafficState.vehicles.filter(
        (vehicle) => vehicle.id !== targetVehicle.id,
      );
      state.trafficReport = {
        status: "cleared",
        message: "Traffic cleared. The obstructing car was towed away.",
        remainingSeconds: 0,
        checks: [],
      };
      resetTruckAtBase(state, truck);
    }
  });
}

