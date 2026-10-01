import { GRID_SIZE } from "../src/world/data/mapConstants.js";
import { startingResidential } from "../src/world/data/startingResidential.js";
import { workHub } from "../src/world/data/workHub.js";
import { wealthyResidential } from "../src/world/data/wealthyResidential.js";
import { nightlife } from "../src/world/data/nightlife.js";
import { PRIVATE_CITIZEN_1_ROUTE } from "../src/traffic/privatecitizen1/data/privateCitizen1Route.js";
import {
  releasePrivateCitizen1MergeReservation,
  shouldBlockVehicleForPrivateCitizenMergeReservation,
  updatePrivateCitizen1MergeReservation,
} from "../src/traffic/privatecitizen1/systems/privateCitizen1System.js";
import { TOW_TRUCK_BASES } from "../src/traffic/towParking/towTruckParkingBases.js";

const districts = [
  startingResidential,
  workHub,
  wealthyResidential,
  nightlife,
];

const PRIVATE_CITIZEN_1_COLLISION_WIDTH = 33;
const PRIVATE_CITIZEN_1_COLLISION_LENGTH = 58;

function worldItem(district, item) {
  return {
    ...item,
    x: district.worldX + item.x,
    y: district.worldY + item.y,
    districtId: district.id,
  };
}

const roads = districts.flatMap((district) => {
  return district.roads.map((road) => worldItem(district, road));
});

const pavedRoads = roads.filter((road) => road.type !== "dirt");
const dirtRoads = roads.filter((road) => road.type === "dirt");

const serviceSurfaces = districts.flatMap((district) => {
  return [
    ...(district.fuelPumps ?? []),
    ...(district.bankParkingZones ?? []),
    ...(district.dealershipParkingZones ?? []),
  ].map((item) => worldItem(district, item));
});

const solidMapObjects = districts.flatMap((district) => {
  return [
    ...(district.blocks ?? []),
    ...(district.landmarks ?? []),
    ...(district.barriers ?? []),
  ].map((item) => worldItem(district, item));
});

function pointInsideRect(point, rectangle, margin = 0.001) {
  return (
    point.x >= rectangle.x - margin &&
    point.x <= rectangle.x + rectangle.width + margin &&
    point.y >= rectangle.y - margin &&
    point.y <= rectangle.y + rectangle.height + margin
  );
}

function tileRect(column, row) {
  return {
    x: column * GRID_SIZE,
    y: row * GRID_SIZE,
    width: GRID_SIZE,
    height: GRID_SIZE,
  };
}

function overlaps(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function isRoadTile(column, row) {
  const tile = tileRect(column, row);
  return roads.some((road) => overlaps(tile, road));
}

function isPavedDrivablePoint(point) {
  return [...pavedRoads, ...serviceSurfaces].some((surface) => {
    return pointInsideRect(point, surface);
  });
}

function isOnDirtWithoutPavedRoad(point) {
  const onDirt = dirtRoads.some((road) => {
    return pointInsideRect(point, road);
  });

  return onDirt && !isPavedDrivablePoint(point);
}

function isInsideSolidMapObject(point) {
  return solidMapObjects.some((object) => {
    return pointInsideRect(point, object, -0.01);
  });
}

function vehicleBodySamplePoints(center, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);

  const forward = distance > 0.001
    ? { x: dx / distance, y: dy / distance }
    : {
        x:
          start.direction === "east"
            ? 1
            : start.direction === "west"
              ? -1
              : 0,
        y:
          start.direction === "south"
            ? 1
            : start.direction === "north"
              ? -1
              : 0,
      };

  const right = { x: -forward.y, y: forward.x };
  const halfLength = PRIVATE_CITIZEN_1_COLLISION_LENGTH / 2;
  const halfWidth = PRIVATE_CITIZEN_1_COLLISION_WIDTH / 2;

  const pointAt = (forwardOffset, rightOffset) => ({
    x:
      center.x +
      forward.x * forwardOffset +
      right.x * rightOffset,
    y:
      center.y +
      forward.y * forwardOffset +
      right.y * rightOffset,
  });

  return [
    center,
    pointAt(halfLength, 0),
    pointAt(-halfLength, 0),
    pointAt(0, halfWidth),
    pointAt(0, -halfWidth),
    pointAt(halfLength, halfWidth),
    pointAt(halfLength, -halfWidth),
    pointAt(-halfLength, halfWidth),
    pointAt(-halfLength, -halfWidth),
  ];
}

function orientedVehicleCorners(center, start, end) {
  return vehicleBodySamplePoints(center, start, end).slice(5);
}

function polygonAxes(points) {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const edge = {
      x: next.x - point.x,
      y: next.y - point.y,
    };
    const length = Math.hypot(edge.x, edge.y) || 1;
    return {
      x: -edge.y / length,
      y: edge.x / length,
    };
  });
}

function projectPolygon(points, axis) {
  const projections = points.map((point) => {
    return point.x * axis.x + point.y * axis.y;
  });

  return {
    minimum: Math.min(...projections),
    maximum: Math.max(...projections),
  };
}

function rectangleCorners(rectangle) {
  return [
    { x: rectangle.x, y: rectangle.y },
    { x: rectangle.x + rectangle.width, y: rectangle.y },
    {
      x: rectangle.x + rectangle.width,
      y: rectangle.y + rectangle.height,
    },
    { x: rectangle.x, y: rectangle.y + rectangle.height },
  ];
}

function polygonsOverlap(first, second) {
  const axes = [
    ...polygonAxes(first),
    ...polygonAxes(second),
  ];

  return axes.every((axis) => {
    const firstProjection = projectPolygon(first, axis);
    const secondProjection = projectPolygon(second, axis);

    return !(
      firstProjection.maximum <= secondProjection.minimum ||
      secondProjection.maximum <= firstProjection.minimum
    );
  });
}

function vehicleBodyOverlapsSolid(center, start, end) {
  const vehicleCorners = orientedVehicleCorners(
    center,
    start,
    end,
  );

  return solidMapObjects.some((object) => {
    return polygonsOverlap(
      vehicleCorners,
      rectangleCorners(object),
    );
  });
}

function expectedStraightDirection(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const epsilon = GRID_SIZE * 0.02;

  if (Math.abs(dy) <= epsilon && Math.abs(dx) > epsilon) {
    return dx > 0 ? "east" : "west";
  }

  if (Math.abs(dx) <= epsilon && Math.abs(dy) > epsilon) {
    return dy > 0 ? "south" : "north";
  }

  return null;
}

const routeErrors = [];
const routePoints = PRIVATE_CITIZEN_1_ROUTE.points;

for (let index = 0; index < routePoints.length; index += 1) {
  const point = routePoints[index];

  if (!isPavedDrivablePoint(point)) {
    routeErrors.push(
      `Waypoint ${index} is not on a paved road/service surface: X${point.tileColumn} Y${point.tileRow}`,
    );
  }

  if (isOnDirtWithoutPavedRoad(point)) {
    routeErrors.push(
      `Waypoint ${index} uses a dirt road: X${point.tileColumn} Y${point.tileRow}`,
    );
  }

  if (
    isInsideSolidMapObject(point) &&
    !point.serviceZoneException
  ) {
    routeErrors.push(
      `Waypoint ${index} overlaps a building/landmark: X${point.tileColumn} Y${point.tileRow}`,
    );
  }

  if (point.laneKind === "two-lane-horizontal") {
    const expectedRow = point.direction === "east"
      ? point.roadStartRow + 1
      : point.roadStartRow;

    if (point.tileRow !== expectedRow) {
      routeErrors.push(
        `Wrong horizontal lane at waypoint ${index}: ${point.direction} is on Y${point.tileRow}, expected Y${expectedRow}`,
      );
    }
  }

  if (point.laneKind === "two-lane-vertical") {
    const expectedColumn = point.direction === "north"
      ? point.roadStartColumn + 1
      : point.roadStartColumn;

    if (point.tileColumn !== expectedColumn) {
      routeErrors.push(
        `Wrong vertical lane at waypoint ${index}: ${point.direction} is on X${point.tileColumn}, expected X${expectedColumn}`,
      );
    }
  }

  if (point.reserveBeforeMerge) {
    const reservationPoint = {
      x: (point.reserveTileColumn + 0.5) * GRID_SIZE,
      y: (point.reserveTileRow + 0.5) * GRID_SIZE,
    };

    if (!isPavedDrivablePoint(reservationPoint)) {
      routeErrors.push(
        `Merge reservation at waypoint ${index} targets non-road tile X${point.reserveTileColumn} Y${point.reserveTileRow}`,
      );
    }
  }
}

for (let index = 0; index < routePoints.length - 1; index += 1) {
  const start = routePoints[index];
  const end = routePoints[index + 1];
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const sampleCount = Math.max(
    1,
    Math.ceil(length / (GRID_SIZE * 0.05)),
  );

  for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
    const progress = sampleIndex / sampleCount;
    const sample = {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    };

    if (!isPavedDrivablePoint(sample)) {
      routeErrors.push(
        `Segment ${index} leaves all paved roads between X${start.tileColumn} Y${start.tileRow} and X${end.tileColumn} Y${end.tileRow}`,
      );
      break;
    }

    if (
      isInsideSolidMapObject(sample) &&
      !start.serviceZoneException &&
      !end.serviceZoneException
    ) {
      routeErrors.push(
        `Segment ${index} crosses a building/landmark between X${start.tileColumn} Y${start.tileRow} and X${end.tileColumn} Y${end.tileRow}`,
      );
      break;
    }

    const bodyPoints = vehicleBodySamplePoints(
      sample,
      start,
      end,
    );

    if (
      bodyPoints.some((bodyPoint) => {
        return !isPavedDrivablePoint(bodyPoint);
      })
    ) {
      routeErrors.push(
        `Vehicle body leaves paved road space on segment ${index} between X${start.tileColumn} Y${start.tileRow} and X${end.tileColumn} Y${end.tileRow}`,
      );
      break;
    }

    if (
      vehicleBodyOverlapsSolid(sample, start, end) &&
      !start.serviceZoneException &&
      !end.serviceZoneException
    ) {
      routeErrors.push(
        `Vehicle body hits a building, landmark, barrier, or median on segment ${index} between X${start.tileColumn} Y${start.tileRow} and X${end.tileColumn} Y${end.tileRow}`,
      );
      break;
    }
  }

  const expectedDirection = expectedStraightDirection(start, end);

  if (
    expectedDirection &&
    start.laneKind === end.laneKind &&
    start.direction === end.direction &&
    end.direction !== expectedDirection
  ) {
    routeErrors.push(
      `Direction mismatch on segment ${index}: movement is ${expectedDirection}, lane says ${end.direction}`,
    );
  }
}

const expectedStops = new Map([
  ["private-citizen-1-bank", 60],
  ["private-citizen-1-petrol", 30],
  ["private-citizen-1-dealership", 30],
]);

for (const [stopId, minutes] of expectedStops) {
  const point = routePoints.find((entry) => entry.stopId === stopId);
  if (!point || point.dwellMinutes !== minutes) {
    routeErrors.push(`${stopId}: expected ${minutes} dwell minutes`);
  }
}

const towErrors = [];

for (const base of TOW_TRUCK_BASES) {
  if (base.yardTiles.length !== 1) {
    towErrors.push(`${base.id}: expected exactly one parking tile`);
  }

  const yardTile = base.yardTiles[0];
  const yardRect = tileRect(yardTile.column, yardTile.row);

  if (isRoadTile(yardTile.column, yardTile.row)) {
    towErrors.push(
      `${base.id}: X${yardTile.column} Y${yardTile.row} is a road`,
    );
  }

  const collisions = solidMapObjects.filter((object) => {
    return overlaps(yardRect, object);
  });

  if (collisions.length > 0) {
    towErrors.push(
      `${base.id}: tow tile overlaps ${collisions.map((item) => item.id).join(", ")}`,
    );
  }

  if (!isRoadTile(base.roadEntry.column, base.roadEntry.row)) {
    towErrors.push(
      `${base.id}: entry X${base.roadEntry.column} Y${base.roadEntry.row} is not a road`,
    );
  }

  const distanceToRoadEntry =
    Math.abs(base.tileColumn - base.roadEntry.column) +
    Math.abs(base.tileRow - base.roadEntry.row);

  if (distanceToRoadEntry !== 1) {
    towErrors.push(`${base.id}: parking tile is not adjacent to road entry`);
  }
}

// Small behaviour test for the reservation contract.
const reservationTestVehicle = {
  id: "population-test-private-citizen-1",
  routeId: PRIVATE_CITIZEN_1_ROUTE.id,
  speed: 100,
  blocked: false,
  hardBlockedSeconds: 5,
  towStallSeconds: 5,
  privateCitizen1MergeReservationKey: null,
};
const reservationTestTarget = {
  reserveBeforeMerge: true,
  reserveTileColumn: 3,
  reserveTileRow: 8,
};
const reservationMap = new Map();

const waitsWithoutReservingOccupiedTile =
  updatePrivateCitizen1MergeReservation({
    vehicle: reservationTestVehicle,
    target: reservationTestTarget,
    reservations: reservationMap,
    isReservationTileOccupied: () => true,
  });

if (
  !waitsWithoutReservingOccupiedTile ||
  reservationMap.size !== 0 ||
  reservationTestVehicle.speed !== 0
) {
  routeErrors.push(
    "Private Citizen 1 reserved an occupied merge tile",
  );
}

const acquiresClearTile =
  updatePrivateCitizen1MergeReservation({
    vehicle: reservationTestVehicle,
    target: reservationTestTarget,
    reservations: reservationMap,
    isReservationTileOccupied: () => false,
  });

if (
  acquiresClearTile ||
  reservationMap.get("3:8") !== reservationTestVehicle.id
) {
  routeErrors.push(
    "Private Citizen 1 did not reserve the clear tile in front",
  );
}

const followingVehicleIsBlocked =
  shouldBlockVehicleForPrivateCitizenMergeReservation({
    vehicleId: "vehicle-behind",
    reservationOwner: reservationTestVehicle.id,
    proposedPositionOverlapsReservedTile: true,
  });

if (!followingVehicleIsBlocked) {
  routeErrors.push(
    "A following vehicle was allowed into the reserved safety area",
  );
}

const ownerCanEnter =
  shouldBlockVehicleForPrivateCitizenMergeReservation({
    vehicleId: reservationTestVehicle.id,
    reservationOwner: reservationTestVehicle.id,
    proposedPositionOverlapsReservedTile: true,
  });

if (ownerCanEnter) {
  routeErrors.push(
    "Private Citizen 1 was blocked from its own reservation",
  );
}

releasePrivateCitizen1MergeReservation(
  reservationTestVehicle,
  reservationMap,
);

if (reservationMap.size !== 0) {
  routeErrors.push("Merge reservation was not released after merging");
}

if (routeErrors.length || towErrors.length) {
  console.error("Private Citizen 1 route errors:", routeErrors);
  console.error("Tow parking errors:", towErrors);
  process.exit(1);
}

console.log(
  `PASS: ${routePoints.length - 1} route segments sampled continuously; the sedan body remains on paved roads/service tiles and avoids buildings, landmarks, barriers, and medians.`,
);
console.log(
  "PASS: every two-lane point uses the left-driving lane for its travel direction.",
);
console.log(
  "PASS: occupied merge tiles remain unreserved; a clear tile is reserved ahead and following traffic hard-stops before entering its safety area.",
);
console.log(
  `PASS: ${TOW_TRUCK_BASES.length} tow trucks each use one clear off-road tile adjacent to a road entry.`,
);
