import brtSpriteUrl from "../../assets/population/brt.png";
import { PLAYER_DANFO } from "../../player/data/playerDanfo.js";
import { GRID_SIZE } from "../../world/data/mapConstants.js";

const brtGears = PLAYER_DANFO.gears.map((gear, index) => {
  if (index < PLAYER_DANFO.firstDriveGearIndex) {
    return Object.freeze({ ...gear });
  }

  return Object.freeze({
    ...gear,
    maxSpeed: gear.maxSpeed * 0.56,
    acceleration: gear.acceleration * 0.58,
  });
});

export const PLAYER_BRT = Object.freeze({
  ...PLAYER_DANFO,
  id: "player-brt",
  name: "Lagos BRT",
  transmission: "manual",
  width: 58,
  length: 180,
  spriteUrl: brtSpriteUrl,
  spriteCrop: null,
  spriteRenderScale: 1,
  steeringSpeed: 1.25,
  gears: Object.freeze(brtGears),
});

export const BRT_ROUTE_SALARY = 20000;
export const BRT_ROUTE_SALARY_PER_TILE = 575;

export function getBrtRouteSalary(route, stops) {
  const stopById = new Map((stops ?? []).map((stop) => [stop.id, stop]));
  let distance = 0;

  for (let index = 1; index < (route?.stopIds?.length ?? 0); index += 1) {
    const previous = stopById.get(route.stopIds[index - 1]);
    const current = stopById.get(route.stopIds[index]);
    if (!previous || !current) continue;
    const previousX = previous.x + previous.width / 2;
    const previousY = previous.y + previous.height / 2;
    const currentX = current.x + current.width / 2;
    const currentY = current.y + current.height / 2;
    distance += Math.hypot(currentX - previousX, currentY - previousY);
  }

  const distanceTiles = distance / GRID_SIZE;
  const stopAllowance = Math.max(0, (route?.stopIds?.length ?? 0) - 2) * 175;
  const distancePay = distanceTiles * BRT_ROUTE_SALARY_PER_TILE;
  return Math.min(
    65000,
    Math.max(
      BRT_ROUTE_SALARY,
      Math.round((9000 + distancePay + stopAllowance) / 100) * 100,
    ),
  );
}

export const BRT_PASSENGER_CONFIG = Object.freeze({
  capacity: 48,
  minimumWaitingPerStop: 5,
  maximumWaitingPerStop: 16,
  baseFare: 0,
  farePerStop: 0,
  feedbackSeconds: 2.4,
});

// These services reuse the audited forward stop order of the existing Danfo
// corridors. A stop is never reused in reverse on the same BRT service: when
// the bus is beside the kerb, its following stop remains ahead in that lane's
// flow. The first and last stop of each list are that service's termini.
export const BRT_ROUTES = Object.freeze([
  Object.freeze({
    id: "BRT-A",
    name: "Alakuko–Iyana Ipaja Service",
    direction: "Alakuko Terminus → Iyana Ipaja",
    stopIds: Object.freeze([
      "res-stop-home",
      "res-stop-garage",
      "res-stop-estate",
      "work-stop-west",
      "work-stop-terminal-a",
    ]),
  }),
  Object.freeze({
    id: "BRT-B",
    name: "Iyana Ipaja–Alimosho Express",
    direction: "Iyana Ipaja → Alakuko Terminus via Alimosho LGA",
    stopIds: Object.freeze([
      "work-stop-terminal-a",
      "work-stop-market",
      "work-stop-office",
      "work-stop-interchange",
      "work-stop-dealer",
      "wealth-stop-hotel",
      "wealth-stop-circle",
      "wealth-stop-shopping",
      "wealth-stop-south",
      "res-stop-east",
      "res-stop-estate",
      "res-stop-clinic",
      "res-stop-home",
    ]),
  }),
  Object.freeze({
    id: "BRT-C",
    name: "Igando–Dopemu Service",
    direction: "Igando Terminus → Dopemu",
    stopIds: Object.freeze([
      "wealth-stop-hospital",
      "wealth-stop-south",
      "wealth-stop-shopping",
      "wealth-stop-circle",
      "wealth-stop-hotel",
      "work-stop-dealer",
      "work-stop-interchange",
      "work-stop-terminal-b",
    ]),
  }),
  Object.freeze({
    id: "BRT-D",
    name: "Oyingbo–Alimosho Cross-City",
    direction: "Oyingbo → Alakuko Terminus via Alimosho LGA",
    stopIds: Object.freeze([
      "night-stop-south-terminal",
      "night-stop-events",
      "night-stop-harbour",
      "night-stop-circle",
      "night-stop-work-link",
      "work-stop-interchange",
      "work-stop-dealer",
      "wealth-stop-hotel",
      "wealth-stop-circle",
      "wealth-stop-shopping",
      "wealth-stop-south",
      "res-stop-east",
      "res-stop-estate",
      "res-stop-home",
    ]),
  }),
  Object.freeze({
    id: "BRT-E",
    name: "All Lagos Grand Trunk",
    direction: "Alakuko Terminus → Oyingbo",
    stopIds: Object.freeze([
      "res-stop-home",
      "res-stop-clinic",
      "res-stop-east",
      "wealth-stop-circle",
      "wealth-stop-shopping",
      "wealth-stop-hotel",
      "work-stop-dealer",
      "work-stop-interchange",
      "night-stop-work-link",
      "night-stop-clubs",
      "night-stop-harbour",
      "night-stop-events",
      "night-stop-south-terminal",
    ]),
  }),
]);