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

export const workHub = {
  id: "work-hub",
  name: "Work and Transport Hub",
  worldX: DISTRICT_WIDTH,
  worldY: 0,
  width: DISTRICT_WIDTH,
  height: DISTRICT_HEIGHT,
  ground: GROUND_COLOUR,

  roads: [
    road("community-avenue-east", 0, 7, 28, 2, "main"),
    road("east-community-gate", 28, 7, 4, 2, "main"),
    road("market-commerce-east", 0, 12, 28, 2, "main"),
    road("lagoon-expressway-east", 0, 16, 32, 4, "highway"),
    road("mainland-expressway-north", 26, 0, 2, 18, "highway"),
    road("work-hub-spine", 13, 1, 2, 17, "main"),
    road("interchange-approach", 22, 12, 2, 6, "main"),

    road("terminal-west-access", 3, 3, 1, 9),
    road("brt-terminal-bay-west", 3, 2, 1, 1),
    road("terminal-frontage", 3, 3, 8, 1),
    road("terminal-east-access", 10, 3, 1, 5),
    road("brt-terminal-bay-east", 10, 2, 1, 1),
    road("office-street", 14, 4, 7, 1),
    road("office-east-access", 21, 4, 1, 9),
    road("market-street", 14, 10, 7, 1),
    road("dealership-street", 3, 14, 11, 1),
    road("dealership-access", 3, 12, 1, 5),
    road("bank-parking-access", 15, 14, 3, 1),
    road("east-frontage-north", 21, 4, 6, 1),
    road("east-frontage-south", 21, 10, 6, 1),
    road("east-frontage-connector", 24, 4, 1, 7),

    road("terminal-cutthrough", 4, 6, 6, 1, "dirt"),
    road("market-light-bypass-north", 11, 9, 2, 1, "dirt"),
    road("market-light-bypass-west", 11, 9, 1, 3, "dirt"),
  ],

  barriers: [
    // Four-tile openings around each turning junction give BRTs and
    // two-tile trucks room to rotate without touching the divider ends.
    { id: "highway-median-north-a", ...gridRect(26.95, 0, 0.1, 6) },
    { id: "highway-median-north-b", ...gridRect(26.95, 10, 0.1, 2) },
    // Horizontal centre median. Gaps at X45-X47 and X58-X60 are the
    // controlled connections between the two carriageways.
    {
      id: "lagoon-centre-median-east-a",
      ...gridRect(0, 17.95, 12, 0.1),
    },
  ],

  blocks: [],

  landmarks: [
    {
      id: "central-bus-terminal",
      label: "BUS TERMINAL",
      ...gridRect(4, 4, 6, 2),
      services: ["danfo-terminal", "moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "office-hub",
      label: "OFFICE HUB",
      ...gridRect(18, 5, 3, 2),
      services: ["moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "central-market",
      label: "CENTRAL MARKET",
      ...gridRect(15, 2, 3, 2),
      services: ["danfo-demand", "moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "work-restaurant",
      label: "RESTAURANT ROW",
      ...gridRect(19, 14, 2, 2),
      services: [
        "food-restaurant",
        "moto-eazi-pickup",
        "moto-eazi-dropoff",
      ],
    },
    {
      id: "work-supermarket",
      label: "SUPERMARKET",
      ...gridRect(18, 2, 2, 2),
      services: ["food-supermarket", "moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "work-bank",
      label: "BANK",
      ...gridRect(16, 15, 3, 1),
      services: ["bank", "moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "car-dealership",
      label: "CAR DEALERSHIP",
      ...gridRect(5, 15, 4, 1),
      services: ["buy-car"],
    },
    {
      id: "estate-agency",
      label: "ESTATE AGENCY",
      ...gridRect(11, 15, 1, 1),
      services: ["buy-property"],
    },
    {
      id: "work-petrol-station",
      label: "PETROL STATION",
      ...gridRect(0, 15, 3, 1),
      services: ["fuel"],
    },
  ],

  bankParkingZones: [
    {
      id: "work-bank-loan-parking",
      label: "BANK PARKING",
      ...gridRect(17, 14, 1, 1),
    },
  ],

  dealershipParkingZones: [
    {
      id: "work-dealership-parking",
      label: "PARK HERE TO BUY A CAR",
      ...gridRect(4, 15, 1, 1),
    },
  ],

  estateAgencyParkingZones: [
    {
      id: "work-estate-agency-parking",
      label: "PARK HERE FOR PROPERTY",
      ...gridRect(13, 15, 1, 1),
    },
  ],

  businessOfficeParkingZones: [
    {
      id: "work-office-hub-business-parking",
      label: "PARK HERE TO MANAGE BUSINESS",
      ...gridRect(21, 5, 1, 1),
    },
  ],

  foodParkingZones: [
    {
      id: "work-restaurant-food-parking",
      label: "RESTAURANT PARKING",
      sellerLabel: "Restaurant Row",
      sellerType: "restaurant",
      ...gridRect(21, 14, 1, 1),
    },
    {
      id: "work-supermarket-parking",
      label: "SUPERMARKET PARKING",
      sellerLabel: "Work Hub Supermarket",
      sellerType: "supermarket",
      ...gridRect(20, 3, 1, 1),
    },
  ],

  fuelPumps: [
    pump("work-pump-1", 0, 14),
    pump("work-pump-2", 2, 14),
  ],

  mapTravelZones: [
    {
      id: "east-highway-coast-city-gateway",
      label: "COAST CITY →",
      shortLabel: "COAST CITY →",
      kind: "world-travel",
      orientation: "east",
      warningLabel: "SLOW DOWN · TOLL GATE AHEAD",
      ...gridRect(31, 16, 1, 4),
    },
  ],

  busStops: [
    stop("work-stop-west", "West Gate", 1, 6, ["R1", "W2"]),
    stop("work-stop-terminal-a", "Terminal A", 11, 6, ["R1", "W2", "N1"]),
    stop("work-stop-terminal-b", "Terminal B", 8, 11, ["R3", "W2", "H1"]),
    stop("work-stop-office", "Office Hub", 18, 9, ["W2", "N1"]),
    stop("work-stop-market", "Central Market", 18, 3, ["R1", "W2", "N1"]),
    stop("work-stop-east", "East Gate", 24, 6, ["W2"]),
    stop("work-stop-dealer", "Dealership", 9, 15, ["H1"]),
    stop("work-stop-interchange", "Interchange", 19, 11, ["N1", "H1"]),
  ],
};

const workTrafficLightReservations = [
  [2, 6],
  [2, 9],
  [4, 9],
  [12, 6],
  [12, 11],
  [12, 15],
  [15, 6],
  [15, 9],
  [15, 11],
  [15, 15],
  [25, 6],
  [25, 9],
  [25, 15],
  [28, 6],
  [28, 9],
  [28, 15],
].map(([column, row]) => gridRect(column, row, 1, 1));

const workHeavyVehicleGrassClearances = [
  // Open grass behind the terminal frontage, matching X36-X41 Y2.
  gridRect(4, 2, 6, 1),
  // Clear the two 2x2 plots beside the east terminal exit.
  gridRect(11, 2, 2, 4),
  // Give the west BRT and the freight routes their audited body clearance.
  gridRect(2, 3, 1, 2),
  gridRect(25, 14, 1, 1),
];

function rectanglesOverlap(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

const brtCornerRebuildArea = gridRect(9, 9, 2, 2);

workHub.blocks = createTiledDistrictBlocks({
  idPrefix: "work-plot",
  reserved: [
    ...workHub.roads,
    ...workHub.landmarks,
    ...workHub.bankParkingZones,
    ...workHub.dealershipParkingZones,
    ...workHub.estateAgencyParkingZones,
    ...workHub.foodParkingZones,
    ...workHub.fuelPumps,
    ...workHub.busStops,
    ...workTrafficLightReservations,
    // One-tile off-road tow bay at world X36 Y10.
    gridRect(4, 10, 1, 1),
    gridRect(0, 0, 32, 2),
    gridRect(30, 0, 2, 18),
  ],
})
  .filter((block) => {
    return !workHeavyVehicleGrassClearances.some((clearance) => {
      return rectanglesOverlap(block, clearance);
    });
  })
  .filter((block) => {
    // Rebuild global X41-X42 / Y9-Y10 manually below.
    return !rectanglesOverlap(block, brtCornerRebuildArea);
  });

workHub.blocks.push(
  {
    id: "work-terminal-east-house-north",
    ...gridRect(12, 2, 1, 1),
    plotSize: "1x1",
  },
  {
    id: "work-terminal-east-house-south",
    ...gridRect(12, 5, 1, 1),
    plotSize: "1x1",
  },

  // Global X41 Y9 and X42 Y9 remain grass.
  // Global X41 Y10 and X42 Y10 become two separate one-tile buildings.
  {
    id: "work-brt-corner-house-west",
    ...gridRect(9, 10, 1, 1),
    plotSize: "1x1",
  },
  {
    id: "work-brt-corner-house-east",
    ...gridRect(10, 10, 1, 1),
    plotSize: "1x1",
  },
);
