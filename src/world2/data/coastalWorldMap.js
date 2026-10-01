import * as world2 from "./worldMap2.js";
import { WORLD2_POPULATION_ROUTES } from "./populationRoutes.js";

export const COASTAL_MAP_DATA = Object.freeze({
  id: "coastal-city",
  name: "Coast City",
  districts: world2.districts,
  roads: world2.roads,
  barriers: world2.barriers,
  beachParkingZones: world2.beachParkingZones,
  landmarks: world2.landmarks,
  buildings: world2.buildings,
  obstacles: world2.obstacles,
  busStops: world2.busStops,
  fuelPumps: world2.fuelPumps,
  repairZones: world2.repairZones,
  bankParkingZones: world2.bankParkingZones,
  dealershipParkingZones: world2.dealershipParkingZones,
  estateAgencyParkingZones: world2.estateAgencyParkingZones,
  businessOfficeParkingZones: world2.businessOfficeParkingZones,
  homeParkingZones: world2.homeParkingZones,
  healthParkingZones: world2.healthParkingZones,
  foodParkingZones: world2.foodParkingZones,
  mapTravelZones: world2.mapTravelZones,
  raceZones: world2.raceZones,
  trafficSpawnPoints: world2.WORLD2_TRAFFIC_SPAWN_POINTS,
  playerStart: world2.playerStart,
});

export const COASTAL_POPULATION_ROUTES = WORLD2_POPULATION_ROUTES;
