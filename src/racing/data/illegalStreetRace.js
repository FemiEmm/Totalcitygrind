import { POPULATION_VEHICLE_TYPES } from "../../population/data/populationVehicles.js";
import { GRID_SIZE } from "../../world2/data/mapConstants.js";

const RACER_TYPE_IDS = Object.freeze([
  "private-purple-coupe",
  "private-blue-sedan",
  "private-red-hatch",
  "private-white-suv",
]);

const TYPE_BY_ID = new Map(
  POPULATION_VEHICLE_TYPES.map((type) => [type.id, type]),
);

const START_X = 4.5 * GRID_SIZE;
const FINISH = Object.freeze({
  x: 11.5 * GRID_SIZE,
  y: 33.5 * GRID_SIZE,
  radius: GRID_SIZE * 0.8,
  label: "Coast City Beach",
});

const RACER_PERFORMANCE = Object.freeze([
  { maximumSpeed: 1.06, acceleration: 1.12 },
  { maximumSpeed: 0.96, acceleration: 1.24 },
  { maximumSpeed: 1.14, acceleration: 0.92 },
  { maximumSpeed: 1.01, acceleration: 1.04 },
]);

export const MUTIU_STREET_RACE = Object.freeze({
  id: "mutiu-atlantic-crown-dash",
  name: "Atlantic Crown Midnight Dash",
  countdownSeconds: 5,
  start: Object.freeze({
    x: START_X,
    y: 19.5 * GRID_SIZE,
    rotation: Math.PI / 2,
  }),
  finish: FINISH,
  route: Object.freeze([
    Object.freeze({ x: 58.5 * GRID_SIZE, y: 19.5 * GRID_SIZE }),
    Object.freeze({ x: 58.5 * GRID_SIZE, y: 33.5 * GRID_SIZE }),
    FINISH,
  ]),
  rewards: Object.freeze({
    1: 30000,
    2: 14000,
    3: 6000,
    4: 0,
    5: 0,
  }),
  opponents: Object.freeze(
    RACER_TYPE_IDS.map((typeId, index) => {
      const type = TYPE_BY_ID.get(typeId);
      const performance = RACER_PERFORMANCE[index];
      const lane = index % 2;
      const row = Math.floor(index / 2);

      return Object.freeze({
        id: `mutiu-racer-${index + 1}`,
        typeId,
        label: type.label,
        x: START_X - (row + 1) * 86,
        y: (lane === 0 ? 18.5 : 19.5) * GRID_SIZE,
        rotation: Math.PI / 2,
        width: type.width,
        length: type.length,
        renderWidth: type.renderWidth ?? type.width,
        renderLength: type.renderLength ?? type.length,
        spriteUrl: type.spriteUrl,
        spriteCrop: type.spriteCrop ?? null,
        colour: type.colour,
        outlineColour: type.outlineColour,
        frontMarkerColour: type.frontMarkerColour,
        maximumSpeed: type.maximumSpeed * performance.maximumSpeed,
        acceleration: type.acceleration * performance.acceleration,
      });
    }),
  ),
});

export function isMutiuRaceNight(minuteOfDay) {
  const minute =
    ((Number(minuteOfDay) % (24 * 60)) + 24 * 60) %
    (24 * 60);
  return minute >= 18 * 60 || minute < 6 * 60;
}
