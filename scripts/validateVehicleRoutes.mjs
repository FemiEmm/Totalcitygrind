import assert from "node:assert/strict";

import { POPULATION_ROUTES } from "../src/population/data/populationRoutes.js";
import { POPULATION_VEHICLE_TYPES } from "../src/population/data/populationVehicles.js";
import { obstacles, roads } from "../src/world/data/worldMap.js";

const SAMPLE_DISTANCE = 4;
const TURN_ROTATION_STEP = Math.PI / 36;
const TERMINAL_BUS_SCALE = 1.2;

function pointInRectangle(point, rectangle) {
  return (
    point.x >= rectangle.x &&
    point.x <= rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y <= rectangle.y + rectangle.height
  );
}

function getVehicleCorners(position, width, length, rotation) {
  const forward = { x: Math.sin(rotation), y: -Math.cos(rotation) };
  const right = { x: Math.cos(rotation), y: Math.sin(rotation) };
  const halfLength = length / 2;
  const halfWidth = width / 2;

  return [
    { x: position.x + forward.x * halfLength + right.x * halfWidth, y: position.y + forward.y * halfLength + right.y * halfWidth },
    { x: position.x + forward.x * halfLength - right.x * halfWidth, y: position.y + forward.y * halfLength - right.y * halfWidth },
    { x: position.x - forward.x * halfLength + right.x * halfWidth, y: position.y - forward.y * halfLength + right.y * halfWidth },
    { x: position.x - forward.x * halfLength - right.x * halfWidth, y: position.y - forward.y * halfLength - right.y * halfWidth },
  ];
}

function project(points, axis) {
  const values = points.map((point) => point.x * axis.x + point.y * axis.y);
  return { minimum: Math.min(...values), maximum: Math.max(...values) };
}

function projectionsOverlap(first, second) {
  return first.minimum < second.maximum && first.maximum > second.minimum;
}

function polygonOverlapsRectangle(polygon, rectangle) {
  const rectanglePoints = [
    { x: rectangle.x, y: rectangle.y },
    { x: rectangle.x + rectangle.width, y: rectangle.y },
    { x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height },
    { x: rectangle.x, y: rectangle.y + rectangle.height },
  ];

  const axes = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const edge = { x: next.x - current.x, y: next.y - current.y };
    const length = Math.hypot(edge.x, edge.y);
    axes.push({ x: -edge.y / length, y: edge.x / length });
  }

  return axes.every((axis) => {
    return projectionsOverlap(project(polygon, axis), project(rectanglePoints, axis));
  });
}

function getRotation(from, to) {
  return Math.atan2(to.x - from.x, -(to.y - from.y));
}

function normaliseAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function getLargestVehicle(route) {
  const allowedTypes = route.vehicleTypes ?? POPULATION_VEHICLE_TYPES.map((type) => type.id);
  const candidates = POPULATION_VEHICLE_TYPES.filter((type) => allowedTypes.includes(type.id));
  assert.ok(candidates.length > 0, `${route.id}: route has no valid vehicle type`);

  const largest = candidates.reduce((current, candidate) => {
    return candidate.width * candidate.length > current.width * current.length ? candidate : current;
  });

  const scale = route.terminalBus ? TERMINAL_BUS_SCALE : 1;
  return { width: largest.width * scale, length: largest.length * scale };
}

function validatePose(route, position, width, length, rotation, label) {
  const corners = getVehicleCorners(position, width, length, rotation);
  const footprintPoints = [...corners, position];

  const outsideRoad = footprintPoints.find((point) => {
    return !roads.some((road) => pointInRectangle(point, road));
  });

  assert.equal(
    outsideRoad,
    undefined,
    `${route.id}: vehicle enters grass at ${label} near grid X${(position.x / 120).toFixed(2)} Y${(position.y / 120).toFixed(2)}`,
  );

  const hitObstacle = obstacles.find((obstacle) => polygonOverlapsRectangle(corners, obstacle));
  assert.equal(
    hitObstacle,
    undefined,
    `${route.id}: vehicle overlaps obstacle ${hitObstacle?.id ?? "unknown"} at ${label}`,
  );
}

function validateSegment(route, start, end, dimensions, segmentIndex) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const steps = Math.max(1, Math.ceil(distance / SAMPLE_DISTANCE));
  const rotation = getRotation(start, end);

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const position = {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    };
    validatePose(route, position, dimensions.width, dimensions.length, rotation, `segment ${segmentIndex}`);
  }
}

function validateTurn(route, previous, current, next, dimensions, waypointIndex) {
  const incoming = getRotation(previous, current);
  const outgoing = getRotation(current, next);
  const difference = normaliseAngle(outgoing - incoming);
  const steps = Math.max(1, Math.ceil(Math.abs(difference) / TURN_ROTATION_STEP));

  for (let step = 0; step <= steps; step += 1) {
    const rotation = incoming + difference * (step / steps);
    validatePose(route, current, dimensions.width, dimensions.length, rotation, `turn ${waypointIndex}`);
  }
}

for (const route of POPULATION_ROUTES) {
  assert.ok(route.points.length >= 2, `${route.id}: route needs at least two points`);
  const dimensions = getLargestVehicle(route);

  for (let index = 0; index < route.points.length - 1; index += 1) {
    validateSegment(route, route.points[index], route.points[index + 1], dimensions, index);
  }

  for (let index = 1; index < route.points.length - 1; index += 1) {
    validateTurn(route, route.points[index - 1], route.points[index], route.points[index + 1], dimensions, index);
  }

  if (route.terminalBus) {
    const stopCount = route.points.filter((point) => point.busStopId).length;
    assert.ok(stopCount >= 10, `${route.id}: terminal bus must visit at least 10 marked stops`);
  }
}

assert.equal(
  POPULATION_ROUTES.filter((route) => route.brt).reduce(
    (total, route) => total + route.loopVehicleCount,
    0,
  ),
  2,
  "Permanent BRT loop traffic must contain exactly two buses",
);
assert.equal(
  POPULATION_ROUTES.filter((route) => route.brt).length,
  2,
  "There must be exactly two BRT routes",
);

console.log(`Vehicle route audit passed: ${POPULATION_ROUTES.length} routes stay on roads and avoid every building, landmark, barrier, and median.`);
