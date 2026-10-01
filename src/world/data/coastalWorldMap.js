import {
  GRID_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  GROUND_COLOUR,
  gridRect,
} from "./mapConstants.js";
import { LANDMARK_ASSETS } from "./landmarkAssets.js";

const road = (id, column, row, columns, rows, type = "local") => ({
  id,
  ...gridRect(column, row, columns, rows),
  type,
  districtId: "coastal-city",
});

const landmark = (id, label, column, row, columns, rows, spriteKey) => {
  const bounds = gridRect(column, row, columns, rows);
  return {
    id,
    label,
    ...bounds,
    lotX: bounds.x,
    lotY: bounds.y,
    lotWidth: bounds.width,
    lotHeight: bounds.height,
    pedestrianSetback: 8,
    blocksVehicles: true,
    isLandmark: true,
    spriteUrl: LANDMARK_ASSETS[spriteKey] ?? null,
    districtId: "coastal-city",
  };
};

const building = (id, column, row, columns = 2, rows = 2) => {
  const bounds = gridRect(column, row, columns, rows);
  return {
    id,
    ...bounds,
    lotX: bounds.x,
    lotY: bounds.y,
    lotWidth: bounds.width,
    lotHeight: bounds.height,
    pedestrianSetback: 8,
    blocksVehicles: true,
    isLandmark: false,
    fill: "#b7aa91",
    roof: "#536879",
    districtId: "coastal-city",
  };
};

const roads = [
  road("coastal-highway", 0, 16, 58, 4, "highway"),
  road("upper-coastal-avenue", 0, 6, 58, 2, "main"),
  road("lower-coastal-avenue", 0, 27, 58, 2, "main"),
  road("coast-highway", 54, 0, 4, 36, "highway"),
  road("west-spine", 4, 0, 2, 36, "main"),
  road("upper-bridge", 18, 5, 2, 24, "bridge"),
  road("lower-bridge", 43, 5, 2, 24, "bridge"),
  road("upper-district-link", 5, 11, 13, 1),
  road("upper-district-link-east", 20, 11, 23, 1),
  road("lower-district-link", 5, 24, 13, 1),
  road("lower-district-link-east", 20, 24, 23, 1),
  road("circuit-north", 26, 2, 20, 2, "circuit"),
  road("circuit-south", 26, 11, 20, 2, "circuit"),
  road("circuit-west", 26, 2, 2, 11, "circuit"),
  road("circuit-east", 44, 2, 2, 11, "circuit"),
  road("marina-access", 48, 7, 2, 21, "main"),
  road("west-highway-exit-north", 4, 14, 8, 2, "main"),
  road("west-highway-exit-south", 4, 20, 8, 2, "main"),
  road("coast-highway-exit-north", 48, 14, 8, 2, "main"),
  road("coast-highway-exit-south", 48, 20, 8, 2, "main"),
];

const barriers = [
  {
    id: "coastal-highway-median-west",
    ...gridRect(0, 17.95, 18, 0.1),
    blocksVehicles: true,
    districtId: "coastal-city",
  },
  {
    id: "coastal-highway-median-centre",
    ...gridRect(20, 17.95, 23, 0.1),
    blocksVehicles: true,
    districtId: "coastal-city",
  },
  {
    id: "coastal-highway-median-east",
    ...gridRect(45, 17.95, 13, 0.1),
    blocksVehicles: true,
    districtId: "coastal-city",
  },
  ...Array.from({ length: 36 }, (_, index) => ({
    id: `ocean-${index}`,
    ...gridRect(58, index, 6, 1),
    colour: "#1978a5",
    blocksVehicles: true,
    districtId: "coastal-ocean",
  })),
];

const landmarks = [
  landmark("coastal-gateway", "COASTAL GATEWAY", 1, 2, 3, 2, "luxury-hotel"),
  landmark("coastal-race-centre", "LAGOS RACE CIRCUIT", 33, 6, 5, 3, "event-centre"),
  landmark("coastal-office", "MARINA OFFICE", 49, 3, 3, 2, "office-hub"),
  landmark("coastal-hotel", "OCEAN HOTEL", 49, 23, 3, 2, "luxury-hotel"),
  landmark("coastal-market", "COAST MARKET", 8, 22, 3, 2, "central-market"),
  landmark("coastal-clinic", "COASTAL CLINIC", 8, 9, 3, 2, "private-hospital"),
  landmark("coastal-petrol", "PETROL STATION", 50, 13, 3, 2, "wealthy-petrol-station"),
];

const buildings = [
  ...landmarks,
  building("coast-upper-01", 8, 2),
  building("coast-upper-02", 12, 2),
  building("coast-upper-03", 20, 2),
  building("coast-upper-04", 22, 9),
  building("coast-upper-05", 14, 9),
  building("coast-lower-01", 8, 30),
  building("coast-lower-02", 12, 30),
  building("coast-lower-03", 20, 30),
  building("coast-lower-04", 24, 22),
  building("coast-lower-05", 30, 30),
  building("coast-lower-06", 36, 30),
  building("coast-lower-07", 46, 30),
];

const mapTravelZones = [
  {
    id: "coastal-return-zone",
    label: "RETURN TO MAINLAND",
    ...gridRect(3, 4, 1, 1),
    districtId: "coastal-city",
  },
];
const raceZones = [
  {
    id: "coastal-circuit-start",
    label: "ENTER TIME TRIAL",
    ...gridRect(27, 2, 1, 2),
    districtId: "coastal-city",
  },
];

const playerStart = {
  x: 3.5 * GRID_SIZE,
  y: 5.5 * GRID_SIZE,
  rotation: Math.PI,
};

export const COASTAL_MAP_DATA = Object.freeze({
  id: "coastal-city",
  name: "Coastal City",
  districts: [
    {
      id: "coastal-city",
      name: "Coastal City",
      worldX: 0,
      worldY: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      ground: GROUND_COLOUR,
    },
    {
      id: "coastal-ocean",
      name: "Atlantic Ocean",
      worldX: 58 * GRID_SIZE,
      worldY: 0,
      width: 6 * GRID_SIZE,
      height: WORLD_HEIGHT,
      ground: "#1978a5",
    },
  ],
  roads,
  barriers,
  landmarks,
  buildings,
  obstacles: [...buildings, ...barriers],
  busStops: [],
  fuelPumps: [],
  repairZones: [],
  bankParkingZones: [],
  dealershipParkingZones: [],
  estateAgencyParkingZones: [],
  businessOfficeParkingZones: [],
  homeParkingZones: [],
  healthParkingZones: [],
  foodParkingZones: [],
  mapTravelZones,
  raceZones,
  playerStart,
});

const trafficPoint = (column, row, direction) => ({
  x: column * GRID_SIZE,
  y: row * GRID_SIZE,
  direction,
});

const loopRoute = (id, points, count, speedMultiplier = 1) =>
  Object.freeze({
    id,
    spawnId: `${id}-spawn`,
    destinationSpawnId: `${id}-spawn`,
    flowGroup: "coastal",
    periodWeights: {},
    weight: 0,
    rushWeight: 0,
    speedMultiplier,
    vehicleTypes: null,
    permanentLoop: true,
    persistentFleet: true,
    loopVehicleCount: count,
    loopSpawnIntervalSeconds: 1.5,
    initialSpawnDelaySeconds: 0,
    spawnRetryDelaySeconds: 1.5,
    initialPointIndex: 0,
    minimumSpawnSeparation: GRID_SIZE * 2,
    terminalLayoverMinutes: 0,
    initialLayoverMinutes: 0,
    brt: false,
    points: Object.freeze(points),
  });

export const COASTAL_POPULATION_ROUTES = Object.freeze([
  loopRoute(
    "coastal-highway-loop",
    [
      trafficPoint(3, 18.5, "east"),
      trafficPoint(52, 18.5, "east"),
      trafficPoint(52, 19.5, "west"),
      trafficPoint(3, 19.5, "west"),
    ],
    9,
    1.15,
  ),
  loopRoute(
    "coastal-bridge-city-loop",
    [
      trafficPoint(18.5, 7, "south"),
      trafficPoint(18.5, 27.5, "south"),
      trafficPoint(43.5, 27.5, "east"),
      trafficPoint(43.5, 7, "north"),
    ],
    6,
    0.88,
  ),
  loopRoute(
    "coast-road-loop",
    [
      trafficPoint(55, 4, "south"),
      trafficPoint(55, 31, "south"),
      trafficPoint(56.5, 31, "north"),
      trafficPoint(56.5, 4, "north"),
    ],
    5,
    1,
  ),
]);
