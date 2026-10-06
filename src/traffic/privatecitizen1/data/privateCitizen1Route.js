import { GRID_SIZE } from "../../../world/data/mapConstants.js";

export const PRIVATE_CITIZEN_1_ROUTE_ID =
  "private-citizen-1-world-tour";

const EAST = "east";
const WEST = "west";
const NORTH = "north";
const SOUTH = "south";

function routePoint(
  coordinateColumn,
  coordinateRow,
  direction,
  metadata = {},
) {
  return Object.freeze({
    x: coordinateColumn * GRID_SIZE,
    y: coordinateRow * GRID_SIZE,
    tileColumn: Math.floor(coordinateColumn),
    tileRow: Math.floor(coordinateRow),
    direction,
    noSmooth: true,
    ...metadata,
  });
}

function oneLane(
  tileColumn,
  tileRow,
  direction,
  metadata = {},
) {
  return routePoint(
    tileColumn + 0.5,
    tileRow + 0.5,
    direction,
    {
      laneKind: "one-lane",
      ...metadata,
    },
  );
}

function twoLaneHorizontal(
  tileColumn,
  roadStartRow,
  direction,
  metadata = {},
) {
  const coordinateRow =
    roadStartRow + (direction === EAST ? 1.55 : 0.45);

  return routePoint(
    tileColumn + 0.5,
    coordinateRow,
    direction,
    {
      laneKind: "two-lane-horizontal",
      roadStartRow,
      ...metadata,
    },
  );
}

function twoLaneVertical(
  roadStartColumn,
  tileRow,
  direction,
  metadata = {},
) {
  const coordinateColumn =
    roadStartColumn + (direction === NORTH ? 1.55 : 0.45);

  return routePoint(
    coordinateColumn,
    tileRow + 0.5,
    direction,
    {
      laneKind: "two-lane-vertical",
      roadStartColumn,
      ...metadata,
    },
  );
}

function serviceTile(
  tileColumn,
  tileRow,
  direction,
  metadata = {},
) {
  return oneLane(tileColumn, tileRow, direction, {
    serviceZoneException: true,
    ...metadata,
  });
}

function mergeReservation(
  reserveTileColumn,
  reserveTileRow,
  metadata = {},
) {
  return {
    reserveBeforeMerge: true,
    reserveTileColumn,
    reserveTileRow,
    ...metadata,
  };
}

/*
  PAVED-ROAD AND LANE-VALIDATED PRIVATE CITIZEN 1 WORLD TOUR

  Whole-tile summary shown to the player:

  X3 Y10
  -> Bank X49 Y14
  -> Petrol station X34 Y14
  -> X4 Y25
  -> X4 Y31
  -> Y35 boundary
  -> Car dealership X36 Y15
  -> X3 Y10

  Nigeria drives on the left. On every two-lane road:
  - eastbound uses the lower/southern lane;
  - westbound uses the upper/northern lane;
  - northbound uses the right/eastern lane;
  - southbound uses the left/western lane.

  Dirt roads are forbidden. Every route segment must remain on a paved
  local, main, or highway surface. Points marked reserveBeforeMerge must
  own their destination tile before Private Citizen 1 enters it.
*/
export const PRIVATE_CITIZEN_1_ROUTE = Object.freeze({
  id: PRIVATE_CITIZEN_1_ROUTE_ID,
  spawnId: "private-citizen-1-home",
  originSpawnId: "private-citizen-1-home",
  destinationSpawnId: "private-citizen-1-home",
  flowGroup: "private-citizen-1",
  periodWeights: Object.freeze({}),
  weight: 0,
  rushWeight: 0,
  speedMultiplier: 0.88,
  vehicleTypes: Object.freeze(["private-citizen-1"]),

  permanentLoop: true,
  persistentFleet: true,
  loopVehicleCount: 1,
  loopSpawnIntervalSeconds: 0,
  initialSpawnDelaySeconds: 0,
  minimumSpawnSeparation: GRID_SIZE * 2,
  terminalLayoverMinutes: 0,
  initialLayoverMinutes: 0,
  initialRealTimeWaitSeconds: 10,
  privateCitizen1: true,

  points: Object.freeze([
    // Home loop: use only the existing paved residential streets.
    oneLane(3, 10, EAST),
    oneLane(10, 10, EAST),
    oneLane(10, 14, SOUTH),
    oneLane(3, 14, WEST),
    oneLane(3, 9, NORTH),

    // Join Community Avenue and travel east on the correct eastbound lane.
    twoLaneHorizontal(3, 7, EAST, mergeReservation(3, 8)),
    twoLaneHorizontal(13, 7, EAST),

    // The old route crossed the dirt relief road at X21-X23 Y15.
    // Take the long paved detour instead: remain on Community Avenue,
    // reach Abule Egba Road, then turn south on its proper southbound lane.
    twoLaneHorizontal(24, 7, EAST),
    twoLaneVertical(24, 9, SOUTH, mergeReservation(24, 9)),
    twoLaneVertical(24, 12, SOUTH),

    // Turn east onto Market Commerce and continue into Ikeja LGA.
    twoLaneHorizontal(25, 12, EAST, mergeReservation(25, 13)),
    twoLaneHorizontal(47, 12, EAST),
    twoLaneHorizontal(49, 12, EAST),

    // Stay on the eastbound road until directly above the bank, then turn
    // south into the X49 Y14 parking tile. Do not use X47 Y14.
    serviceTile(49, 14, SOUTH, {
      dwellMinutes: 60,
      stopId: "private-citizen-1-bank",
      reserveBeforeMerge: true,
      reserveTileColumn: 49,
      reserveTileRow: 14,
    }),

    // Leave the bank and join Market Commerce's westbound lane.
    oneLane(49, 14, NORTH),
    routePoint(49.5, 13.5, NORTH, {
      laneKind: "intersection",
    }),
    twoLaneHorizontal(49, 12, WEST, mergeReservation(49, 12)),
    twoLaneHorizontal(47, 12, WEST),
    twoLaneHorizontal(45, 12, WEST),

    // Turn south on Ikeja LGA Spine and use paved Dealership Street.
    twoLaneVertical(45, 13, SOUTH, mergeReservation(45, 13)),
    twoLaneVertical(45, 14, SOUTH),
    oneLane(45, 14, WEST, mergeReservation(45, 14)),

    // Petrol-station stop.
    serviceTile(34, 14, WEST, {
      dwellMinutes: 30,
      stopId: "private-citizen-1-petrol",
    }),

    // Return to Market Commerce using Dealership Access.
    oneLane(35, 14, EAST),
    oneLane(35, 13, NORTH),
    twoLaneHorizontal(35, 12, WEST, mergeReservation(35, 12)),
    twoLaneHorizontal(25, 12, WEST),

    // Travel south through the proper Abule Egba Road/Highway junction.
    twoLaneVertical(24, 13, SOUTH, mergeReservation(24, 13)),
    twoLaneVertical(24, 23, SOUTH),

    // Follow Southern City Avenue west on its correct westbound lane.
    twoLaneHorizontal(24, 23, WEST, mergeReservation(24, 23)),
    twoLaneHorizontal(4, 23, WEST),

    // Required west-estate locations.
    oneLane(4, 25, SOUTH, mergeReservation(4, 25)),
    oneLane(4, 31, SOUTH),

    // Use the paved Southern Cross City Road to reach the boundary access.
    twoLaneHorizontal(4, 31, EAST, mergeReservation(4, 32)),
    twoLaneHorizontal(8, 31, EAST),
    oneLane(8, 33, SOUTH, mergeReservation(8, 33)),

    // Turn around fully inside the final paved boundary-access tile.
    routePoint(8.5, 34.7, SOUTH, {
      laneKind: "one-lane-dead-end",
      displayTileColumn: 8,
      displayTileRow: 35,
    }),
    oneLane(8, 33, NORTH),

    // Rejoin Southern Cross City Road and take the long paved route east.
    twoLaneHorizontal(8, 31, EAST, mergeReservation(8, 32)),
    twoLaneHorizontal(46, 31, EAST),

    // Turn north on Mushin LGA Spine's correct northbound lane.
    twoLaneVertical(46, 31, NORTH, mergeReservation(47, 31)),
    twoLaneVertical(46, 19, NORTH),
    twoLaneVertical(46, 18, NORTH),

    // Cross the highway only through the declared central opening,
    // shifting onto Ikeja LGA Spine's northbound lane inside the junction.
    twoLaneVertical(45, 17, NORTH, mergeReservation(46, 17)),
    twoLaneVertical(45, 14, NORTH),

    // Enter paved Dealership Street and park.
    oneLane(45, 14, WEST, mergeReservation(45, 14)),
    oneLane(36, 14, WEST),
    serviceTile(36, 15, SOUTH, {
      dwellMinutes: 30,
      stopId: "private-citizen-1-dealership",
      reserveBeforeMerge: true,
      reserveTileColumn: 36,
      reserveTileRow: 15,
    }),

    // Leave the dealership and return through paved roads only.
    oneLane(36, 14, NORTH),
    oneLane(35, 14, WEST),
    oneLane(35, 13, NORTH),
    twoLaneHorizontal(35, 12, WEST, mergeReservation(35, 12)),
    twoLaneHorizontal(25, 12, WEST),

    // Northbound Abule Egba Road, then westbound Community Avenue.
    twoLaneVertical(24, 12, NORTH, mergeReservation(25, 12)),
    twoLaneVertical(24, 8, NORTH),
    twoLaneHorizontal(25, 7, WEST, mergeReservation(25, 7)),
    twoLaneHorizontal(3, 7, WEST),

    // Close the loop at the home road.
    oneLane(3, 8, SOUTH, mergeReservation(3, 8)),
    oneLane(3, 10, SOUTH),
  ]),
});
