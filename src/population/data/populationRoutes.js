import { PRIVATE_CITIZEN_1_ROUTE } from "../../traffic/privatecitizen1/data/privateCitizen1Route.js";
import { GRID_SIZE } from "../../world/data/mapConstants.js";

import {approachPoints,westInbound,eastInbound,eastOutbound} from '../../world/data/northernApproaches.js';
const EAST = "east";
const WEST = "west";
const NORTH = "north";
const SOUTH = "south";
// Spawn beyond the visible world. The population-only collision allowance
// gives vehicles enough staging space to drive through an edge gate instead
// of visibly appearing on the first map tile.
const EDGE_START = -1;
const EDGE_END_COLUMN = 65;
const EDGE_END_ROW = 37;
const LARGE_VEHICLE_EDGE_START = -1.1;
const LARGE_VEHICLE_EDGE_END_COLUMN = 65.1;
const LARGE_VEHICLE_EDGE_END_ROW = 37.1;

function point(column, row, metadata = {}) {
  return {
    x: column * GRID_SIZE,
    y: row * GRID_SIZE,
    ...metadata,
  };
}

function twoLaneHorizontal(column, roadRow, direction, metadata = {}) {
  return point(
    column,
    roadRow + (direction === EAST ? 1.55 : 0.45),
    { direction, ...metadata },
  );
}

function twoLaneVertical(roadColumn, row, direction, metadata = {}) {
  return point(
    roadColumn + (direction === NORTH ? 1.55 : 0.45),
    row,
    { direction, ...metadata },
  );
}

function fourLaneHighway(
  column,
  direction,
  lane = "slow",
  metadata = {},
) {
  const row = direction === WEST
    ? (lane === "fast" ? 17.5 : 16.5)
    : (lane === "fast" ? 18.5 : 19.5);

  return point(column, row, {
    direction,
    highwayLane: lane,
    ...metadata,
  });
}



function oneLaneVertical(roadColumn, row, direction, metadata = {}) {
  return point(roadColumn + 0.5, row, {
    direction,
    ...metadata,
  });
}

function route(
  id,
  points,
  {
    spawnId,
    destinationSpawnId,
    flowGroup,
    periodWeights,
    weight = 1,
    rushWeight = 1,
    speedMultiplier = 1,
    vehicleTypes = null,
    permanentLoop = false,
    persistentFleet = false,
    loopVehicleCount = 0,
    loopSpawnIntervalSeconds = 0,
    initialSpawnDelaySeconds = 0,
    spawnRetryDelaySeconds = 1,
    initialPointIndex = 0,
    minimumSpawnSeparation = 0,
    terminalLayoverMinutes = 0,
    initialLayoverMinutes = 0,
    brt = false,
  },
) {
  return Object.freeze({
    id,
    spawnId,
    originSpawnId: spawnId,
    destinationSpawnId,
    flowGroup,
    periodWeights: Object.freeze({ ...periodWeights }),
    points: Object.freeze(
      points.map((entry) => Object.freeze(entry)),
    ),
    weight,
    rushWeight,
    speedMultiplier,
    vehicleTypes: vehicleTypes
      ? Object.freeze([...vehicleTypes])
      : null,
    permanentLoop,
    persistentFleet,
    loopVehicleCount,
    loopSpawnIntervalSeconds,
    initialSpawnDelaySeconds,
    spawnRetryDelaySeconds,
    initialPointIndex,
    minimumSpawnSeparation,
    terminalLayoverMinutes,
    initialLayoverMinutes,
    brt,
  });
}

function northAvenuePoints(direction) {
  if (direction === EAST) {
    return [
      twoLaneHorizontal(EDGE_START, 7, EAST),
      twoLaneHorizontal(25, 7, EAST),
      twoLaneHorizontal(46, 7, EAST),
      twoLaneHorizontal(EDGE_END_COLUMN, 7, EAST),
    ];
  }

  return [
    twoLaneHorizontal(EDGE_END_COLUMN, 7, WEST),
    twoLaneHorizontal(46, 7, WEST),
    twoLaneHorizontal(25, 7, WEST),
    twoLaneHorizontal(EDGE_START, 7, WEST),
  ];
}

function southAvenuePoints(direction) {
  if (direction === EAST) {
    return [
      twoLaneHorizontal(EDGE_START, 23, EAST),
      twoLaneHorizontal(25, 23, EAST),
      twoLaneHorizontal(47, 23, EAST),
      twoLaneHorizontal(EDGE_END_COLUMN, 23, EAST),
    ];
  }

  return [
    twoLaneHorizontal(EDGE_END_COLUMN, 23, WEST),
    twoLaneHorizontal(47, 23, WEST),
    twoLaneHorizontal(25, 23, WEST),
    twoLaneHorizontal(EDGE_START, 23, WEST),
  ];
}

const expresswayAllowedVehicles = [
  "private-blue-sedan",
  "private-red-hatch",
  "private-white-suv",
  "private-purple-coupe",
  "private-silver-estate",
  "taxi",
  "danfo",
  "delivery-van",
];

export const POPULATION_ROUTES = Object.freeze([
  PRIVATE_CITIZEN_1_ROUTE,
  route('east-community-to-northwest-edge',[
    twoLaneHorizontal(EDGE_END_COLUMN,7,WEST),twoLaneHorizontal(25.55,7,WEST,{noSmooth:true}),
    ...approachPoints([[25.55,-68.55],[3.55,-68.55],[3.55,-71]])
  ],{spawnId:'east-community-gate',destinationSpawnId:'northwest-woodland-gate',flowGroup:'outer-to-city',periodWeights:{daytime:1,'morning-rush':1,'evening-rush':1},weight:1,speedMultiplier:.88}),
  route(
    "north-clinic-to-west-community",
    [
      ...approachPoints(westInbound),
      oneLaneVertical(18, 6.45, SOUTH),
      point(18.5, 6.95, {
        direction: SOUTH,
        noSmooth: true,
      }),
      point(18.5, 7.5, {
        direction: SOUTH,
        noSmooth: true,
      }),
      point(18.25, 7.55, {
        direction: WEST,
        noSmooth: true,
      }),
      point(17.75, 7.55, {
        direction: WEST,
        noSmooth: true,
      }),
      twoLaneHorizontal(16.8, 7, WEST),
      twoLaneHorizontal(EDGE_START, 7, WEST),
    ],
    {
      spawnId: "north-clinic-gate",
      destinationSpawnId: "west-community-gate",
      flowGroup: "local-residential",
      periodWeights: {
        "overnight": 1.0,
        "dawn": 1.1,
        "morning-rush": 1.0,
        "daytime": 1.2,
        "evening-rush": 1.2,
        "late-night": 0.8
      },
      weight: 1.6,
      rushWeight: 1.3,
      speedMultiplier: 0.88,
    },
  ),
  route(
    "north-estate-to-west-south-avenue",
    [
      ...approachPoints([[2.45,-71],[2.45,-67.45],[24.45,-67.45]]),
      twoLaneVertical(24, -66, SOUTH),
      twoLaneVertical(24, -5, SOUTH),
      twoLaneVertical(24, 5.6, SOUTH),
      twoLaneVertical(24, 8, SOUTH),
      twoLaneVertical(24, 21.6, SOUTH),
      point(24.45, 23.45, {
        direction: WEST,
        noSmooth: true,
      }),
      twoLaneHorizontal(23.2, 23, WEST, {
        noSmooth: true,
      }),
      twoLaneHorizontal(EDGE_START, 23, WEST),
    ],
    {
      spawnId: "north-estate-gate",
      destinationSpawnId: "west-southern-avenue-gate",
      flowGroup: "residential-to-wealthy",
      periodWeights: {
        "overnight": 0.7,
        "dawn": 1.2,
        "morning-rush": 1.5,
        "daytime": 1.1,
        "evening-rush": 1.4,
        "late-night": 0.8
      },
      weight: 2.4,
      rushWeight: 1.8,
      speedMultiplier: 0.94,
    },
  ),
  route(
    "north-office-to-east-community",
    [
      ...approachPoints([...eastInbound,[45.45,-1.55]]),
      twoLaneVertical(45, 5.6, SOUTH),
      twoLaneVertical(45, 8, SOUTH),
      twoLaneHorizontal(46, 7, EAST),
      twoLaneHorizontal(48.6, 7, EAST),
      twoLaneHorizontal(EDGE_END_COLUMN, 7, EAST),
    ],
    {
      spawnId: "north-office-gate",
      destinationSpawnId: "east-community-gate",
      flowGroup: "work-to-outer",
      periodWeights: {
        "overnight": 0.4,
        "dawn": 0.5,
        "morning-rush": 0.7,
        "daytime": 1.1,
        "evening-rush": 3.8,
        "late-night": 1.0
      },
      weight: 2.6,
      rushWeight: 2.2,
      speedMultiplier: 0.96,
    },
  ),
  route(
    "north-highway-to-west-expressway",
    [
      ...approachPoints(eastInbound),
      twoLaneVertical(58, 10.8, SOUTH),
      point(58.45, 15.75, { direction: SOUTH }),
      point(58.35, 16.15),
      fourLaneHighway(57.95, WEST, "slow"),
      fourLaneHighway(52.4, WEST, "slow"),
      fourLaneHighway(EDGE_START, WEST, "slow"),
    ],
    {
      spawnId: "north-highway-gate",
      destinationSpawnId: "west-expressway-gate",
      flowGroup: "outer-to-city",
      periodWeights: {
        "overnight": 0.9,
        "dawn": 1.8,
        "morning-rush": 3.8,
        "daytime": 1.5,
        "evening-rush": 1.5,
        "late-night": 0.9
      },
      weight: 4,
      rushWeight: 2.7,
      speedMultiplier: 1.05,
      vehicleTypes: expresswayAllowedVehicles,
    },
  ),
  route(
    "southwest-estate-gate-to-west",
    [
      oneLaneVertical(8, EDGE_END_ROW, NORTH),
      oneLaneVertical(8, 32.5, NORTH, {
        mergeId: "southwest-estate-to-west-road",
      }),
      twoLaneHorizontal(8.5, 31, WEST),
      twoLaneHorizontal(EDGE_START, 31, WEST),
    ],
    {
      spawnId: "southwest-estate-gate",
      destinationSpawnId: "west-southern-road-gate",
      flowGroup: "wealthy-to-outer",
      periodWeights: {
        "overnight": 0.5,
        "dawn": 1.1,
        "morning-rush": 1.8,
        "daytime": 1.0,
        "evening-rush": 2.4,
        "late-night": 0.8
      },
      weight: 1.5,
      rushWeight: 1.1,
      speedMultiplier: 0.86,
    },
  ),
  route(
    "south-night-gate-to-east",
    [
      twoLaneVertical(39, EDGE_END_ROW, NORTH),
      twoLaneVertical(39, 34.5, NORTH),
      twoLaneVertical(39, 33.5, NORTH),
      twoLaneVertical(39, 32.55, NORTH, {
        mergeId: "south-night-to-east-road",
        allowRightOnRed: true,
        noSmooth: true,
      }),
      twoLaneHorizontal(41, 31, EAST, {
        noSmooth: true,
      }),
      twoLaneHorizontal(42, 31, EAST, {
        noSmooth: true,
      }),
      twoLaneHorizontal(EDGE_END_COLUMN, 31, EAST),
    ],
    {
      spawnId: "south-night-gate",
      destinationSpawnId: "east-southern-road-gate",
      flowGroup: "nightlife-to-outer",
      periodWeights: {
        "overnight": 2.6,
        "dawn": 1.4,
        "morning-rush": 0.5,
        "daytime": 0.7,
        "evening-rush": 1.2,
        "late-night": 3.6
      },
      weight: 1.8,
      rushWeight: 1.3,
      speedMultiplier: 0.9,
    },
  ),
  route(
    "south-highway-to-north",
    [
      twoLaneVertical(58, EDGE_END_ROW, NORTH),
      twoLaneVertical(58, 17.2, NORTH),
      twoLaneVertical(58, 10, NORTH),
      ...approachPoints(eastOutbound),
    ],
    {
      spawnId: "south-highway-gate",
      destinationSpawnId: "north-highway-gate",
      flowGroup: "cross-city-northbound",
      periodWeights: {
        "overnight": 1.0,
        "dawn": 2.0,
        "morning-rush": 4.2,
        "daytime": 1.7,
        "evening-rush": 2.2,
        "late-night": 1.0
      },
      weight: 5,
      rushWeight: 2.8,
      speedMultiplier: 1.08,
      vehicleTypes: expresswayAllowedVehicles,
    },
  ),
  route(
    "west-community-to-east",
    northAvenuePoints(EAST),
    {
      spawnId: "west-community-gate",
      destinationSpawnId: "east-community-gate",
      flowGroup: "residential-to-work",
      periodWeights: {
        "overnight": 0.5,
        "dawn": 2.4,
        "morning-rush": 5.0,
        "daytime": 1.7,
        "evening-rush": 0.8,
        "late-night": 0.5
      },
      weight: 4,
      rushWeight: 2.4,
      speedMultiplier: 1,
    },
  ),
  route(
    "west-expressway-to-east",
    [
      fourLaneHighway(EDGE_START, EAST, "fast"),
      fourLaneHighway(52.6, EAST, "fast"),
      fourLaneHighway(59.6, EAST, "fast"),
      fourLaneHighway(EDGE_END_COLUMN, EAST, "fast"),
    ],
    {
      spawnId: "west-expressway-gate",
      destinationSpawnId: "east-expressway-gate",
      flowGroup: "outer-to-work",
      periodWeights: {
        "overnight": 0.8,
        "dawn": 2.2,
        "morning-rush": 4.8,
        "daytime": 1.8,
        "evening-rush": 1.0,
        "late-night": 0.7
      },
      weight: 7,
      rushWeight: 2.8,
      speedMultiplier: 1.55,
      vehicleTypes: expresswayAllowedVehicles,
    },
  ),
  route(
    "west-southern-avenue-to-east",
    southAvenuePoints(EAST),
    {
      spawnId: "west-southern-avenue-gate",
      destinationSpawnId: "east-nightlife-gate",
      flowGroup: "wealthy-to-nightlife",
      periodWeights: {
        "overnight": 1.4,
        "dawn": 0.7,
        "morning-rush": 0.8,
        "daytime": 1.2,
        "evening-rush": 3.4,
        "late-night": 2.3
      },
      weight: 3,
      rushWeight: 2,
      speedMultiplier: 0.96,
    },
  ),
  route(
    "west-southern-road-to-east",
    [
      twoLaneHorizontal(EDGE_START, 31, EAST),
      twoLaneHorizontal(EDGE_END_COLUMN, 31, EAST),
    ],
    {
      spawnId: "west-southern-road-gate",
      destinationSpawnId: "east-southern-road-gate",
      flowGroup: "cross-city-eastbound",
      periodWeights: {
        "overnight": 0.8,
        "dawn": 1.2,
        "morning-rush": 1.8,
        "daytime": 1.4,
        "evening-rush": 2.0,
        "late-night": 1.0
      },
      weight: 2.4,
      rushWeight: 1.5,
      speedMultiplier: 0.94,
    },
  ),
  route(
    "east-community-to-west",
    northAvenuePoints(WEST),
    {
      spawnId: "east-community-gate",
      destinationSpawnId: "west-community-gate",
      flowGroup: "work-to-residential",
      periodWeights: {
        "overnight": 0.5,
        "dawn": 0.5,
        "morning-rush": 0.7,
        "daytime": 1.5,
        "evening-rush": 5.0,
        "late-night": 1.0
      },
      weight: 4,
      rushWeight: 2.4,
      speedMultiplier: 1,
    },
  ),
  route(
    "east-expressway-to-west",
    [
      fourLaneHighway(EDGE_END_COLUMN, WEST, "fast"),
      fourLaneHighway(59.4, WEST, "fast"),
      fourLaneHighway(52.4, WEST, "fast"),
      fourLaneHighway(EDGE_START, WEST, "fast"),
    ],
    {
      spawnId: "east-expressway-gate",
      destinationSpawnId: "west-expressway-gate",
      flowGroup: "work-to-outer",
      periodWeights: {
        "overnight": 0.8,
        "dawn": 0.7,
        "morning-rush": 0.8,
        "daytime": 1.5,
        "evening-rush": 4.6,
        "late-night": 1.0
      },
      weight: 7,
      rushWeight: 2.8,
      speedMultiplier: 1.55,
      vehicleTypes: expresswayAllowedVehicles,
    },
  ),
  route(
    "east-nightlife-to-west",
    southAvenuePoints(WEST),
    {
      spawnId: "east-nightlife-gate",
      destinationSpawnId: "west-southern-avenue-gate",
      flowGroup: "nightlife-to-wealthy",
      periodWeights: {
        "overnight": 3.0,
        "dawn": 1.8,
        "morning-rush": 0.5,
        "daytime": 0.8,
        "evening-rush": 1.4,
        "late-night": 4.0
      },
      weight: 3,
      rushWeight: 2,
      speedMultiplier: 0.96,
    },
  ),
  route(
    "east-southern-road-to-west",
    [
      twoLaneHorizontal(EDGE_END_COLUMN, 31, WEST),
      twoLaneHorizontal(EDGE_START, 31, WEST),
    ],
    {
      spawnId: "east-southern-road-gate",
      destinationSpawnId: "west-southern-road-gate",
      flowGroup: "cross-city-westbound",
      periodWeights: {
        "overnight": 1.0,
        "dawn": 0.9,
        "morning-rush": 1.1,
        "daytime": 1.4,
        "evening-rush": 2.4,
        "late-night": 1.8
      },
      weight: 2.4,
      rushWeight: 1.5,
      speedMultiplier: 0.94,
    },
  ),
  route(
    "freight-north-highway-to-east-expressway",
    [
      ...approachPoints(eastInbound),
      point(58.45, 18.6, { direction: SOUTH }),
      point(58.7, 19.15, { direction: SOUTH }),
      fourLaneHighway(59.15, EAST, "slow"),
      fourLaneHighway(EDGE_END_COLUMN, EAST, "slow"),
    ],
    {
      spawnId: "north-highway-gate",
      destinationSpawnId: "east-expressway-gate",
      flowGroup: "freight",
      periodWeights: {},
      weight: 0,
      rushWeight: 0,
      speedMultiplier: 0.95,
      vehicleTypes: ["petrol-truck"],
      persistentFleet: true,
      loopVehicleCount: 3,
      loopSpawnIntervalSeconds: 24,
      initialSpawnDelaySeconds: 3,
      minimumSpawnSeparation: GRID_SIZE * 12,
    },
  ),
  route(
    "freight-east-expressway-to-south-highway",
    [
      fourLaneHighway(LARGE_VEHICLE_EDGE_END_COLUMN, WEST, "slow"),
      fourLaneHighway(59.2, WEST, "slow"),
      point(58.75, 16.8, { direction: WEST }),
      point(58.45, 17.3, { direction: SOUTH }),
      point(58.45, 20.4, { direction: SOUTH }),
      point(58.45, EDGE_END_ROW, { direction: SOUTH }),
    ],
    {
      spawnId: "east-expressway-gate",
      destinationSpawnId: "south-highway-gate",
      flowGroup: "freight",
      periodWeights: {},
      weight: 0,
      rushWeight: 0,
      speedMultiplier: 0.97,
      vehicleTypes: ["cargo-truck"],
      persistentFleet: true,
      loopVehicleCount: 3,
      loopSpawnIntervalSeconds: 28,
      initialSpawnDelaySeconds: 12,
      minimumSpawnSeparation: GRID_SIZE * 12,
    },
  ),
  route(
    "freight-west-expressway-to-north-highway",
    [
      fourLaneHighway(LARGE_VEHICLE_EDGE_START, EAST, "slow"),
      fourLaneHighway(58.9, EAST, "slow"),
      point(59.35, 19.2, { direction: EAST }),
      point(59.55, 18.7, { direction: NORTH }),
      point(59.55, 15.5, { direction: NORTH }),
      ...approachPoints(eastOutbound),
    ],
    {
      spawnId: "west-expressway-gate",
      destinationSpawnId: "north-highway-gate",
      flowGroup: "freight",
      periodWeights: {},
      weight: 0,
      rushWeight: 0,
      speedMultiplier: 0.96,
      vehicleTypes: ["petrol-truck"],
      persistentFleet: true,
      loopVehicleCount: 2,
      loopSpawnIntervalSeconds: 32,
      initialSpawnDelaySeconds: 23,
      minimumSpawnSeparation: GRID_SIZE * 12,
    },
  ),
  route(
    "freight-south-highway-to-west-expressway",
    [
      point(59.55, LARGE_VEHICLE_EDGE_END_ROW, { direction: NORTH }),
      point(59.55, 17.4, { direction: NORTH }),
      point(59.25, 16.8, { direction: NORTH }),
      fourLaneHighway(58.7, WEST, "slow"),
      fourLaneHighway(EDGE_START, WEST, "slow"),
    ],
    {
      spawnId: "south-highway-gate",
      destinationSpawnId: "west-expressway-gate",
      flowGroup: "freight",
      periodWeights: {},
      weight: 0,
      rushWeight: 0,
      speedMultiplier: 0.98,
      vehicleTypes: ["cargo-truck"],
      persistentFleet: true,
      loopVehicleCount: 2,
      loopSpawnIntervalSeconds: 36,
      initialSpawnDelaySeconds: 34,
      minimumSpawnSeparation: GRID_SIZE * 12,
    },
  ),
  route(
    "brt-1-clockwise-city-loop",
    [
      // Terminal circulation is one-way: depart through the west access,
      // complete the city loop, then return through the east entrance.
      point(37.5, 3.5, { direction: WEST }),
      point(35.5, 3.5, { direction: WEST, noSmooth: true }),
      point(35.5, 8.55, { direction: SOUTH }),
      point(58.45, 8.55, { direction: EAST, noSmooth: true }),
      point(58.45, 16.45, { direction: SOUTH, noSmooth: true }),
      point(26.2, 16.5, { direction: WEST }),
      point(25.8, 16.3, { direction: WEST }),
      point(25.55, 15.9, { direction: NORTH }),
      point(25.55, 8.55, { direction: NORTH, noSmooth: true }),
      point(42.5, 8.55, { direction: EAST, noSmooth: true }),
      point(42.5, 3.5, { direction: NORTH, noSmooth: true }),
      point(37.5, 3.5, { direction: WEST, noSmooth: true }),
    ],
    {
      spawnId: "central-bus-terminal-brt-1",
      destinationSpawnId: "central-bus-terminal-brt-1",
      flowGroup: "brt",
      periodWeights: {},
      weight: 0,
      rushWeight: 0,
      speedMultiplier: 0.78,
      vehicleTypes: ["brt"],
      permanentLoop: true,
      loopVehicleCount: 1,
      terminalLayoverMinutes: 30,
      initialPointIndex: 5,
      minimumSpawnSeparation: GRID_SIZE * 6,
      spawnRetryDelaySeconds: 2.5,
      brt: true,
    },
  ),
  route(
    "brt-2-counterclockwise-city-loop",
    [
      // Use the same one-way terminal circulation as BRT 1: west is the
      // shared exit and east is the shared entrance.
      point(40.5, 3.5, { direction: WEST }),
      point(35.5, 3.5, { direction: WEST, noSmooth: true }),
      point(35.5, 7.45, { direction: SOUTH }),
      point(24.45, 7.45, { direction: WEST, noSmooth: true }),
      point(24.45, 19.5, { direction: SOUTH, noSmooth: true }),
      fourLaneHighway(58.4, EAST, "slow"),
      point(59, 19.35, { direction: EAST }),
      point(59.45, 18.9, { direction: NORTH }),
      point(59.55, 18.2, { direction: NORTH }),
      point(59.55, 7.45, { direction: NORTH, noSmooth: true }),
      point(42.5, 7.45, { direction: WEST, noSmooth: true }),
      point(42.5, 3.5, { direction: NORTH, noSmooth: true }),
      point(40.5, 3.5, { direction: WEST, noSmooth: true }),
    ],
    {
      spawnId: "central-bus-terminal-brt-2",
      destinationSpawnId: "central-bus-terminal-brt-2",
      flowGroup: "brt",
      periodWeights: {},
      weight: 0,
      rushWeight: 0,
      speedMultiplier: 0.76,
      vehicleTypes: ["brt"],
      permanentLoop: true,
      loopVehicleCount: 1,
      terminalLayoverMinutes: 30,
      initialLayoverMinutes: 5,
      initialPointIndex: 5,
      minimumSpawnSeparation: GRID_SIZE * 6,
      spawnRetryDelaySeconds: 2.5,
      brt: true,
    },
  ),
]);

export const POPULATION_SPAWN_POINTS = Object.freeze(
  POPULATION_ROUTES.filter((populationRoute) => !populationRoute.permanentLoop).map((populationRoute) => {
    const start = populationRoute.points[0];

    return Object.freeze({
      id: populationRoute.spawnId,
      routeId: populationRoute.id,
      x: start.x,
      y: start.y,
    });
  }),
);







