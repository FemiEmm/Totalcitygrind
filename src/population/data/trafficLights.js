import { GRID_SIZE } from "../../world/data/mapConstants.js";

export const TRAFFIC_DIRECTIONS = Object.freeze({
  EAST: "east",
  WEST: "west",
  NORTH: "north",
  SOUTH: "south",
});

const {
  EAST,
  WEST,
  NORTH,
  SOUTH,
} = TRAFFIC_DIRECTIONS;

const STOP_OFFSET_CELLS = 1.34;
const LANE_OFFSET_CELLS = 0.55;
const SIGNAL_EDGE_OFFSET_CELLS = 1.25;

function approach(direction, centreColumn, centreRow) {
  const centreX = centreColumn * GRID_SIZE;
  const centreY = centreRow * GRID_SIZE;
  const stopOffset = STOP_OFFSET_CELLS * GRID_SIZE;
  const laneOffset = LANE_OFFSET_CELLS * GRID_SIZE;
  const signalOffset = SIGNAL_EDGE_OFFSET_CELLS * GRID_SIZE;

  if (direction === EAST) {
    return Object.freeze({
      id: EAST,
      direction: EAST,
      axis: "horizontal",
      stopX: centreX - stopOffset,
      stopY: centreY + laneOffset,
      signalX: centreX - stopOffset,
      signalY: centreY + signalOffset,
      rotation: Math.PI / 2,
    });
  }

  if (direction === WEST) {
    return Object.freeze({
      id: WEST,
      direction: WEST,
      axis: "horizontal",
      stopX: centreX + stopOffset,
      stopY: centreY - laneOffset,
      signalX: centreX + stopOffset,
      signalY: centreY - signalOffset,
      rotation: -Math.PI / 2,
    });
  }

  if (direction === NORTH) {
    return Object.freeze({
      id: NORTH,
      direction: NORTH,
      axis: "vertical",
      stopX: centreX + laneOffset,
      stopY: centreY + stopOffset,
      signalX: centreX + signalOffset,
      signalY: centreY + stopOffset,
      rotation: 0,
    });
  }

  return Object.freeze({
    id: SOUTH,
    direction: SOUTH,
    axis: "vertical",
    stopX: centreX - laneOffset,
    stopY: centreY - stopOffset,
    signalX: centreX - signalOffset,
    signalY: centreY - stopOffset,
    rotation: Math.PI,
  });
}

function trafficLight(
  id,
  label,
  centreColumn,
  centreRow,
  directions,
  cycleOffsetSeconds,
) {
  return Object.freeze({
    id,
    label,
    x: centreColumn * GRID_SIZE,
    y: centreRow * GRID_SIZE,
    cycleOffsetSeconds,
    approaches: Object.freeze(
      directions.map((direction) => {
        return approach(direction, centreColumn, centreRow);
      }),
    ),
  });
}

function customTrafficLight(
  id,
  label,
  x,
  y,
  approaches,
  cycleOffsetSeconds,
  metadata = {},
) {
  return Object.freeze({
    id,
    label,
    x,
    y,
    cycleOffsetSeconds,
    ...metadata,
    approaches: Object.freeze(
      approaches.map((entry) => Object.freeze({ ...entry })),
    ),
  });
}

function highwayPriorityCrossingApproaches(
  centreColumn,
  centreRow,
) {
  const centreX = centreColumn * GRID_SIZE;
  const centreY = centreRow * GRID_SIZE;
  const horizontalStopOffset = 1.34 * GRID_SIZE;
  const verticalStopOffset = 2.34 * GRID_SIZE;
  const westSignalX = (centreColumn - 1.25) * GRID_SIZE;
  const eastSignalX = (centreColumn + 1.25) * GRID_SIZE;
  const northSignalY = (centreRow - 2.25) * GRID_SIZE;
  const southSignalY = (centreRow + 2.25) * GRID_SIZE;

  return [
    {
      id: "east-slow",
      direction: EAST,
      axis: "horizontal",
      priority: "highway",
      stopX: centreX - horizontalStopOffset,
      stopY: 19.5 * GRID_SIZE,
      signalX: westSignalX,
      signalY: southSignalY,
      rotation: Math.PI / 2,
    },
    {
      id: "east-fast",
      direction: EAST,
      axis: "horizontal",
      priority: "highway",
      stopX: centreX - horizontalStopOffset,
      stopY: 18.5 * GRID_SIZE,
      signalX: westSignalX,
      signalY: southSignalY,
      rotation: Math.PI / 2,
      render: false,
    },
    {
      id: "west-slow",
      direction: WEST,
      axis: "horizontal",
      priority: "highway",
      stopX: centreX + horizontalStopOffset,
      stopY: 16.5 * GRID_SIZE,
      signalX: eastSignalX,
      signalY: northSignalY,
      rotation: -Math.PI / 2,
    },
    {
      id: "west-fast",
      direction: WEST,
      axis: "horizontal",
      priority: "highway",
      stopX: centreX + horizontalStopOffset,
      stopY: 17.5 * GRID_SIZE,
      signalX: eastSignalX,
      signalY: northSignalY,
      rotation: -Math.PI / 2,
      render: false,
    },
    {
      id: NORTH,
      direction: NORTH,
      axis: "vertical",
      priority: "merge",
      stopX: (centreColumn + 0.55) * GRID_SIZE,
      stopY: centreY + verticalStopOffset,
      signalX: eastSignalX,
      signalY: southSignalY,
      rotation: 0,
    },
    {
      id: SOUTH,
      direction: SOUTH,
      axis: "vertical",
      priority: "merge",
      stopX: (centreColumn - 0.55) * GRID_SIZE,
      stopY: centreY - verticalStopOffset,
      signalX: westSignalX,
      signalY: northSignalY,
      rotation: Math.PI,
    },
  ];
}

function fourLaneHighwayInterchangeApproaches(
  centreColumn,
  centreRow,
) {
  const centreX = centreColumn * GRID_SIZE;
  const centreY = centreRow * GRID_SIZE;
  const horizontalStopOffset = 1.34 * GRID_SIZE;
  // X59 only: keep long north/south vehicles fully outside the interchange
  // while they wait. The visible signal heads are aligned with these lines.
  const verticalStopOffset = 3.1 * GRID_SIZE;
  // Exact visible signal-head tiles requested for the X59 interchange.
  const westSouthSignalX = 57.5 * GRID_SIZE; // X57 Y20
  const westSouthSignalY = 20.5 * GRID_SIZE;
  const westNorthSignalX = 57.5 * GRID_SIZE; // X57 Y14
  const westNorthSignalY = 14.5 * GRID_SIZE;
  const eastNorthSignalX = 60.5 * GRID_SIZE; // X60 Y15
  const eastNorthSignalY = 15.5 * GRID_SIZE;
  const eastSouthSignalX = 60.5 * GRID_SIZE; // X60 Y21
  const eastSouthSignalY = 21.5 * GRID_SIZE;

  return [
    {
      id: "east-slow",
      direction: EAST,
      axis: "horizontal",
      stopX: centreX - horizontalStopOffset,
      stopY: 19.5 * GRID_SIZE,
      signalX: westSouthSignalX,
      signalY: westSouthSignalY,
      rotation: Math.PI / 2,
    },
    {
      id: "east-fast",
      direction: EAST,
      axis: "horizontal",
      stopX: centreX - horizontalStopOffset,
      stopY: 18.5 * GRID_SIZE,
      signalX: westSouthSignalX,
      signalY: westSouthSignalY,
      rotation: Math.PI / 2,
      render: false,
    },
    {
      id: "west-slow",
      direction: WEST,
      axis: "horizontal",
      stopX: centreX + horizontalStopOffset,
      stopY: 16.5 * GRID_SIZE,
      signalX: eastNorthSignalX,
      signalY: eastNorthSignalY,
      rotation: -Math.PI / 2,
    },
    {
      id: "west-fast",
      direction: WEST,
      axis: "horizontal",
      stopX: centreX + horizontalStopOffset,
      stopY: 17.5 * GRID_SIZE,
      signalX: eastNorthSignalX,
      signalY: eastNorthSignalY,
      rotation: -Math.PI / 2,
      render: false,
    },
    {
      id: NORTH,
      direction: NORTH,
      axis: "vertical",
      stopX: 59.55 * GRID_SIZE,
      stopY: centreY + verticalStopOffset,
      // South-side northbound signal: X60 Y21.
      signalX: eastSouthSignalX,
      signalY: eastSouthSignalY,
      rotation: 0,
    },
    {
      id: SOUTH,
      direction: SOUTH,
      axis: "vertical",
      stopX: 58.45 * GRID_SIZE,
      stopY: centreY - verticalStopOffset,
      // North-side southbound signal: X57 Y14.
      signalX: westNorthSignalX,
      signalY: westNorthSignalY,
      rotation: Math.PI,
    },
  ];
}

export const TRAFFIC_LIGHT_CONFIG = Object.freeze({
  horizontalGreenSeconds: 18,
  yellowSeconds: 3,
  // Internal clearance phase (the "blue" phase). Nothing blue is rendered.
  // Both directions remain stopped while committed vehicles leave the junction.
  allRedSeconds: 2.5,
  verticalGreenSeconds: 18,
});

const ALL_TRAFFIC_LIGHTS = Object.freeze([
  customTrafficLight(
    "clinic-t-junction-lights",
    "Clinic T-Junction",
    18 * GRID_SIZE,
    8 * GRID_SIZE,
    [
      approach(EAST, 18, 8),
      approach(WEST, 18, 8),
      {
        ...approach(SOUTH, 18, 8),
        // Clinic Access is a single-tile road centred on X18.5. The generic
        // crossroads helper targets the west lane of a two-tile road, which
        // left southbound clinic traffic outside the signal's lane tolerance.
        stopX: 18.5 * GRID_SIZE,
        stopY: 6.95 * GRID_SIZE,
        // Move only the visible southbound signal from tile X16 Y6
        // to tile X17 Y6.
        signalX: 17.25 * GRID_SIZE,
      },
    ],
    17,
    {
      // The east/west road is the main Clinic corridor. Give both opposing
      // main-road signals a longer shared green than the side-road approach.
      horizontalGreenSeconds: 30,
      verticalGreenSeconds: 10,
      // This compact T-junction has no two-tile central reservation. A
      // general 2x2 clearance box made cars stop again just after green.
      controlledBoxTiles: 1,
      exitClearanceBuffer: 0,
    },
  ),
  trafficLight(
    "east-south-crossroads-lights",
    "East South Crossroads",
    59,
    24,
    [EAST, WEST, NORTH, SOUTH],
    13,
  ),
  trafficLight(
    "west-south-crossroads-lights",
    "West South Crossroads",
    8,
    32,
    [EAST, WEST, NORTH, SOUTH],
    25,
  ),
  trafficLight(
    "east-gate-crossroads-lights",
    "Ikeja Along Crossroads",
    59,
    8,
    [EAST, WEST, NORTH, SOUTH],
    9,
  ),
  trafficLight(
    "residential-crossroads-lights",
    "Ifako-Ijaiye LGA Crossroads",
    25,
    8,
    [EAST, WEST, NORTH, SOUTH],
    3,
  ),
  trafficLight(
    "work-hub-crossroads-lights",
    "Ikeja LGA Crossroads",
    46,
    8,
    [EAST, WEST, NORTH, SOUTH],
    15,
  ),
  trafficLight(
    "wealthy-crossroads-lights",
    "Alimosho LGA Crossroads",
    25,
    24,
    [EAST, WEST, NORTH, SOUTH],
    27,
  ),
  trafficLight(
    "nightlife-crossroads-lights",
    "Mushin LGA Crossroads",
    47,
    24,
    [EAST, WEST, NORTH, SOUTH],
    39,
  ),
  trafficLight(
    "work-market-lights",
    "Work Market Junction",
    46,
    13,
    [EAST, WEST, NORTH, SOUTH],
    11,
  ),
  trafficLight(
    "wealthy-cross-city-lights",
    "Alimosho LGA Cross-City Junction",
    25,
    32,
    [EAST, WEST, SOUTH],
    7,
  ),
  trafficLight(
    "nightlife-cross-city-lights",
    "Mushin LGA Cross-City Junction",
    47,
    32,
    [EAST, WEST, SOUTH],
    31,
  ),
  trafficLight(
    "south-east-crossroads-lights",
    "South-East Crossroads",
    59,
    32,
    [EAST, WEST, NORTH, SOUTH],
    19,
  ),
  customTrafficLight(
    "west-highway-crossing-lights",
    "West Highway Crossing",
    25 * GRID_SIZE,
    18 * GRID_SIZE,
    highwayPriorityCrossingApproaches(25, 18),
    5,
    {
      controlledBoxTiles: 4,
      lightSystem: "highway",
    },
  ),
  customTrafficLight(
    "four-lane-highway-interchange-lights",
    "Four-Lane Highway Interchange",
    59 * GRID_SIZE,
    18 * GRID_SIZE,
    fourLaneHighwayInterchangeApproaches(59, 18),
    5,
    {
      controlledBoxTiles: 4,
      // This existing X59 Y18 light remains a normal traffic light.
      // It uses a three-second all-red clearance after both yellow phases.
      allRedSeconds: 3,
    },
  ),
  trafficLight(
    "harbour-crossroads-lights",
    "Ojuelegba Crossroads",
    40,
    32,
    [EAST, WEST, NORTH, SOUTH],
    37,
  ),
  customTrafficLight(
    "terminal-east-protected-turn-lights",
    "Terminal East Protected BRT Turn",
    42.5 * GRID_SIZE,
    8 * GRID_SIZE,
    [
      {
        id: "east-protected-turn",
        direction: EAST,
        // The eastbound BRT turns left across the westbound lane. Assigning
        // this approach to the vertical phase gives it a protected movement:
        // westbound traffic is red before the BRT enters the turn.
        axis: "vertical",
        // Signal timing is intentionally vertical/protected, but this is
        // still an eastbound lane and needs a vertical stop line.
        stopLineAxis: "horizontal",
        stopX: 41.16 * GRID_SIZE,
        stopY: 8.55 * GRID_SIZE,
        signalX: 41.16 * GRID_SIZE,
        signalY: 9.25 * GRID_SIZE,
        rotation: Math.PI / 2,
      },
      {
        id: WEST,
        direction: WEST,
        axis: "horizontal",
        stopX: 43.84 * GRID_SIZE,
        stopY: 7.45 * GRID_SIZE,
        signalX: 43.84 * GRID_SIZE,
        signalY: 6.75 * GRID_SIZE,
        rotation: -Math.PI / 2,
      },
    ],
    23,
    {
      horizontalGreenSeconds: 24,
      verticalGreenSeconds: 12,
    },
  ),
  customTrafficLight(
    "terminal-west-gate-crossroads-lights",
    "Terminal Ile Epo Crossroads",
    35.5 * GRID_SIZE,
    8 * GRID_SIZE,
    [
      {
        id: EAST,
        direction: EAST,
        axis: "horizontal",
        stopX: 34.16 * GRID_SIZE,
        stopY: 8.55 * GRID_SIZE,
        signalX: 34.16 * GRID_SIZE,
        signalY: 9.25 * GRID_SIZE,
        rotation: Math.PI / 2,
      },
      {
        id: WEST,
        direction: WEST,
        axis: "horizontal",
        stopX: 36.84 * GRID_SIZE,
        stopY: 7.45 * GRID_SIZE,
        signalX: 36.84 * GRID_SIZE,
        signalY: 6.75 * GRID_SIZE,
        rotation: -Math.PI / 2,
      },
      {
        id: NORTH,
        direction: NORTH,
        axis: "vertical",
        stopX: 35.55 * GRID_SIZE,
        stopY: 9.34 * GRID_SIZE,
        signalX: 36.25 * GRID_SIZE,
        signalY: 9.34 * GRID_SIZE,
        rotation: 0,
      },
      {
        id: SOUTH,
        direction: SOUTH,
        axis: "vertical",
        // The terminal bus approaches from the north on the X35 road.
        stopX: 35.5 * GRID_SIZE,
        stopY: 6.95 * GRID_SIZE,
        // Keep this signal visibly inside tile X34 Y6, as requested.
        signalX: 34.72 * GRID_SIZE,
        signalY: 6.62 * GRID_SIZE,
        rotation: Math.PI,
      },
    ],
    29,
  ),
]);


export const HIGHWAY_LIGHT_CONFIG = Object.freeze({
  highwayGreenSeconds: 40,
  highwayYellowSeconds: 3,
  clearanceAfterHighwaySeconds: 2,
  mergeGreenSeconds: 10,
  mergeYellowSeconds: 3,
  clearanceBeforeHighwaySeconds: 3,
});

export const HIGHWAY_LIGHTS = Object.freeze(
  ALL_TRAFFIC_LIGHTS.filter((light) => light.lightSystem === "highway"),
);

export const TRAFFIC_LIGHTS = Object.freeze(
  ALL_TRAFFIC_LIGHTS.filter((light) => light.lightSystem !== "highway"),
);

export const ALL_SIGNAL_LIGHTS = Object.freeze([
  ...TRAFFIC_LIGHTS,
  ...HIGHWAY_LIGHTS,
]);
