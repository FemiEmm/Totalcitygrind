import towTruckSpriteUrl from "../../assets/vehicles/tow-truck.png";
import towYardTileUrl from "../../assets/roads/tow-yard-parking-tile.png";
import { GRID_SIZE } from "../../world/data/mapConstants.js";

function towBase(id, column, row) {
  return Object.freeze({
    id,
    x: (column + 0.5) * GRID_SIZE,
    y: (row + 0.5) * GRID_SIZE,
    width: GRID_SIZE,
    height: GRID_SIZE,
  });
}

// One recovery truck is staged in each district. These are existing road
// tiles; no road or building geometry is changed to accommodate them.
export const TOW_TRUCK_BASES = Object.freeze([
  towBase("tow-base-residential", 9, 10),
  towBase("tow-base-work-hub", 38, 6),
  towBase("tow-base-wealthy", 18, 27),
  towBase("tow-base-nightlife", 49, 27),
]);

export const TOW_TRUCK_ASSETS = Object.freeze({
  truck: towTruckSpriteUrl,
  parkingTile: towYardTileUrl,
});

export const TOW_TRUCK_CONFIG = Object.freeze({
  // Compact wheel-lift truck: the full sprite and collision shape stay
  // inside a single 120px map tile while parked.
  width: 70,
  length: 104,
  speed: 220,
  towingSpeed: 145,
  steeringRadiansPerSecond: 5.5,
  arrivalDistance: 20,
  attachmentDistance: GRID_SIZE * 0.9,
  attachmentGap: 12,
  stalledReportSeconds: 10,
  minimumStalledSpeed: 8,
  occupiedTilePenalty: 7,
  collisionPadding: 5,
  movementBatchDistance: 18,
  maximumPathPointsPerUpdate: 6,
  blockedRepathSeconds: 1.25,
  intersectionHalfSize: GRID_SIZE,
});
