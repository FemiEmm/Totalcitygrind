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

export const nightlife = {
  id: "nightlife",
  name: "Mushin LGA",
  worldX: DISTRICT_WIDTH,
  worldY: DISTRICT_HEIGHT,
  width: DISTRICT_WIDTH,
  height: DISTRICT_HEIGHT,
  ground: GROUND_COLOUR,

  roads: [
    road("mainland-expressway-south", 26, 0, 2, 18, "highway"),
    road("southern-city-avenue-east", 0, 5, 28, 2, "main"),
    road("east-nightlife-gate", 28, 5, 4, 2, "main"),
    road("night-work-link", 7, 0, 2, 5, "main"),
    road("nightlife-spine", 14, 0, 2, 15, "main"),
    road("southern-cross-city-east", 0, 13, 28, 2, "main"),
    road("east-southern-road-gate", 28, 13, 4, 2, "main"),
    road("south-night-gate", 7, 13, 2, 5, "main"),

    road("club-street", 3, 6, 1, 7),
    road("hotel-street", 8, 7, 1, 6),
    road("music-lane", 11, 2, 1, 4, "local", {
      terminalEnds: ["start"],
    }),
    road("event-loop-north", 15, 9, 7, 1),
    road("restaurant-street", 21, 6, 1, 8),
    road("petrol-access", 25, 3, 2, 1, "local", {
      terminalEnds: ["start"],
    }),
    road("waterfront-access", 5, 13, 1, 5),

    road("nightlife-light-bypass", 12, 2, 2, 1, "dirt"),
    road("south-east-light-bypass-north", 23, 10, 3, 1, "dirt"),
    road("south-east-light-bypass-west", 23, 10, 1, 3, "dirt"),
  ],

  barriers: [
    // Resume the north/south divider only after it has cleared the full
    // four-lane Lagoon Expressway junction.
    { id: "night-highway-median-b", ...gridRect(26.95, 8, 0.1, 4) },
  ],

  blocks: [],

  landmarks: [
    {
      id: "night-club",
      label: "NIGHT CLUB",
      ...gridRect(4, 10, 2, 2),
      services: ["moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "nightlife-hotel",
      label: "CITY HOTEL",
      ...gridRect(9, 10, 3, 2),
      services: ["moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "live-music-club",
      label: "LIVE MUSIC",
      ...gridRect(9, 2, 2, 1),
      services: ["moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "event-centre",
      label: "YABA EVENT CENTRE",
      ...gridRect(12, 11, 2, 2),
      services: ["moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "nightlife-restaurant",
      label: "PALMGROVE RESTAURANTS",
      // The artwork is a native 2:1 roof strip; reserve its real 2x1 footprint.
      ...gridRect(19, 4, 2, 1),
      services: [
        "food-restaurant",
        "moto-eazi-pickup",
        "moto-eazi-dropoff",
      ],
    },
    {
      id: "nightlife-petrol-station",
      label: "PETROL STATION",
      ...gridRect(22, 2, 3, 2),
      services: ["fuel", "moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "nightlife-police-station",
      label: "POLICE STATION",
      ...gridRect(20, 10, 1, 2),
      services: [],
    },
  ],

  policeParkingZones: [
    { id: "nightlife-police-bay-1", label: "POLICE BAY 1", ...gridRect(17, 8, 1, 1) },
    { id: "nightlife-police-bay-2", label: "POLICE BAY 2", ...gridRect(18, 8, 1, 1) },
    { id: "nightlife-police-bay-3", label: "POLICE BAY 3", ...gridRect(19, 8, 1, 1) },
    { id: "nightlife-police-bay-4", label: "POLICE BAY 4", ...gridRect(20, 8, 1, 1) },
    { id: "nightlife-police-bay-5", label: "POLICE BAY 5", ...gridRect(18, 10, 1, 1) },
    { id: "nightlife-police-bay-6", label: "POLICE BAY 6", ...gridRect(19, 10, 1, 1) },
  ],

  fuelPumps: [
    pump("nightlife-pump-1", 22, 4),
    pump("nightlife-pump-2", 24, 4),
  ],

  foodParkingZones: [
    {
      id: "nightlife-restaurant-food-parking",
      label: "RESTAURANT PARKING",
      sellerLabel: "Palmgrove Restaurants",
      sellerType: "restaurant",
      // Dedicated curb bay immediately east of the restaurant strip.
      ...gridRect(21, 4, 1, 1),
    },
  ],

  busStops: [
    stop("night-stop-old-airport", "Mushin", 13, 2, ["N1"]),
    stop("night-stop-work-link", "Ladipo", 6, 4, ["N1"]),
    stop("night-stop-clubs", "Isolo", 2, 7, ["N1", "N3"]),
    stop("night-stop-circle", "Ilupeju", 11, 7, ["N1", "N3"]),
    stop("night-stop-restaurants", "Palmgrove", 22, 7, ["N1"]),
    stop("night-stop-harbour", "Ojuelegba", 10, 12, ["N3"]),
    stop("night-stop-events", "Yaba", 19, 12, ["N3"]),
    stop("night-stop-south-terminal", "Oyingbo", 21, 15, ["N1", "N3"]),
  ],
};

const nightlifeTrafficLightReservations = [
  [6, 0],
  [6, 12],
  [6, 15],
  [9, 0],
  [9, 12],
  [9, 15],
  [12, 0],
  [13, 4],
  [13, 7],
  [13, 12],
  [13, 15],
  [16, 4],
  [16, 7],
  [16, 12],
  [25, 0],
  [25, 4],
  [25, 7],
  [25, 12],
  [25, 15],
  [28, 0],
  [28, 4],
  [28, 7],
  [28, 12],
  [28, 15],
].map(([column, row]) => gridRect(column, row, 1, 1));

nightlife.blocks = createTiledDistrictBlocks({
  idPrefix: "nightlife-plot",
  reserved: [
    ...nightlife.roads,
    ...nightlife.landmarks,
    ...nightlife.fuelPumps,
    ...nightlife.foodParkingZones,
    ...nightlife.policeParkingZones,
    ...nightlife.busStops,
    ...nightlifeTrafficLightReservations,
    // One-tile off-road tow bay at world X45 Y26.
    gridRect(13, 8, 1, 1),
    gridRect(30, 0, 2, 18),
    gridRect(0, 16, 32, 2),
  ],
}).filter((block) => {
  const freightGrassClearance = gridRect(28, 1, 2, 2);

  return !(
    block.x < freightGrassClearance.x + freightGrassClearance.width &&
    block.x + block.width > freightGrassClearance.x &&
    block.y < freightGrassClearance.y + freightGrassClearance.height &&
    block.y + block.height > freightGrassClearance.y
  );
});



