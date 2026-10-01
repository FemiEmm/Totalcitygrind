import { GRID_SIZE, gridRect } from "../../world/data/mapConstants.js";

export const COASTAL_CIRCUIT = Object.freeze({
  id: "lagos-coastal-time-trial",
  name: "Lagos Coastal Time Trial",
  entryFee: 10000,
  firstPlaceTime: 55,
  secondPlaceTime: 75,
  completionTime: 105,
  rewards: Object.freeze({
    gold: 75000,
    silver: 40000,
    bronze: 20000,
    finish: 7500,
  }),
  start: Object.freeze({
    x: 27.5 * GRID_SIZE,
    y: 3 * GRID_SIZE,
    rotation: Math.PI / 2,
  }),
  checkpoints: Object.freeze([
    Object.freeze({ id: "north", ...gridRect(35, 2, 2, 2) }),
    Object.freeze({ id: "east", ...gridRect(44, 6, 2, 2) }),
    Object.freeze({ id: "south", ...gridRect(35, 11, 2, 2) }),
    Object.freeze({ id: "west", ...gridRect(26, 6, 2, 2) }),
    Object.freeze({ id: "finish", ...gridRect(27, 2, 2, 2) }),
  ]),
});
