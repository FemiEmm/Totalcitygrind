import { UPPER_DISTRICT } from "./upperDistrict.js";
import { LOWER_DISTRICT } from "./lowerDistrict.js";
import { COASTAL_DISTRICT } from "./coastalDistrict.js";
import {
  GRID_SIZE,
  WORLD_EDGE_COLOUR,
  gridRect,
} from "./mapConstants.js";
import compactPetrolStationUrl from "../../assets/buildings/compact-petrol-station.png";
import mechanicUrl from "../../assets/buildings/mechanic.png";

export const WORLD2_WIDTH = 64 * GRID_SIZE;
export const WORLD2_HEIGHT = 36 * GRID_SIZE;

const road = (
  id,
  column,
  row,
  columns,
  rows,
  kind = "neighbourhood",
  name = id,
) => ({
  id,
  name,
  ...gridRect(column, row, columns, rows),
  kind,
  tileColumn: column,
  tileRow: row,
  tileWidth: columns,
  tileHeight: rows,
});

const upperNeighbourhoodRows = [3, 12];
const lowerNeighbourhoodRows = [24, 33];
const neighbourhoodColumns = [
  8, 25, 35, 52,
];
const horizontalStreetNames = Object.freeze({
  3: "Kensington Row",
  12: "Palm Court Avenue",
  24: "Admiralty Crescent",
  33: "Gold Coast Boulevard",
});
const upperVerticalStreetNames = Object.freeze({
  8: "Regency Lane",
  25: "Eko Pearl Street",
  35: "Cedar Court",
  52: "Kingsley Avenue",
});
const lowerVerticalStreetNames = Object.freeze({
  8: "Regency South",
  25: "Eko Pearl South",
  35: "Cedar South",
  52: "Kingsley South",
});

export const WORLD2_ROADS = Object.freeze([
  road(
    "central-four-lane-highway",
    0,
    16,
    64,
    4,
    "highway",
    "Atlantic Crown Expressway",
  ),
  road(
    "upper-major-road",
    0,
    6,
    64,
    2,
    "main",
    "Victoria Grand Avenue",
  ),
  road(
    "lower-major-road",
    0,
    26,
    64,
    2,
    "main",
    "Marina Royal Boulevard",
  ),
  road(
    "upper-coast-road",
    58,
    0,
    2,
    16,
    "main",
    "Coral Vista Drive",
  ),
  road(
    "lower-coast-road",
    58,
    20,
    2,
    16,
    "main",
    "Azure Promenade",
  ),
  road("coast-city-fuel-access", 29, 5, 1, 1, "local", "Fuel Station Parking"),
  road("coast-city-mechanic-access", 39, 28, 1, 1, "local", "Mechanic Parking"),
  ...upperNeighbourhoodRows.map((row) =>
    road(
      `upper-neighbourhood-row-${row}`,
      0,
      row,
      64,
      1,
      "neighbourhood",
      horizontalStreetNames[row],
    ),
  ),
  ...lowerNeighbourhoodRows.map((row) =>
    road(
      `lower-neighbourhood-row-${row}`,
      0,
      row,
      64,
      1,
      "neighbourhood",
      horizontalStreetNames[row],
    ),
  ),
  ...neighbourhoodColumns.flatMap((column) => [
    road(
      `upper-neighbourhood-column-${column}`,
      column,
      0,
      1,
      16,
      "neighbourhood",
      upperVerticalStreetNames[column],
    ),
    road(
      `lower-neighbourhood-column-${column}`,
      column,
      20,
      1,
      column <= 22 ? 14 : 16,
      "neighbourhood",
      lowerVerticalStreetNames[column],
    ),
  ]),
]);

const trafficSpawnPoint = (
  id,
  column,
  row,
  direction,
  roadId,
) => Object.freeze({
  id,
  x: column * GRID_SIZE,
  y: row * GRID_SIZE,
  direction,
  roadId,
});

export const WORLD2_TRAFFIC_SPAWN_POINTS = Object.freeze([
  trafficSpawnPoint("crown-eastbound-west-slow", 0.5, 19.5, "east", "central-four-lane-highway"),
  trafficSpawnPoint("crown-eastbound-west-fast", 0.5, 18.5, "east", "central-four-lane-highway"),
  trafficSpawnPoint("crown-westbound-east-slow", 63.5, 16.5, "west", "central-four-lane-highway"),
  trafficSpawnPoint("crown-westbound-east-fast", 63.5, 17.5, "west", "central-four-lane-highway"),
  trafficSpawnPoint("victoria-west-gate", 0.5, 6.5, "east", "upper-major-road"),
  trafficSpawnPoint("victoria-east-gate", 63.5, 7.5, "west", "upper-major-road"),
  trafficSpawnPoint("marina-west-gate", 0.5, 27.5, "east", "lower-major-road"),
  trafficSpawnPoint("marina-east-gate", 63.5, 26.5, "west", "lower-major-road"),
  trafficSpawnPoint("kensington-west-edge", 0.5, 3.5, "east", "upper-neighbourhood-row-3"),
  trafficSpawnPoint("kensington-east-edge", 63.5, 3.5, "west", "upper-neighbourhood-row-3"),
  trafficSpawnPoint("palm-west-gate", 0.5, 12.5, "east", "upper-neighbourhood-row-12"),
  trafficSpawnPoint("palm-east-edge", 63.5, 12.5, "west", "upper-neighbourhood-row-12"),
  trafficSpawnPoint("admiralty-west-edge", 0.5, 24.5, "east", "lower-neighbourhood-row-24"),
  trafficSpawnPoint("admiralty-east-edge", 63.5, 24.5, "west", "lower-neighbourhood-row-24"),
  trafficSpawnPoint("gold-coast-west-edge", 0.5, 33.5, "east", "lower-neighbourhood-row-33"),
  trafficSpawnPoint("gold-coast-east-edge", 63.5, 33.5, "west", "lower-neighbourhood-row-33"),
  trafficSpawnPoint("regency-north-gate", 8.5, 0.5, "south", "upper-neighbourhood-column-8"),
  trafficSpawnPoint("pearl-north-gate", 25.5, 0.5, "south", "upper-neighbourhood-column-25"),
  trafficSpawnPoint("coral-north-gate", 58.5, 0.5, "south", "upper-coast-road"),
  trafficSpawnPoint("cedar-south-gate", 35.5, 35.5, "north", "lower-neighbourhood-column-35"),
  trafficSpawnPoint("kingsley-south-gate", 52.5, 35.5, "north", "lower-neighbourhood-column-52"),
  trafficSpawnPoint("azure-south-gate", 58.5, 35.5, "north", "lower-coast-road"),
]);

const highwayBusStop = (
  id,
  label,
  column,
  row,
  side,
) => Object.freeze({
  id,
  label,
  ...gridRect(column, row, 1, 1),
  routes: Object.freeze(["CROWN"]),
  corridorId: "central-four-lane-highway",
  side,
  districtId:
    side === "north"
      ? "upper-district"
      : "lower-district",
});

const neighbourhoodBusStop = (
  id,
  label,
  column,
  row,
  corridorId,
  districtId,
  routes,
) => Object.freeze({
  id,
  label,
  ...gridRect(column, row, 1, 1),
  routes: Object.freeze(routes),
  corridorId,
  side: "roadside",
  districtId,
});

export const WORLD2_BUS_STOPS = Object.freeze([
  highwayBusStop("crown-north-regency", "Regency North", 10, 15, "north"),
  highwayBusStop("crown-north-eko-pearl", "Eko Pearl North", 27, 15, "north"),
  highwayBusStop("crown-north-cedar", "Cedar Court North", 39, 15, "north"),
  highwayBusStop("crown-north-kingsley", "Kingsley North", 54, 15, "north"),
  highwayBusStop("crown-south-regency", "Regency South", 10, 20, "south"),
  highwayBusStop("crown-south-eko-pearl", "Eko Pearl South", 27, 20, "south"),
  highwayBusStop("crown-south-cedar", "Cedar Court South", 39, 20, "south"),
  highwayBusStop("crown-south-kingsley", "Kingsley South", 54, 20, "south"),
  neighbourhoodBusStop(
    "kensington-west",
    "Kensington West",
    12,
    2,
    "upper-neighbourhood-row-3",
    "upper-district",
    ["CC-D6"],
  ),
  neighbourhoodBusStop(
    "kensington-east",
    "Kensington East",
    44,
    2,
    "upper-neighbourhood-row-3",
    "upper-district",
    ["CC-D6"],
  ),
  neighbourhoodBusStop(
    "palm-court-west",
    "Palm Court West",
    15,
    13,
    "upper-neighbourhood-row-12",
    "upper-district",
    ["CC-D7"],
  ),
  neighbourhoodBusStop(
    "palm-court-east",
    "Palm Court East",
    44,
    13,
    "upper-neighbourhood-row-12",
    "upper-district",
    ["CC-D7"],
  ),
  neighbourhoodBusStop(
    "admiralty-west",
    "Admiralty West",
    15,
    23,
    "lower-neighbourhood-row-24",
    "lower-district",
    ["CC-D8"],
  ),
  neighbourhoodBusStop(
    "admiralty-east",
    "Admiralty East",
    44,
    23,
    "lower-neighbourhood-row-24",
    "lower-district",
    ["CC-D8"],
  ),
  neighbourhoodBusStop(
    "gold-coast-central",
    "Gold Coast Central",
    30,
    34,
    "lower-neighbourhood-row-33",
    "lower-district",
    ["CC-D9"],
  ),
  neighbourhoodBusStop(
    "gold-coast-east",
    "Gold Coast East",
    48,
    34,
    "lower-neighbourhood-row-33",
    "lower-district",
    ["CC-D9"],
  ),
  neighbourhoodBusStop(
    "coast-city-beach",
    "Coast City Beach",
    11,
    34,
    "lower-neighbourhood-row-33",
    "waterfront-district",
    ["CC-D9"],
  ),
]);

export const WORLD2_DISTRICTS = Object.freeze([
  UPPER_DISTRICT,
  LOWER_DISTRICT,
  COASTAL_DISTRICT,
]);

const WORLD2_SERVICE_BUILDING_IDS = new Set([
  "upper-home-4-26",
  "upper-home-4-28",
  "lower-home-28-36",
  "lower-home-28-38",
]);

const WORLD2_SERVICE_LANDMARKS = Object.freeze([
  {
    id: "coast-city-petrol-station",
    label: "PETROL STATION",
    type: "service",
    ...gridRect(26, 4, 3, 2),
    services: ["fuel"],
    spriteUrl: compactPetrolStationUrl,
    isLandmark: true,
    blocksVehicles: true,
  },
  {
    id: "coast-city-mechanic",
    label: "MECHANIC",
    type: "service",
    ...gridRect(36, 28, 3, 2),
    services: ["repair"],
    spriteUrl: mechanicUrl,
    isLandmark: true,
    blocksVehicles: true,
  },
]);

export const WORLD2_BUILDINGS = [
  ...WORLD2_DISTRICTS
  .flatMap((district) => district.buildings)
  .filter((entry) => !WORLD2_SERVICE_BUILDING_IDS.has(entry.id))
  .map((entry) => ({
    ...entry,
    lotX: entry.x,
    lotY: entry.y,
    lotWidth: entry.width,
    lotHeight: entry.height,
    pedestrianSetback: 12,
    spriteInset: entry.type === "residence" ? 12 : 0,
    blocksVehicles: true,
    isLandmark: false,
    districtId:
      entry.y < 16 * GRID_SIZE
        ? "upper-district"
        : entry.x >= 60 * GRID_SIZE
          ? "coastal-strip"
          : "lower-district",
  })),
  ...WORLD2_SERVICE_LANDMARKS.map((entry) => ({
    ...entry,
    lotX: entry.x,
    lotY: entry.y,
    lotWidth: entry.width,
    lotHeight: entry.height,
    pedestrianSetback: 0,
    spriteInset: 0,
    districtId: entry.y < 16 * GRID_SIZE ? "upper-district" : "lower-district",
  })),
];

export const WORLD2_OBSTACLES = Object.freeze(
  WORLD2_BUILDINGS.map(({ id, x, y, width, height }) => ({
    id, x, y, width, height,
  })),
);

// Coast City traffic is driven by world2/data/populationRoutes.js.
// This legacy route collection remains empty so a second traffic system is not created.
export const WORLD2_TRAFFIC_ROUTES = Object.freeze([]);
export const WORLD2_TRAFFIC_LIGHTS = Object.freeze([]);

export const WORLD2_PLAYER_START = Object.freeze({
  x: 0.5 * GRID_SIZE,
  y: 19.5 * GRID_SIZE,
  rotation: Math.PI / 2,
});

export const WORLD2_RETURN_ZONE = Object.freeze({
  ...gridRect(0, 16, 1, 4),
});

export const WORLD2_RACE_ZONE = null;
export const beachTiles = [
  {
    id: "southwest-beach-west",
    ...gridRect(0, 34, 9, 1),
    surface: "beach",
    blocksVehicles: true,
  },
  {
    id: "southwest-beach-east",
    ...gridRect(13, 34, 10, 1),
    surface: "beach",
    blocksVehicles: true,
  },
];
export const beachParkingZones = [
  {
    id: "southwest-beach-drop-off",
    label: "BEACH DROP-OFF",
    ...gridRect(9, 34, 4, 1),
    districtId: "lower-district",
  },
];
export const beachRoadDivider = Object.freeze({
  id: "southwest-beach-road-divider",
  x: 0,
  y: 34 * GRID_SIZE,
  width: 23 * GRID_SIZE,
  height: 10,
  colour: "#8a552b",
});
export const waterTiles = [
  {
    id: "southwest-shoreline",
    ...gridRect(0, 35, 23, 1),
    surface: "shoreline",
    blocksVehicles: true,
  },
];

const boundary = (
  id,
  x,
  y,
  width,
  height,
  surface = "mainland-edge",
) => ({
  id,
  x,
  y,
  width,
  height,
  blocksVehicles: true,
  surface,
  colour: WORLD_EDGE_COLOUR,
  districtId: "world2-edge",
});

export const districts = [
  ...WORLD2_DISTRICTS.map((district) => ({
    id: district.id,
    name: district.name,
    worldX: district.bounds.x,
    worldY: district.bounds.y,
    width: district.bounds.width,
    height: district.bounds.height,
    ground: district.colour,
  })),
];

export const roads = WORLD2_ROADS.map((entry) => ({
  ...entry,
  type: entry.kind,
  districtId: "coast-city",
}));
export const buildings = WORLD2_BUILDINGS;
export const landmarks = WORLD2_BUILDINGS.filter((building) => building.isLandmark);
export const edgeBorderTiles = [
  boundary("world2-edge-north", -GRID_SIZE, -GRID_SIZE, WORLD2_WIDTH + GRID_SIZE * 2, GRID_SIZE),
  boundary("world2-edge-south", -GRID_SIZE, WORLD2_HEIGHT, WORLD2_WIDTH + GRID_SIZE * 2, GRID_SIZE),
  boundary("world2-edge-west", -GRID_SIZE, 0, GRID_SIZE, WORLD2_HEIGHT),
  boundary("world2-edge-east", WORLD2_WIDTH, 0, GRID_SIZE, WORLD2_HEIGHT),
];
const centralHighwayMedianBarrier = Object.freeze({
  id: "central-highway-solid-median",
  ...gridRect(0, 17.92, 61, 0.16),
  blocksVehicles: true,
  colour: "#758f42",
  districtId: "coastal-city",
});

export const barriers = [
  centralHighwayMedianBarrier,
  ...edgeBorderTiles,
  ...waterTiles,
];
export const obstacles = [...buildings, ...barriers, ...beachTiles];
export const busStops = [...WORLD2_BUS_STOPS];
export const fuelPumps = [
  {
    id: "coast-city-fuel-pump",
    label: "PETROL STATION PARK",
    ...gridRect(29, 5, 1, 1),
    districtId: "upper-district",
  },
];
export const repairZones = [
  {
    id: "coast-city-mechanic-repair-bay",
    label: "MECHANIC PARK",
    ...gridRect(39, 28, 1, 1),
    districtId: "lower-district",
  },
];
export const bankParkingZones = [];
export const dealershipParkingZones = [];
export const estateAgencyParkingZones = [];
export const businessOfficeParkingZones = [];
export const homeParkingZones = [];
export const healthParkingZones = [];
export const foodParkingZones = [];
export const trafficLightConcretePads = [];
export const mapTravelZones = [
  {
    id: "coast-city-mainland-gateway",
    label: "← MAINLAND LAGOS",
    shortLabel: "← MAINLAND",
    kind: "world-travel",
    orientation: "west",
    warningLabel: "SLOW DOWN · TOLL GATE AHEAD",
    ...WORLD2_RETURN_ZONE,
    districtId: "upper-district",
  },
];
export const raceZones = [];
export const playerStart = { ...WORLD2_PLAYER_START };

export function getDistrictAtWorldPosition(x, y) {
  return districts.find(
    (district) =>
      x >= district.worldX &&
      x <= district.worldX + district.width &&
      y >= district.worldY &&
      y <= district.worldY + district.height,
  ) ?? null;
}
