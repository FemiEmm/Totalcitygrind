import {
  DISTRICT_HEIGHT,
  DISTRICT_WIDTH,
  GRID_SIZE,
  GROUND_COLOUR,
  createTiledDistrictBlocks,
  gridRect,
} from "./mapConstants.js";

const road = (
  id,
  column,
  row,
  columns,
  rows,
  type = "local",
  metadata = {},
) => {
  return {
    id,
    ...gridRect(column, row, columns, rows),
    type,
    ...metadata,
  };
};

const stop = (id, label, column, row, routes) => ({
  id,
  label,
  x: column * GRID_SIZE,
  y: row * GRID_SIZE,
  width: GRID_SIZE,
  height: GRID_SIZE,
  routes,
});

const pump = (id, column, row) => ({
  id,
  label: "PARK HERE TO BUY FUEL",
  ...gridRect(column, row, 1, 1),
});

export const startingResidential = {
  id: "starting-residential",
  name: "Starting Residential Area",
  worldX: 0,
  worldY: 0,
  width: DISTRICT_WIDTH,
  height: DISTRICT_HEIGHT,
  ground: GROUND_COLOUR,

    playerStart: {
      x: 7.5 * GRID_SIZE,
      y: 4.5 * GRID_SIZE,
      rotation: 0,
    },

  roads: [
    road("community-avenue", 1, 7, 31, 2, "main"),
    // Four-lane centre highway: two westbound lanes above the divider and
    // two eastbound lanes below it. The lower half continues cleanly into
    // the southern districts without introducing a second road rectangle.
    road("lagoon-expressway-west", 0, 16, 32, 4, "highway"),
    road("estate-spine-north", 24, 1, 2, 17, "main"),
    road("market-commerce-west", 24, 12, 8, 2, "main"),

    road("home-loop-north", 3, 3, 9, 1),
    road("player-home-parking", 7, 4, 1, 1, "local"),
    road("home-loop-west", 3, 3, 1, 5),
    road("home-loop-east", 11, 3, 1, 5),
    road("garage-street", 11, 5, 8, 1),
    road("mechanic-repair-bay", 14, 6, 1, 1, "local"),
    road("clinic-access", 18, 1, 1, 7),

    road("west-loop-north", 3, 10, 8, 1),
    road("west-loop-west", 3, 8, 1, 7),
    road("west-loop-east", 10, 10, 1, 7),
    road("west-loop-south", 3, 14, 8, 1),

    road("middle-loop-north", 13, 10, 8, 1),
    // A paved private court replaces the generic 2x2 house beside the upgraded home.
    road("mainland-terrace-court", 16, 11, 2, 2, "local"),
    road("middle-loop-west", 13, 8, 1, 7),
    road("middle-loop-east", 20, 10, 1, 7),
    road("middle-loop-south", 13, 14, 8, 1),
    road("driving-school-test-bay", 8, 13, 1, 1, "local"),

    road("east-local-street", 25, 11, 6, 1, "local", {
      terminalEnds: ["end"],
    }),
    road("east-local-connector", 29, 8, 1, 9),

    // One-tile relief tracks join before the controlled crossroads instead
    // of running beside an existing paved road.
    road("residential-crossroads-bypass-north", 21, 5, 3, 1, "dirt"),
    road("residential-crossroads-bypass-west", 21, 5, 1, 2, "dirt"),
    road("residential-expressway-bypass-north", 21, 15, 3, 1, "dirt"),
    road("residential-expressway-bypass-west", 21, 15, 1, 1, "dirt"),
  ],

  barriers: [
    // The centre median separates the two westbound lanes from the two
    // eastbound lanes. Leave a two-tile opening at Estate Spine.
    {
      id: "lagoon-centre-median-west-a",
      // Keep the first two edge tiles open so vehicles entering the world
      // have room to settle into their lane before the physical median starts.
      ...gridRect(2, 17.95, 21, 0.1),
    },
    {
      id: "lagoon-centre-median-west-b",
      ...gridRect(27, 17.95, 5, 0.1),
    },
  ],

  blocks: [],

  landmarks: [
    {
      id: "player-home",
      label: "PLAYER HOME",
      ...gridRect(5, 4, 2, 2),
      services: ["player-start", "moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "danfo-garage",
      label: "DANFO GARAGE",
      ...gridRect(13, 3, 4, 1),
      services: ["danfo-start", "garage-fee"],
    },
    {
      id: "residential-mechanic",
      label: "MECHANIC",
      ...gridRect(15, 6, 2, 1),
      services: [],
    },
    {
      id: "residential-petrol-station",
      label: "PETROL STATION",
      ...gridRect(20, 3, 3, 2),
      services: ["fuel", "moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "community-clinic",
      label: "GENERAL HOSPITAL",
      ...gridRect(27, 3, 2, 2),
      services: [
        "health-public",
        "moto-eazi-pickup",
        "moto-eazi-dropoff",
      ],
    },
    {
      id: "residential-food-shop",
      label: "FOOD SHOP",
      ...gridRect(9, 4, 1, 1),
      services: ["food-shop"],
    },
    {
      id: "mainland-terrace-home",
      label: "MAINLAND TERRACE",
      ...gridRect(14, 11, 2, 2),
      services: ["owned-home"],
    },
    {
      id: "mainland-driving-school",
      label: "BOLADE DRIVING SCHOOL",
      ...gridRect(8, 11, 1, 2),
      services: ["driving-school"],
    },
  ],

  drivingSchoolParkingZones: [
    {
      id: "bolade-driving-school-test-bay",
      label: "DRIVING SCHOOL TEST BAY",
      schoolId: "mainland-driving-school",
      ...gridRect(8, 13, 1, 1),
    },
  ],

  homeParkingZones: [
    {
      id: "player-home-vehicle-swap",
      label: "HOME PARKING",
      homeId: "starter-rental",
      ...gridRect(7, 4, 1, 1),
    },
    {
      id: "mainland-terrace-parking",
      label: "MAINLAND TERRACE PARKING",
      homeId: "mainland-home",
      ...gridRect(16, 12, 1, 1),
    },
  ],

  repairZones: [
    {
      id: "residential-mechanic-repair-bay",
      label: "MECHANIC PARK",
      ...gridRect(14, 6, 1, 1),
    },
  ],

  healthParkingZones: [
    {
      id: "general-hospital-parking",
      label: "HOSPITAL PARKING",
      provider: "General Hospital",
      providerType: "public-hospital",
      ...gridRect(26, 4, 1, 1),
    },
  ],

  foodParkingZones: [
    {
      id: "residential-food-shop-parking",
      label: "FOOD SHOP PARKING",
      sellerLabel: "Neighbourhood Food Shop",
      sellerType: "shop",
      ...gridRect(8, 4, 1, 1),
    },
  ],

  fuelPumps: [
    pump("residential-pump-1", 19, 3),
    pump("residential-pump-2", 19, 4),
  ],

  busStops: [
    stop("res-stop-home", "Home Junction", 6, 6, ["R1"]),
    stop("res-stop-garage", "Garage", 14, 4, ["R1", "R3"]),
    stop("res-stop-clinic", "General Hospital", 20, 6, ["R1"]),
    stop("res-stop-loop", "Community Loop", 5, 9, ["R3"]),
    stop("res-stop-estate", "Estate Gate", 21, 9, ["R1", "R4"]),
    stop("res-stop-east", "East Link", 30, 9, ["R4"]),
  ],
};

const startingTrafficLightReservations = [
  [16, 9],
  [17, 6],
  [19, 6],
  [23, 6],
  [23, 9],
  [26, 6],
  [26, 9],
  [26, 15],
].map(([column, row]) => gridRect(column, row, 1, 1));

startingResidential.blocks = createTiledDistrictBlocks({
  idPrefix: "residential-plot",
  reserved: [
    ...startingResidential.roads,
    ...startingResidential.landmarks,
    ...startingResidential.homeParkingZones,
    ...startingResidential.repairZones,
    ...startingResidential.healthParkingZones,
    ...startingResidential.foodParkingZones,
    ...startingResidential.drivingSchoolParkingZones,
    ...startingResidential.fuelPumps,
    ...startingResidential.busStops,
    ...startingTrafficLightReservations,
    // Keep the one-tile tow bay off the road at X9 Y9.
    gridRect(9, 9, 1, 1),
    gridRect(0, 0, 32, 2),
    gridRect(0, 0, 2, 18),
  ],
});






