import { EXPANDED_HOMES } from '../../property/data/expandedHomes.js';
import {
  DISTRICT_HEIGHT,
  DISTRICT_WIDTH,
  GRID_SIZE,
  GROUND_COLOUR,
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

const block = (id, column, row, columns = 2, rows = 2) => ({
  id,
  ...gridRect(column, row, columns, rows),
  neighbourhoodStyle: "upscale-compound",
});

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

export const wealthyResidential = {
  id: "wealthy-residential",
  name: "Alimosho LGA",
  worldX: 0,
  worldY: DISTRICT_HEIGHT,
  width: DISTRICT_WIDTH,
  height: DISTRICT_HEIGHT,
  ground: GROUND_COLOUR,

  roads: [
    road("estate-spine-south", 24, 0, 2, 15, "main"),
    road("southern-city-avenue-west", 1, 5, 31, 2, "main"),
    road("southern-cross-city-west", 1, 13, 31, 2, "main"),

    // The former row-two frontage strip made the four-lane highway look
    // like a fifth lane. The three estate access roads now meet the highway
    // independently, leaving a grass shoulder between them.
    road("north-estate-loop-west", 3, 2, 1, 4),
    road("north-estate-loop-east", 16, 2, 1, 4),
    road("north-estate-inner-access", 9, 2, 1, 4),

    road("south-estate-loop-north", 4, 9, 15, 1),
    road("south-estate-loop-west", 4, 6, 1, 8),
    road("south-estate-loop-east", 19, 9, 1, 5),
    road("shopping-centre-access", 19, 9, 6, 1),
    road("hotel-drive", 28, 6, 1, 8),
    road("private-lane", 25, 9, 4, 1),
    road("wealthy-petrol-access", 30, 3, 1, 3),
    road("gated-dead-end", 30, 6, 1, 6, "local", {
      terminalEnds: ["end"],
    }),
    road("southwest-boundary-access", 8, 14, 1, 3),

    road("estate-crossroads-bypass-north", 22, 3, 2, 1, "dirt"),
    road("estate-crossroads-bypass-west", 22, 3, 1, 2, "dirt"),
    road("estate-cross-city-bypass-north", 21, 11, 3, 1, "dirt"),
    road("estate-cross-city-bypass-west", 21, 11, 1, 2, "dirt"),
  ],

  barriers: [],

  blocks: [
    block("wealth-compound-01", 2, 0),
    block("wealth-compound-02", 5, 0),
    block("wealth-compound-03", 8, 0),
    block("wealth-compound-04", 11, 0),
    block("wealth-compound-05", 14, 0),
    block("wealth-compound-06", 17, 0),
    block("wealth-compound-07", 20, 0),

    block("wealth-compound-09", 11, 3),
    block("wealth-compound-10", 14, 3),
    block("wealth-compound-11", 17, 3),
    block("wealth-compound-12", 26, 3),

    block("wealth-compound-13", 2, 7),
    block("wealth-compound-14", 5, 7),
    block("wealth-compound-15", 8, 7),
    block("wealth-compound-16", 11, 7),
    block("wealth-compound-17", 20, 7),
    block("wealth-compound-18", 26, 7),

    block("wealth-compound-19", 5, 10),
    block("wealth-compound-20", 8, 10),
    block("wealth-compound-21", 11, 10),
    block("wealth-compound-22", 14, 10),
    block("wealth-compound-23", 17, 10),
  ],

  landmarks: [
    {
      id: "wealthy-shopping-centre",
      label: "SUPERMARKET",
      ...gridRect(14, 7, 3, 2),
      services: [
        "food-supermarket",
        "moto-eazi-pickup",
        "moto-eazi-dropoff",
      ],
    },
    {
      id: "wealthy-restaurant",
      label: "UPSCALE RESTAURANT",
      ...gridRect(21, 10, 3, 1),
      services: [
        "food-restaurant",
        "moto-eazi-pickup",
        "moto-eazi-dropoff",
      ],
    },
    {
      id: "private-hospital",
      label: "IGANDO CLINIC",
      ...gridRect(2, 10, 2, 2),
      services: [
        "health-private",
        "moto-eazi-pickup",
        "moto-eazi-dropoff",
      ],
    },
    {
      id: "luxury-hotel",
      label: "EJIGBO HOTEL",
      ...gridRect(26, 10, 2, 2),
      services: ["moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "wealthy-petrol-station",
      label: "PETROL STATION",
      ...gridRect(27, 2, 3, 2),
      services: ["fuel", "moto-eazi-pickup", "moto-eazi-dropoff"],
    },
    {
      id: "lagoon-view-residence",
      label: "LAGOON VIEW RESIDENCE",
      ...gridRect(5, 2, 2, 2),
      services: ["owned-home"],
    },
  ],

  homeParkingZones: [
    {
      id: "lagoon-view-residence-parking",
      label: "LAGOON VIEW PARKING",
      homeId: "wealthy-estate-home",
      shortLabel: "LV", parkingFront: "east",
      ...gridRect(8, 3, 1, 1),
    },
  ],

  fuelPumps: [
    pump("wealthy-pump-1", 30, 2),
    pump("wealthy-pump-2", 29, 4),
  ],

  healthParkingZones: [
    {
      id: "private-clinic-parking",
      label: "IGANDO CLINIC PARKING",
      provider: "Igando Clinic",
      providerType: "private-clinic",
      ...gridRect(2, 12, 1, 1),
    },
  ],

  foodParkingZones: [
    {
      id: "wealthy-supermarket-parking",
      label: "SUPERMARKET PARKING",
      sellerLabel: "Lekki Supermarket",
      sellerType: "supermarket",
      ...gridRect(17, 7, 1, 1),
    },
    {
      id: "wealthy-restaurant-food-parking",
      label: "RESTAURANT PARKING",
      sellerLabel: "Upscale Restaurant",
      sellerType: "restaurant",
      ...gridRect(20, 10, 1, 1),
    },
  ],

  mapTravelZones: [],

  busStops: [
    stop("wealth-stop-olowo-epo", "Gowon Estate", 13, 2, ["H1"]),
    stop("wealth-stop-waterway", "Akowonjo", 31, 2, ["H1"]),
    stop("wealth-stop-north", "Egbeda", 8, 4, ["H1"]),
    stop("wealth-stop-circle", "Shasha", 21, 4, ["H1", "R4"]),
    stop("wealth-stop-shopping", "Idimu", 18, 8, ["H1"]),
    stop("wealth-stop-hospital", "Igando", 3, 12, ["H1"]),
    stop("wealth-stop-south", "Ikotun", 12, 15, ["H1"]),
    stop("wealth-stop-hotel", "Ejigbo", 27, 12, ["H1", "R4"]),
  ],
};

// Dedicated one-tile courts in existing grass, with no building or road removal.
for(const home of EXPANDED_HOMES){
 const bounds=gridRect(home.parking.x,home.parking.y-18,1,1);
 wealthyResidential.homeParkingZones.push({id:home.id+'-parking',homeId:home.id,label:home.name.toUpperCase()+' PARKING',shortLabel:'H'+home.id.split('-').at(-1),parkingFront:home.parking.x===2?'west':home.parking.y===22||home.parking.y===30?'south':'north',...bounds});
 wealthyResidential.roads.push({id:home.id+'-court',privateParking:true,type:'local',...bounds});
}
