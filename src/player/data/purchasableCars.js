import { SERVICE_VEHICLES } from './serviceVehicles.js';
import { PLAYER_DANFO } from "./playerDanfo.js";
import { PLAYER_BRT } from "../../employment/data/brtEmployment.js";
import ekoCompactSpriteUrl from "../../assets/vehicles/purchasable/sprites/eko-compact.png";
import mainlandHatchSpriteUrl from "../../assets/vehicles/purchasable/sprites/mainland-hatch.png";
import lagoonSedanSpriteUrl from "../../assets/vehicles/purchasable/sprites/lagoon-sedan.png";
import islandCruiserSpriteUrl from "../../assets/vehicles/purchasable/sprites/island-cruiser.png";
import victoriaExecutiveSpriteUrl from "../../assets/vehicles/purchasable/sprites/victoria-executive.png";
import ekoCompactShowroomUrl from "../../assets/vehicles/purchasable/showroom/eko-compact.png";
import mainlandHatchShowroomUrl from "../../assets/vehicles/purchasable/showroom/mainland-hatch.png";
import lagoonSedanShowroomUrl from "../../assets/vehicles/purchasable/showroom/lagoon-sedan.png";
import islandCruiserShowroomUrl from "../../assets/vehicles/purchasable/showroom/island-cruiser.png";
import victoriaExecutiveShowroomUrl from "../../assets/vehicles/purchasable/showroom/victoria-executive.png";
// Crop the transparent margins around each top-down car image.
const PURCHASED_CAR_SPRITE_CROPS = Object.freeze({
  "eko-compact": Object.freeze({ x: 103, y: 21, width: 177, height: 339 }),
  "mainland-hatch": Object.freeze({ x: 107, y: 28, width: 169, height: 330 }),
  "lagoon-sedan": Object.freeze({ x: 107, y: 15, width: 169, height: 353 }),
  "island-cruiser": Object.freeze({ x: 101, y: 13, width: 182, height: 362 }),
  "victoria-executive": Object.freeze({ x: 119, y: 20, width: 146, height: 345 }),
});

function car(
  id,
  name,
  price,
  transmission,
  colour,
  spriteUrl,
  showroomUrl,
  performance = {},
) {
  const gears = PLAYER_DANFO.gears.map((gear, index) => {
    if (index < PLAYER_DANFO.firstDriveGearIndex) {
      return Object.freeze({ ...gear });
    }

    return Object.freeze({
      ...gear,
      maxSpeed: gear.maxSpeed * (performance.speedMultiplier ?? 1),
      acceleration:
        gear.acceleration * (performance.accelerationMultiplier ?? 1),
    });
  });

  return Object.freeze({
    ...PLAYER_DANFO,
    id,
    name,
    price,
    transmission,
    width: 34,
    length: 58,
    spriteRenderScale: 1,
    colour,
    spriteUrl,
    spriteCrop: PURCHASED_CAR_SPRITE_CROPS[id],
    showroomUrl,
    steeringSpeed: performance.steeringSpeed ?? 2.8,
    gears: Object.freeze(gears),
  });
}

export const PURCHASABLE_CARS = Object.freeze([
  car(
    "eko-compact",
    "Eko Compact",
    120000,
    "manual",
    "#e68a35",
    ekoCompactSpriteUrl,
    ekoCompactShowroomUrl,
    { speedMultiplier: 0.82, accelerationMultiplier: 1.05 },
  ),
  car(
    "mainland-hatch",
    "Mainland Hatch",
    185000,
    "manual",
    "#3cad72",
    mainlandHatchSpriteUrl,
    mainlandHatchShowroomUrl,
    { speedMultiplier: 0.94, accelerationMultiplier: 1.12 },
  ),
  car(
    "lagoon-sedan",
    "Lagoon Sedan",
    295000,
    "automatic",
    "#d6b331",
    lagoonSedanSpriteUrl,
    lagoonSedanShowroomUrl,
    { speedMultiplier: 1.04, accelerationMultiplier: 1.18 },
  ),
  car(
    "island-cruiser",
    "Island Cruiser",
    475000,
    "automatic",
    "#e7edf4",
    islandCruiserSpriteUrl,
    islandCruiserShowroomUrl,
    { speedMultiplier: 1.12, accelerationMultiplier: 1.24 },
  ),
  car(
    "victoria-executive",
    "Victoria Executive",
    780000,
    "automatic",
    "#9f4ed1",
    victoriaExecutiveSpriteUrl,
    victoriaExecutiveShowroomUrl,
    { speedMultiplier: 1.25, accelerationMultiplier: 1.34 },
  ),
]);

export function getPlayerVehicleConfig(vehicleId) {
  if (!vehicleId || vehicleId === PLAYER_DANFO.id) {
    return PLAYER_DANFO;
  }

  if (vehicleId === PLAYER_BRT.id) {
    return PLAYER_BRT;
  }

  return (
    SERVICE_VEHICLES.find(vehicle => vehicle.id === vehicleId) ??
    PURCHASABLE_CARS.find((vehicle) => vehicle.id === vehicleId) ??
    PLAYER_DANFO
  );
}
