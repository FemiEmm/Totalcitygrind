import { GRID_SIZE } from "./mapConstants.js";

export {
  HIGHWAY_LIGHT_CONFIG,
  TRAFFIC_LIGHT_CONFIG,
} from "../../population/data/trafficLights.js";

const signalApproach = (
  id,
  direction,
  axis,
  stopColumn,
  stopRow,
  signalColumn,
  signalRow,
  rotation,
  metadata = {},
) => Object.freeze({
  id,
  direction,
  axis,
  stopX: stopColumn * GRID_SIZE,
  stopY: stopRow * GRID_SIZE,
  signalX: signalColumn * GRID_SIZE,
  signalY: signalRow * GRID_SIZE,
  rotation,
  ...metadata,
});

const cityLight = (
  id,
  label,
  centreColumn,
  centreRow,
  approaches,
  cycleOffsetSeconds,
  timings = {},
) => Object.freeze({
  id,
  label,
  x: centreColumn * GRID_SIZE,
  y: centreRow * GRID_SIZE,
  cycleOffsetSeconds,
  controlledBoxTiles: 2,
  ...timings,
  approaches: Object.freeze(approaches),
});

const coralVistaVictoriaLight = cityLight(
  "coral-vista-victoria-grand-lights",
  "Coral Vista Drive and Victoria Grand Avenue",
  59,
  7,
  [
    signalApproach(
      "east",
      "east",
      "horizontal",
      57.65,
      6.5,
      57.65,
      8.25,
      Math.PI / 2,
    ),
    signalApproach(
      "west",
      "west",
      "horizontal",
      60.35,
      7.5,
      60.35,
      5.75,
      -Math.PI / 2,
    ),
    signalApproach(
      "north",
      "north",
      "vertical",
      59.5,
      8.35,
      60.25,
      8.35,
      0,
    ),
    signalApproach(
      "south",
      "south",
      "vertical",
      58.5,
      5.65,
      57.75,
      5.65,
      Math.PI,
    ),
  ],
  3,
  {
    horizontalGreenSeconds: 26,
    verticalGreenSeconds: 18,
  },
);

const coralVistaKensingtonLight = cityLight(
  "coral-vista-kensington-row-lights",
  "Coral Vista Drive and Kensington Row",
  59,
  3.5,
  [
    signalApproach(
      "east",
      "east",
      "horizontal",
      57.65,
      3.5,
      57.65,
      4.25,
      Math.PI / 2,
    ),
    signalApproach(
      "north",
      "north",
      "vertical",
      59.5,
      4.35,
      60.25,
      4.35,
      0,
    ),
    signalApproach(
      "south",
      "south",
      "vertical",
      58.5,
      2.65,
      57.75,
      2.65,
      Math.PI,
    ),
  ],
  39,
  {
    horizontalGreenSeconds: 16,
    verticalGreenSeconds: 24,
  },
);

const coralVistaPalmCourtLight = cityLight(
  "coral-vista-palm-court-lights",
  "Coral Vista Drive and Palm Court Avenue",
  59,
  12.5,
  [
    signalApproach(
      "east",
      "east",
      "horizontal",
      57.65,
      12.5,
      57.65,
      13.25,
      Math.PI / 2,
    ),
    signalApproach(
      "north",
      "north",
      "vertical",
      59.5,
      13.35,
      59.25,
      13.35,
      0,
    ),
    signalApproach(
      "south",
      "south",
      "vertical",
      58.5,
      11.65,
      57.75,
      11.65,
      Math.PI,
    ),
  ],
  27,
  {
    horizontalGreenSeconds: 16,
    verticalGreenSeconds: 24,
  },
);

const azurePromenadeGoldCoastLight = cityLight(
  "azure-promenade-gold-coast-lights",
  "Azure Promenade and Gold Coast Boulevard",
  59,
  33.5,
  [
    signalApproach(
      "east",
      "east",
      "horizontal",
      57.65,
      33.5,
      57.65,
      34.25,
      Math.PI / 2,
    ),
    signalApproach(
      "north",
      "north",
      "vertical",
      59.5,
      34.35,
      60.25,
      34.35,
      0,
    ),
    signalApproach(
      "south",
      "south",
      "vertical",
      58.5,
      32.65,
      57.75,
      32.65,
      Math.PI,
      { render: false },
    ),
  ],
  21,
  {
    horizontalGreenSeconds: 16,
    verticalGreenSeconds: 24,
  },
);

export const TRAFFIC_LIGHTS = Object.freeze([
  coralVistaKensingtonLight,
  coralVistaVictoriaLight,
  coralVistaPalmCourtLight,
  azurePromenadeGoldCoastLight,
]);

// Coast City has no signal-controlled junction on its uninterrupted highway.
export const HIGHWAY_LIGHTS = Object.freeze([]);
export const ALL_SIGNAL_LIGHTS = TRAFFIC_LIGHTS;
