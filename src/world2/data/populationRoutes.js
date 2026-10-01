import {
  WORLD2_ROADS,
  WORLD2_TRAFFIC_SPAWN_POINTS,
} from "./worldMap2.js";
import { GRID_SIZE } from "./mapConstants.js";

export { WORLD2_TRAFFIC_SPAWN_POINTS };

const ROAD_BY_ID = new Map(
  WORLD2_ROADS.map((road) => [road.id, road]),
);

const PERIOD_WEIGHTS = Object.freeze({
  overnight: 0.55,
  dawn: 0.9,
  "morning-rush": 1.45,
  daytime: 1.05,
  "evening-rush": 1.55,
  "late-night": 0.72,
});

const ROAD_CAR_TYPES = Object.freeze([
  "private-citizen-1",
  "private-blue-sedan",
  "private-red-hatch",
  "private-white-suv",
  "private-purple-coupe",
  "private-silver-estate",
  "taxi",
  "danfo",
  "delivery-van",
]);
const CARGO_TYPES = Object.freeze(["cargo-truck"]);
const FUEL_TYPES = Object.freeze(["petrol-truck"]);
const BRT_TYPES = Object.freeze(["brt"]);

function roadPoint(
  column,
  row,
  roadId,
  direction,
  metadata = {},
) {
  const road = ROAD_BY_ID.get(roadId);
  if (!road) {
    throw new Error(`Unknown World 2 road: ${roadId}`);
  }

  return Object.freeze({
    x: column * GRID_SIZE,
    y: row * GRID_SIZE,
    roadId,
    streetName: road.name,
    direction,
    ...metadata,
  });
}

function namedRoute(
  id,
  spawnId,
  destinationSpawnId,
  roadIds,
  points,
  options = {},
) {
  const routeWeight = options.weight ?? 1;

  return Object.freeze({
    id,
    displayLabel: options.displayLabel ?? null,
    spawnId,
    originSpawnId: spawnId,
    destinationSpawnId,
    flowGroup: options.flowGroup ?? id,
    streetSequence: Object.freeze(
      roadIds.map((roadId) => ROAD_BY_ID.get(roadId)?.name ?? roadId),
    ),
    roadIds: Object.freeze([...roadIds]),
    points: Object.freeze(points),
    periodWeights: Object.freeze(
      Object.fromEntries(
        Object.entries(PERIOD_WEIGHTS).map(([period, weight]) => [
          period,
          weight * routeWeight,
        ]),
      ),
    ),
    weight: routeWeight,
    rushWeight: options.rushWeight ?? 1.2,
    speedMultiplier: options.speedMultiplier ?? 1,
    vehicleTypes: options.vehicleTypes ?? ROAD_CAR_TYPES,
    permanentLoop: false,
    persistentFleet: false,
    loopVehicleCount: 0,
    loopSpawnIntervalSeconds: 0,
    initialSpawnDelaySeconds: options.initialSpawnDelaySeconds ?? 0,
    spawnRetryDelaySeconds: options.spawnRetryDelaySeconds ?? 1.5,
    initialPointIndex: 0,
    minimumSpawnSeparation: options.minimumSpawnSeparation ?? 105,
    terminalLayoverMinutes: 0,
    initialLayoverMinutes: 0,
    brt: false,
  });
}

const HIGHWAY_ID = "central-four-lane-highway";
const VICTORIA_ID = "upper-major-road";
const MARINA_ID = "lower-major-road";
const PALM_ID = "upper-neighbourhood-row-12";
const KENSINGTON_ID = "upper-neighbourhood-row-3";
const ADMIRALTY_ID = "lower-neighbourhood-row-24";
const GOLD_COAST_ID = "lower-neighbourhood-row-33";
const REGENCY_ID = "upper-neighbourhood-column-8";
const PEARL_ID = "upper-neighbourhood-column-25";
const CEDAR_ID = "lower-neighbourhood-column-35";
const KINGSLEY_ID = "lower-neighbourhood-column-52";
const CORAL_ID = "upper-coast-road";
const AZURE_ID = "lower-coast-road";

const ALL_WORLD2_ROUTE_PROPOSALS = Object.freeze([
  // Private cars, taxis, danfo and delivery vans.
  namedRoute(
    "road-01-atlantic-crown-eastbound-slow",
    "crown-eastbound-west-slow",
    "crown-westbound-east-slow",
    [HIGHWAY_ID],
    [
      roadPoint(0.5, 19.5, HIGHWAY_ID, "east"),
      roadPoint(63.5, 19.5, HIGHWAY_ID, "east"),
    ],
    { flowGroup: "crown-eastbound-slow", weight: 3.2, speedMultiplier: 1.12 },
  ),
  namedRoute(
    "road-02-atlantic-crown-eastbound-fast",
    "crown-eastbound-west-fast",
    "crown-westbound-east-fast",
    [HIGHWAY_ID],
    [
      roadPoint(0.5, 18.5, HIGHWAY_ID, "east"),
      roadPoint(63.5, 18.5, HIGHWAY_ID, "east"),
    ],
    { flowGroup: "crown-eastbound-fast", weight: 2.6, speedMultiplier: 1.15 },
  ),
  namedRoute(
    "road-03-atlantic-crown-westbound-slow",
    "crown-westbound-east-slow",
    "crown-eastbound-west-slow",
    [HIGHWAY_ID],
    [
      roadPoint(63.5, 16.5, HIGHWAY_ID, "west"),
      roadPoint(0.5, 16.5, HIGHWAY_ID, "west"),
    ],
    { flowGroup: "crown-westbound-slow", weight: 3.2, speedMultiplier: 1.12 },
  ),
  namedRoute(
    "road-04-atlantic-crown-westbound-fast",
    "crown-westbound-east-fast",
    "crown-eastbound-west-fast",
    [HIGHWAY_ID],
    [
      roadPoint(63.5, 17.5, HIGHWAY_ID, "west"),
      roadPoint(0.5, 17.5, HIGHWAY_ID, "west"),
    ],
    { flowGroup: "crown-westbound-fast", weight: 2.6, speedMultiplier: 1.15 },
  ),
  namedRoute(
    "road-05-victoria-grand-eastbound",
    "victoria-west-gate",
    "victoria-east-gate",
    [VICTORIA_ID],
    [
      roadPoint(0.5, 6.5, VICTORIA_ID, "east"),
      roadPoint(63.5, 6.5, VICTORIA_ID, "east"),
    ],
    { flowGroup: "victoria-eastbound", weight: 2.2, speedMultiplier: 1.03 },
  ),
  namedRoute(
    "road-06-victoria-grand-westbound",
    "victoria-east-gate",
    "victoria-west-gate",
    [VICTORIA_ID],
    [
      roadPoint(63.5, 7.5, VICTORIA_ID, "west"),
      roadPoint(0.5, 7.5, VICTORIA_ID, "west"),
    ],
    { flowGroup: "victoria-westbound", weight: 2.2, speedMultiplier: 1.03 },
  ),
  namedRoute(
    "road-07-marina-royal-eastbound",
    "marina-west-gate",
    "marina-east-gate",
    [MARINA_ID],
    [
      roadPoint(0.5, 27.5, MARINA_ID, "east"),
      roadPoint(63.5, 27.5, MARINA_ID, "east"),
    ],
    { flowGroup: "marina-eastbound", weight: 2.25, speedMultiplier: 1.02 },
  ),
  namedRoute(
    "road-08-marina-royal-westbound",
    "marina-east-gate",
    "marina-west-gate",
    [MARINA_ID],
    [
      roadPoint(63.5, 26.5, MARINA_ID, "west"),
      roadPoint(0.5, 26.5, MARINA_ID, "west"),
    ],
    { flowGroup: "marina-westbound", weight: 2.25, speedMultiplier: 1.02 },
  ),
  namedRoute(
    "road-09-regency-to-kensington-east",
    "regency-north-gate",
    "kensington-east-edge",
    [REGENCY_ID, KENSINGTON_ID],
    [
      roadPoint(8.5, 0.5, REGENCY_ID, "south"),
      roadPoint(8.5, 3.5, REGENCY_ID, "south", { noSmooth: true }),
      roadPoint(63.5, 3.5, KENSINGTON_ID, "east", { noSmooth: true }),
    ],
    { weight: 1.15, speedMultiplier: 0.95 },
  ),
  namedRoute(
    "road-10-kensington-to-regency-north",
    "kensington-east-edge",
    "regency-north-gate",
    [KENSINGTON_ID, REGENCY_ID],
    [
      roadPoint(63.5, 3.5, KENSINGTON_ID, "west"),
      roadPoint(8.5, 3.5, KENSINGTON_ID, "west", { noSmooth: true }),
      roadPoint(8.5, 0.5, REGENCY_ID, "north", { noSmooth: true }),
    ],
    { weight: 1.15, speedMultiplier: 0.95 },
  ),
  namedRoute(
    "road-11-eko-pearl-to-palm-east",
    "pearl-north-gate",
    "palm-east-edge",
    [PEARL_ID, PALM_ID],
    [
      roadPoint(25.5, 0.5, PEARL_ID, "south"),
      roadPoint(25.5, 12.5, PEARL_ID, "south", { noSmooth: true }),
      roadPoint(63.5, 12.5, PALM_ID, "east", { noSmooth: true }),
    ],
    { weight: 1.2, speedMultiplier: 0.96 },
  ),
  namedRoute(
    "road-12-palm-to-eko-pearl-north",
    "palm-west-gate",
    "pearl-north-gate",
    [PALM_ID, PEARL_ID],
    [
      roadPoint(0.5, 12.5, PALM_ID, "east"),
      roadPoint(25.5, 12.5, PALM_ID, "east", { noSmooth: true }),
      roadPoint(25.5, 0.5, PEARL_ID, "north", { noSmooth: true }),
    ],
    { weight: 1.2, speedMultiplier: 0.96 },
  ),
  namedRoute(
    "road-13-coral-to-victoria-west",
    "coral-north-gate",
    "victoria-west-gate",
    [CORAL_ID, VICTORIA_ID],
    [
      roadPoint(58.5, 0.5, CORAL_ID, "south"),
      roadPoint(58.5, 7.5, CORAL_ID, "south", { noSmooth: true }),
      roadPoint(0.5, 7.5, VICTORIA_ID, "west", { noSmooth: true }),
    ],
    { weight: 1.35, speedMultiplier: 0.99 },
  ),
  namedRoute(
    "road-14-victoria-to-coral-north",
    "victoria-west-gate",
    "coral-north-gate",
    [VICTORIA_ID, CORAL_ID],
    [
      roadPoint(0.5, 6.5, VICTORIA_ID, "east"),
      roadPoint(59.5, 6.5, VICTORIA_ID, "east", { noSmooth: true }),
      roadPoint(59.5, 0.5, CORAL_ID, "north", { noSmooth: true }),
    ],
    { weight: 1.35, speedMultiplier: 0.99 },
  ),
  namedRoute(
    "road-15-coral-to-palm-east",
    "coral-north-gate",
    "palm-east-edge",
    [CORAL_ID, PALM_ID],
    [
      roadPoint(58.5, 0.5, CORAL_ID, "south"),
      roadPoint(58.5, 12.5, CORAL_ID, "south", { noSmooth: true }),
      roadPoint(63.5, 12.5, PALM_ID, "east", { noSmooth: true }),
    ],
    { weight: 1.25, speedMultiplier: 0.98 },
  ),
  namedRoute(
    "road-16-palm-to-coral-north",
    "palm-east-edge",
    "coral-north-gate",
    [PALM_ID, CORAL_ID],
    [
      roadPoint(63.5, 12.5, PALM_ID, "west"),
      roadPoint(58.5, 12.5, PALM_ID, "west", { noSmooth: true }),
      roadPoint(58.5, 0.5, CORAL_ID, "north", { noSmooth: true }),
    ],
    { weight: 1.25, speedMultiplier: 0.98 },
  ),
  namedRoute(
    "road-17-cedar-to-gold-coast-east",
    "cedar-south-gate",
    "gold-coast-east-edge",
    [CEDAR_ID, GOLD_COAST_ID],
    [
      roadPoint(35.5, 35.5, CEDAR_ID, "north"),
      roadPoint(35.5, 33.5, CEDAR_ID, "north", { noSmooth: true }),
      roadPoint(63.5, 33.5, GOLD_COAST_ID, "east", { noSmooth: true }),
    ],
    { weight: 1.1, speedMultiplier: 0.95 },
  ),
  namedRoute(
    "road-18-gold-coast-to-cedar-south",
    "gold-coast-east-edge",
    "cedar-south-gate",
    [GOLD_COAST_ID, CEDAR_ID],
    [
      roadPoint(63.5, 33.5, GOLD_COAST_ID, "west"),
      roadPoint(35.5, 33.5, GOLD_COAST_ID, "west", { noSmooth: true }),
      roadPoint(35.5, 35.5, CEDAR_ID, "south", { noSmooth: true }),
    ],
    { weight: 1.1, speedMultiplier: 0.95 },
  ),
  namedRoute(
    "road-19-kingsley-to-admiralty-west",
    "kingsley-south-gate",
    "admiralty-west-edge",
    [KINGSLEY_ID, ADMIRALTY_ID],
    [
      roadPoint(52.5, 35.5, KINGSLEY_ID, "north"),
      roadPoint(52.5, 24.5, KINGSLEY_ID, "north", { noSmooth: true }),
      roadPoint(0.5, 24.5, ADMIRALTY_ID, "west", { noSmooth: true }),
    ],
    { weight: 1.2, speedMultiplier: 0.96 },
  ),
  namedRoute(
    "road-20-admiralty-to-kingsley-south",
    "admiralty-west-edge",
    "kingsley-south-gate",
    [ADMIRALTY_ID, KINGSLEY_ID],
    [
      roadPoint(0.5, 24.5, ADMIRALTY_ID, "east"),
      roadPoint(52.5, 24.5, ADMIRALTY_ID, "east", { noSmooth: true }),
      roadPoint(52.5, 35.5, KINGSLEY_ID, "south", { noSmooth: true }),
    ],
    { weight: 1.2, speedMultiplier: 0.96 },
  ),
  namedRoute(
    "road-21-azure-to-marina-east",
    "azure-south-gate",
    "marina-east-gate",
    [AZURE_ID, MARINA_ID],
    [
      roadPoint(59.5, 35.5, AZURE_ID, "north"),
      roadPoint(59.5, 27.5, AZURE_ID, "north", { noSmooth: true }),
      roadPoint(63.5, 27.5, MARINA_ID, "east", { noSmooth: true }),
    ],
    { weight: 1.35, speedMultiplier: 0.99 },
  ),
  namedRoute(
    "road-22-marina-to-azure-south",
    "marina-east-gate",
    "azure-south-gate",
    [MARINA_ID, AZURE_ID],
    [
      roadPoint(63.5, 26.5, MARINA_ID, "west"),
      roadPoint(58.5, 26.5, MARINA_ID, "west", { noSmooth: true }),
      roadPoint(58.5, 35.5, AZURE_ID, "south", { noSmooth: true }),
    ],
    { weight: 1.35, speedMultiplier: 0.99 },
  ),

  // Cargo trucks stay on the wide roads.
  namedRoute(
    "cargo-27-crown-eastbound",
    "crown-eastbound-west-slow",
    "crown-westbound-east-slow",
    [HIGHWAY_ID],
    [roadPoint(0.5, 19.5, HIGHWAY_ID, "east"), roadPoint(63.5, 19.5, HIGHWAY_ID, "east")],
    { vehicleTypes: CARGO_TYPES, weight: 0.58, speedMultiplier: 0.86, minimumSpawnSeparation: 180 },
  ),
  namedRoute(
    "cargo-28-crown-westbound",
    "crown-westbound-east-slow",
    "crown-eastbound-west-slow",
    [HIGHWAY_ID],
    [roadPoint(63.5, 16.5, HIGHWAY_ID, "west"), roadPoint(0.5, 16.5, HIGHWAY_ID, "west")],
    { vehicleTypes: CARGO_TYPES, weight: 0.58, speedMultiplier: 0.86, minimumSpawnSeparation: 180 },
  ),
  namedRoute(
    "cargo-29-victoria-eastbound",
    "victoria-west-gate",
    "victoria-east-gate",
    [VICTORIA_ID],
    [roadPoint(0.5, 6.5, VICTORIA_ID, "east"), roadPoint(63.5, 6.5, VICTORIA_ID, "east")],
    { vehicleTypes: CARGO_TYPES, weight: 0.42, speedMultiplier: 0.82, minimumSpawnSeparation: 180 },
  ),
  namedRoute(
    "cargo-30-victoria-westbound",
    "victoria-east-gate",
    "victoria-west-gate",
    [VICTORIA_ID],
    [roadPoint(63.5, 7.5, VICTORIA_ID, "west"), roadPoint(0.5, 7.5, VICTORIA_ID, "west")],
    { vehicleTypes: CARGO_TYPES, weight: 0.42, speedMultiplier: 0.82, minimumSpawnSeparation: 180 },
  ),
  namedRoute(
    "cargo-31-marina-eastbound",
    "marina-west-gate",
    "marina-east-gate",
    [MARINA_ID],
    [roadPoint(0.5, 27.5, MARINA_ID, "east"), roadPoint(63.5, 27.5, MARINA_ID, "east")],
    { vehicleTypes: CARGO_TYPES, weight: 0.44, speedMultiplier: 0.82, minimumSpawnSeparation: 180 },
  ),
  namedRoute(
    "cargo-32-marina-westbound",
    "marina-east-gate",
    "marina-west-gate",
    [MARINA_ID],
    [roadPoint(63.5, 26.5, MARINA_ID, "west"), roadPoint(0.5, 26.5, MARINA_ID, "west")],
    { vehicleTypes: CARGO_TYPES, weight: 0.44, speedMultiplier: 0.82, minimumSpawnSeparation: 180 },
  ),
  namedRoute(
    "cargo-33-coral-to-victoria-east",
    "coral-north-gate",
    "victoria-east-gate",
    [CORAL_ID, VICTORIA_ID],
    [
      roadPoint(58.5, 0.5, CORAL_ID, "south"),
      roadPoint(58.5, 6.5, CORAL_ID, "south", { noSmooth: true }),
      roadPoint(63.5, 6.5, VICTORIA_ID, "east", { noSmooth: true }),
    ],
    { vehicleTypes: CARGO_TYPES, weight: 0.32, speedMultiplier: 0.78, minimumSpawnSeparation: 190 },
  ),
  namedRoute(
    "cargo-34-azure-to-marina-west",
    "azure-south-gate",
    "marina-west-gate",
    [AZURE_ID, MARINA_ID],
    [
      roadPoint(59.5, 35.5, AZURE_ID, "north"),
      roadPoint(59.5, 26.5, AZURE_ID, "north", { noSmooth: true }),
      roadPoint(0.5, 26.5, MARINA_ID, "west", { noSmooth: true }),
    ],
    { vehicleTypes: CARGO_TYPES, weight: 0.32, speedMultiplier: 0.78, minimumSpawnSeparation: 190 },
  ),

  // Fuel tankers also use only the wide roads.
  namedRoute(
    "fuel-35-crown-eastbound",
    "crown-eastbound-west-slow",
    "crown-westbound-east-slow",
    [HIGHWAY_ID],
    [roadPoint(0.5, 19.5, HIGHWAY_ID, "east"), roadPoint(63.5, 19.5, HIGHWAY_ID, "east")],
    { vehicleTypes: FUEL_TYPES, weight: 0.24, speedMultiplier: 0.78, minimumSpawnSeparation: 220 },
  ),
  namedRoute(
    "fuel-36-crown-westbound",
    "crown-westbound-east-slow",
    "crown-eastbound-west-slow",
    [HIGHWAY_ID],
    [roadPoint(63.5, 16.5, HIGHWAY_ID, "west"), roadPoint(0.5, 16.5, HIGHWAY_ID, "west")],
    { vehicleTypes: FUEL_TYPES, weight: 0.24, speedMultiplier: 0.78, minimumSpawnSeparation: 220 },
  ),
  namedRoute(
    "fuel-37-coral-to-victoria-west",
    "coral-north-gate",
    "victoria-west-gate",
    [CORAL_ID, VICTORIA_ID],
    [
      roadPoint(58.5, 0.5, CORAL_ID, "south"),
      roadPoint(58.5, 7.5, CORAL_ID, "south", { noSmooth: true }),
      roadPoint(0.5, 7.5, VICTORIA_ID, "west", { noSmooth: true }),
    ],
    { vehicleTypes: FUEL_TYPES, weight: 0.18, speedMultiplier: 0.74, minimumSpawnSeparation: 230 },
  ),
  namedRoute(
    "fuel-38-victoria-to-coral-north",
    "victoria-west-gate",
    "coral-north-gate",
    [VICTORIA_ID, CORAL_ID],
    [
      roadPoint(0.5, 6.5, VICTORIA_ID, "east"),
      roadPoint(59.5, 6.5, VICTORIA_ID, "east", { noSmooth: true }),
      roadPoint(59.5, 0.5, CORAL_ID, "north", { noSmooth: true }),
    ],
    { vehicleTypes: FUEL_TYPES, weight: 0.18, speedMultiplier: 0.74, minimumSpawnSeparation: 230 },
  ),
  namedRoute(
    "fuel-39-azure-to-marina-east",
    "azure-south-gate",
    "marina-east-gate",
    [AZURE_ID, MARINA_ID],
    [
      roadPoint(59.5, 35.5, AZURE_ID, "north"),
      roadPoint(59.5, 27.5, AZURE_ID, "north", { noSmooth: true }),
      roadPoint(63.5, 27.5, MARINA_ID, "east", { noSmooth: true }),
    ],
    { vehicleTypes: FUEL_TYPES, weight: 0.18, speedMultiplier: 0.74, minimumSpawnSeparation: 230 },
  ),
  namedRoute(
    "fuel-40-marina-to-azure-south",
    "marina-east-gate",
    "azure-south-gate",
    [MARINA_ID, AZURE_ID],
    [
      roadPoint(63.5, 26.5, MARINA_ID, "west"),
      roadPoint(58.5, 26.5, MARINA_ID, "west", { noSmooth: true }),
      roadPoint(58.5, 35.5, AZURE_ID, "south", { noSmooth: true }),
    ],
    { vehicleTypes: FUEL_TYPES, weight: 0.18, speedMultiplier: 0.74, minimumSpawnSeparation: 230 },
  ),

  // Coast City BRT behaves as through traffic: no terminal, stops or loading.
  namedRoute(
    "brt-41-crown-eastbound-outer",
    "crown-eastbound-west-slow",
    "crown-westbound-east-slow",
    [HIGHWAY_ID],
    [roadPoint(0.5, 19.5, HIGHWAY_ID, "east"), roadPoint(63.5, 19.5, HIGHWAY_ID, "east")],
    { vehicleTypes: BRT_TYPES, weight: 0.32, speedMultiplier: 0.88, minimumSpawnSeparation: 260 },
  ),
  namedRoute(
    "brt-42-crown-eastbound-inner",
    "crown-eastbound-west-fast",
    "crown-westbound-east-fast",
    [HIGHWAY_ID],
    [roadPoint(0.5, 18.5, HIGHWAY_ID, "east"), roadPoint(63.5, 18.5, HIGHWAY_ID, "east")],
    { vehicleTypes: BRT_TYPES, weight: 0.28, speedMultiplier: 0.9, minimumSpawnSeparation: 260 },
  ),
  namedRoute(
    "brt-43-crown-westbound-outer",
    "crown-westbound-east-slow",
    "crown-eastbound-west-slow",
    [HIGHWAY_ID],
    [roadPoint(63.5, 16.5, HIGHWAY_ID, "west"), roadPoint(0.5, 16.5, HIGHWAY_ID, "west")],
    { vehicleTypes: BRT_TYPES, weight: 0.32, speedMultiplier: 0.88, minimumSpawnSeparation: 260 },
  ),
  namedRoute(
    "brt-44-crown-westbound-inner",
    "crown-westbound-east-fast",
    "crown-eastbound-west-fast",
    [HIGHWAY_ID],
    [roadPoint(63.5, 17.5, HIGHWAY_ID, "west"), roadPoint(0.5, 17.5, HIGHWAY_ID, "west")],
    { vehicleTypes: BRT_TYPES, weight: 0.28, speedMultiplier: 0.9, minimumSpawnSeparation: 260 },
  ),
]);

const ONE_WAY_DIRECTIONS = Object.freeze({
  [KENSINGTON_ID]: "east",
  [PALM_ID]: "east",
  [ADMIRALTY_ID]: "west",
  [GOLD_COAST_ID]: "east",
  [REGENCY_ID]: "south",
  [PEARL_ID]: "south",
  [CEDAR_ID]: "north",
  [KINGSLEY_ID]: "north",
});

function followsOneWayStreets(route) {
  return route.points.every((point) => {
    const requiredDirection = ONE_WAY_DIRECTIONS[point.roadId];
    return !requiredDirection || point.direction === requiredDirection;
  });
}

export const WORLD2_ROUTE_PROPOSALS = Object.freeze(
  ALL_WORLD2_ROUTE_PROPOSALS.filter(followsOneWayStreets),
);
export const WORLD2_POPULATION_ROUTES = WORLD2_ROUTE_PROPOSALS;
