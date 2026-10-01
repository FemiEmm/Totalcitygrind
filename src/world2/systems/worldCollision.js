import {
  WORLD_HEIGHT,
  WORLD_MAX_X,
  WORLD_MAX_Y,
  WORLD_MIN_X,
  WORLD_MIN_Y,
  WORLD_WIDTH,
  obstacles,
} from "../data/worldMap.js";

const COLLISION_EPSILON = 0.0001;
const OBSTACLE_SPATIAL_CELL_SIZE = 240;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function rectanglesOverlap(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

export function isSolidVehicleShape(value) {
  return (
    Number.isFinite(value?.x) &&
    Number.isFinite(value?.y) &&
    Number.isFinite(value?.width) &&
    Number.isFinite(value?.length) &&
    Number.isFinite(value?.rotation)
  );
}

export function createSolidVehicleShape(
  vehicle,
  position = vehicle,
  padding = 0,
) {
  return {
    x: position.x,
    y: position.y,
    width: vehicle.width + padding * 2,
    length: vehicle.length + padding * 2,
    rotation: position.rotation,
  };
}

export function getSolidVehicleCorners(vehicleShape) {
  const halfWidth = vehicleShape.width / 2;
  const halfLength = vehicleShape.length / 2;
  const cosine = Math.cos(vehicleShape.rotation);
  const sine = Math.sin(vehicleShape.rotation);

  return [
    { x: -halfWidth, y: -halfLength },
    { x: halfWidth, y: -halfLength },
    { x: halfWidth, y: halfLength },
    { x: -halfWidth, y: halfLength },
  ].map((corner) => ({
    x:
      vehicleShape.x +
      corner.x * cosine -
      corner.y * sine,
    y:
      vehicleShape.y +
      corner.x * sine +
      corner.y * cosine,
  }));
}

export function getSolidVehicleBounds(vehicleShape) {
  const corners = getSolidVehicleCorners(vehicleShape);
  const xValues = corners.map((corner) => corner.x);
  const yValues = corners.map((corner) => corner.y);
  const minimumX = Math.min(...xValues);
  const maximumX = Math.max(...xValues);
  const minimumY = Math.min(...yValues);
  const maximumY = Math.max(...yValues);

  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX,
    height: maximumY - minimumY,
  };
}

function getShapeAxes(vehicleShape) {
  const cosine = Math.cos(vehicleShape.rotation);
  const sine = Math.sin(vehicleShape.rotation);

  return [
    { x: cosine, y: sine },
    { x: -sine, y: cosine },
  ];
}

function projectCorners(corners, axis) {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;

  corners.forEach((corner) => {
    const projection = corner.x * axis.x + corner.y * axis.y;
    minimum = Math.min(minimum, projection);
    maximum = Math.max(maximum, projection);
  });

  return { minimum, maximum };
}

function projectionsOverlap(first, second) {
  return !(
    first.maximum <= second.minimum + COLLISION_EPSILON ||
    second.maximum <= first.minimum + COLLISION_EPSILON
  );
}

export function solidVehiclesOverlap(first, second) {
  const firstBounds = getSolidVehicleBounds(first);
  const secondBounds = getSolidVehicleBounds(second);

  if (!rectanglesOverlap(firstBounds, secondBounds)) {
    return false;
  }

  const firstCorners = getSolidVehicleCorners(first);
  const secondCorners = getSolidVehicleCorners(second);
  const axes = [
    ...getShapeAxes(first),
    ...getShapeAxes(second),
  ];

  return axes.every((axis) => {
    return projectionsOverlap(
      projectCorners(firstCorners, axis),
      projectCorners(secondCorners, axis),
    );
  });
}

export function solidVehicleOverlapsRectangle(
  vehicleShape,
  rectangle,
) {
  const rectangleShape = {
    x: rectangle.x + rectangle.width / 2,
    y: rectangle.y + rectangle.height / 2,
    width: rectangle.width,
    length: rectangle.height,
    rotation: 0,
  };

  return solidVehiclesOverlap(vehicleShape, rectangleShape);
}

export function solidVehicleOverlapsCircle(
  vehicleShape,
  circle,
) {
  const circleCentreX = circle.x + circle.width / 2;
  const circleCentreY = circle.y + circle.height / 2;
  const radius = Math.min(circle.width, circle.height) / 2;
  const differenceX = circleCentreX - vehicleShape.x;
  const differenceY = circleCentreY - vehicleShape.y;
  const cosine = Math.cos(vehicleShape.rotation);
  const sine = Math.sin(vehicleShape.rotation);

  const localX =
    differenceX * cosine + differenceY * sine;
  const localY =
    -differenceX * sine + differenceY * cosine;

  const nearestX = clamp(
    localX,
    -vehicleShape.width / 2,
    vehicleShape.width / 2,
  );
  const nearestY = clamp(
    localY,
    -vehicleShape.length / 2,
    vehicleShape.length / 2,
  );
  const separationX = localX - nearestX;
  const separationY = localY - nearestY;

  return (
    separationX * separationX +
      separationY * separationY <
    radius * radius
  );
}

function circleOverlapsRectangle(circle, rectangle) {
  const centreX = circle.x + circle.width / 2;
  const centreY = circle.y + circle.height / 2;
  const radius = Math.min(circle.width, circle.height) / 2;

  const nearestX = Math.max(
    rectangle.x,
    Math.min(centreX, rectangle.x + rectangle.width),
  );

  const nearestY = Math.max(
    rectangle.y,
    Math.min(centreY, rectangle.y + rectangle.height),
  );

  const differenceX = centreX - nearestX;
  const differenceY = centreY - nearestY;

  return (
    differenceX * differenceX +
      differenceY * differenceY <
    radius * radius
  );
}

export function getCollisionAreaBounds(collisionArea) {
  return isSolidVehicleShape(collisionArea)
    ? getSolidVehicleBounds(collisionArea)
    : collisionArea;
}

function getSpatialCellRange(bounds) {
  return {
    minimumColumn: Math.floor(
      bounds.x / OBSTACLE_SPATIAL_CELL_SIZE,
    ),
    maximumColumn: Math.floor(
      (bounds.x + bounds.width) /
        OBSTACLE_SPATIAL_CELL_SIZE,
    ),
    minimumRow: Math.floor(
      bounds.y / OBSTACLE_SPATIAL_CELL_SIZE,
    ),
    maximumRow: Math.floor(
      (bounds.y + bounds.height) /
        OBSTACLE_SPATIAL_CELL_SIZE,
    ),
  };
}

let obstacleSpatialIndex = new Map();

export function rebuildObstacleSpatialIndex() {
  const index = new Map();

  obstacles.forEach((obstacle) => {
    const range = getSpatialCellRange(obstacle);

    for (
      let row = range.minimumRow;
      row <= range.maximumRow;
      row += 1
    ) {
      for (
        let column = range.minimumColumn;
        column <= range.maximumColumn;
        column += 1
      ) {
        const key = `${column}:${row}`;
        const cell = index.get(key) ?? [];
        cell.push(obstacle);
        index.set(key, cell);
      }
    }
  });

  obstacleSpatialIndex = index;
  return obstacleSpatialIndex;
}

rebuildObstacleSpatialIndex();

function getNearbyObstacles(collisionArea) {
  const range = getSpatialCellRange(
    getCollisionAreaBounds(collisionArea),
  );
  const nearby = new Set();

  for (
    let row = range.minimumRow;
    row <= range.maximumRow;
    row += 1
  ) {
    for (
      let column = range.minimumColumn;
      column <= range.maximumColumn;
      column += 1
    ) {
      const cell =
        obstacleSpatialIndex.get(`${column}:${row}`);

      cell?.forEach((obstacle) => {
        nearby.add(obstacle);
      });
    }
  }

  return nearby;
}

export function isOutsideWorld(collisionArea) {
  const bounds = getCollisionAreaBounds(collisionArea);

  return (
    bounds.x < WORLD_MIN_X ||
    bounds.y < WORLD_MIN_Y ||
    bounds.x + bounds.width > WORLD_MAX_X ||
    bounds.y + bounds.height > WORLD_MAX_Y
  );
}

export function findObstacleCollision(collisionArea) {
  const solidVehicle = isSolidVehicleShape(collisionArea);

  for (const obstacle of getNearbyObstacles(collisionArea)) {
    if (!obstacle.blocksVehicles) {
      continue;
    }

    if (solidVehicle) {
      const overlaps = obstacle.shape === "circle"
        ? solidVehicleOverlapsCircle(
            collisionArea,
            obstacle,
          )
        : solidVehicleOverlapsRectangle(
            collisionArea,
            obstacle,
          );

      if (overlaps) {
        return obstacle;
      }
      continue;
    }

    const overlaps = obstacle.shape === "circle"
      ? circleOverlapsRectangle(
          obstacle,
          collisionArea,
        )
      : rectanglesOverlap(collisionArea, obstacle);

    if (overlaps) {
      return obstacle;
    }
  }

  return null;
}

export function getWorldCollision(collisionArea) {
  if (isOutsideWorld(collisionArea)) {
    return {
      type: "world-boundary",
      obstacle: null,
    };
  }

  const obstacle = findObstacleCollision(collisionArea);

  if (obstacle) {
    return {
      type:
        obstacle.shape === "circle"
          ? "circular-obstacle"
          : "obstacle",
      obstacle,
    };
  }

  return null;
}

export function canVehicleOccupy(collisionArea) {
  return getWorldCollision(collisionArea) === null;
}
