import {northernApproachRoads} from './northernApproaches.js';
import { addWorkplaceParking, workplaceParkingClearances } from './workplaceParking.js';
import { schoolCampus, lastmaCompound, lawmaCompound, governorCompound, LASTMA_NORTH_EDGE_OPENING } from './civicSites.js';
import { POLICE_LOTS, POLICE_OBSTACLES } from '../../police/policeSystem.js';
﻿import {
  GRID_SIZE,
  WORLD_HEIGHT,
  WORLD_EDGE_COLOUR,
  WORLD_MAX_X,
  WORLD_MAX_Y,
  WORLD_MIN_X,
  WORLD_MIN_Y,
  WORLD_WIDTH,
} from "./mapConstants.js";
import {
  POPULATION_ROUTES,
} from "../../population/data/populationRoutes.js";
import {
  TRAFFIC_LIGHTS,
} from "../../population/data/trafficLights.js";

import { nightlife } from "./nightlife.js";
import { northernResidential } from "./northernResidential.js";
import { startingResidential } from "./startingResidential.js";
import { wealthyResidential } from "./wealthyResidential.js";
import { workHub } from "./workHub.js";
import { LANDMARK_ASSETS } from "./landmarkAssets.js";
import {
  getGenericBuildingVisual,
} from "./genericBuildingAssets.js";
import { BILLBOARD_BY_BUILDING_ID } from "../../advertising/billboards.js";

export {
  WORLD_HEIGHT,
  WORLD_MAX_X,
  WORLD_MAX_Y,
  WORLD_MIN_X,
  WORLD_MIN_Y,
  WORLD_WIDTH,
};

function getEdgeTileFromPoint(point) {
  if (point.x < 0) {
    return {
      x: -GRID_SIZE,
      y: Math.floor(point.y / GRID_SIZE) * GRID_SIZE,
    };
  }

  if (point.x > WORLD_WIDTH) {
    return {
      x: WORLD_WIDTH,
      y: Math.floor(point.y / GRID_SIZE) * GRID_SIZE,
    };
  }

  if (point.y < 0) {
    return {
      x: Math.floor(point.x / GRID_SIZE) * GRID_SIZE,
      y: point.y < WORLD_MIN_Y ? WORLD_MIN_Y : -GRID_SIZE,
    };
  }

  if (point.y > WORLD_HEIGHT) {
    return {
      x: Math.floor(point.x / GRID_SIZE) * GRID_SIZE,
      y: WORLD_HEIGHT,
    };
  }

  return null;
}

const edgeSpawnGateMap = new Map();

POPULATION_ROUTES.forEach((populationRoute) => {
  const routeEdgePoints = [
    populationRoute.points[0],
    populationRoute.points[
      populationRoute.points.length - 1
    ],
  ];

  routeEdgePoints.forEach((routeEdgePoint) => {
    const edgeTile = getEdgeTileFromPoint(routeEdgePoint);

    if (!edgeTile) {
      return;
    }

    const key = `${edgeTile.x}:${edgeTile.y}`;
    edgeSpawnGateMap.set(key, {
      id: `world-edge-route-gate-${key}`,
      ...edgeTile,
      width: GRID_SIZE,
      height: GRID_SIZE,
      type: "main",
      districtId: "world-edge",
    });
  });
});

// The central four-lane highway must remain open across all four cells at
// both world edges. Some heavy routes stage their full body inside the map,
// so route endpoints alone do not expose every required edge tile.
for (const edgeX of [-GRID_SIZE, WORLD_WIDTH]) {
  for (let row = 16; row <= 19; row += 1) {
    const key = `${edgeX}:${row * GRID_SIZE}`;
    edgeSpawnGateMap.set(key, {
      id: `world-edge-central-highway-gate-${edgeX}-${row}`,
      x: edgeX,
      y: row * GRID_SIZE,
      width: GRID_SIZE,
      height: GRID_SIZE,
      type: "highway",
      districtId: "world-edge",
    });
  }
}

export const edgeSpawnGateRoads = Object.freeze([
  ...edgeSpawnGateMap.values(),
]);

const edgeTileCandidates = [
  { x: -GRID_SIZE, y: -GRID_SIZE },
  { x: WORLD_WIDTH, y: -GRID_SIZE },
  { x: -GRID_SIZE, y: WORLD_HEIGHT },
  { x: WORLD_WIDTH, y: WORLD_HEIGHT },
];

for (
  let column = 0;
  column < WORLD_WIDTH / GRID_SIZE;
  column += 1
) {
  edgeTileCandidates.push(
    { x: column * GRID_SIZE, y: -GRID_SIZE },
    { x: column * GRID_SIZE, y: WORLD_HEIGHT },
  );
}

for (
  let row = 0;
  row < WORLD_HEIGHT / GRID_SIZE;
  row += 1
) {
  edgeTileCandidates.push(
    { x: -GRID_SIZE, y: row * GRID_SIZE },
    { x: WORLD_WIDTH, y: row * GRID_SIZE },
  );
}

export const edgeBorderTiles = Object.freeze(
  edgeTileCandidates
    .filter((tile) => {
      // The old mainland north edge now leads into Sango Otta. It is visual mud, not a collision wall.
      if (tile.y === -GRID_SIZE) return false;
      if (tile.y === -GRID_SIZE && tile.x >= 46*GRID_SIZE && tile.x < 48*GRID_SIZE) return false;
      if (tile.y === -GRID_SIZE && tile.x >= 54*GRID_SIZE && tile.x < 58*GRID_SIZE) return false;
      // Keep both lanes open where the estate extension crosses the old north boundary.
      if (tile.y === -GRID_SIZE && tile.x >= 24 * GRID_SIZE && tile.x < 26 * GRID_SIZE) return false;
      if (tile.y === -GRID_SIZE && tile.x >= LASTMA_NORTH_EDGE_OPENING.firstColumn * GRID_SIZE && tile.x < LASTMA_NORTH_EDGE_OPENING.endColumn * GRID_SIZE) return false;
      return !edgeSpawnGateMap.has(`${tile.x}:${tile.y}`);
    })
    .map((tile, index) => ({
      id: `world-edge-border-${index + 1}`,
      ...tile,
      width: GRID_SIZE,
      height: GRID_SIZE,
      colour: WORLD_EDGE_COLOUR,
      blocksVehicles: true,
      districtId: "world-edge",
    })),
);

export const districts = [
  startingResidential,
  northernResidential,
  workHub,
  wealthyResidential,
  nightlife,
  schoolCampus,
  lastmaCompound,
  lawmaCompound,
  governorCompound,
];

addWorkplaceParking(districts);

function moveItemIntoWorld(district, item) {
  return {
    ...item,
    districtId: district.id,
    x: district.worldX + item.x,
    y: district.worldY + item.y,
  };
}

const districtRoads = districts.flatMap((district) => {
  return district.roads.map((road) => {
    return moveItemIntoWorld(district, road);
  });
});

export const perimeterRoads = [
  {
    id: "world-perimeter-north",
    x: 0,
    y: 0,
    width: WORLD_WIDTH,
    height: GRID_SIZE * 2,
    type: "main",
    districtId: "world-perimeter",
  },
  {
    id: "world-perimeter-south",
    x: 0,
    y: WORLD_HEIGHT - GRID_SIZE * 2,
    width: WORLD_WIDTH,
    height: GRID_SIZE * 2,
    type: "main",
    districtId: "world-perimeter",
  },
  {
    id: "world-perimeter-west",
    x: 0,
    y: 0,
    width: GRID_SIZE * 2,
    height: WORLD_HEIGHT,
    type: "main",
    districtId: "world-perimeter",
  },
  {
    id: "world-perimeter-east",
    x: WORLD_WIDTH - GRID_SIZE * 2,
    y: 0,
    width: GRID_SIZE * 2,
    height: WORLD_HEIGHT,
    type: "main",
    districtId: "world-perimeter",
  },
];

export const roads = [
  ...northernApproachRoads,
  ...districtRoads,
  ...perimeterRoads,
  ...edgeSpawnGateRoads,
];

const TRAFFIC_LIGHT_CONCRETE_SIZE = GRID_SIZE;
const TRAFFIC_LIGHT_COLLISION_SIZE = GRID_SIZE * 0.25;
const trafficLightConcretePadMap = new Map();
const trafficLightCollisionPadMap = new Map();

TRAFFIC_LIGHTS.forEach((trafficLight) => {
  trafficLight.approaches.forEach((approach) => {
    const tileX =
      Math.floor(approach.signalX / GRID_SIZE) * GRID_SIZE;
    const tileY =
      Math.floor(approach.signalY / GRID_SIZE) * GRID_SIZE;
    const key = `${tileX}:${tileY}`;

    if (!trafficLightConcretePadMap.has(key)) {
      trafficLightConcretePadMap.set(key, {
        id: `traffic-light-concrete-${trafficLight.id}-${approach.id}`,
        x: tileX,
        y: tileY,
        width: TRAFFIC_LIGHT_CONCRETE_SIZE,
        height: TRAFFIC_LIGHT_CONCRETE_SIZE,
        districtId: "traffic-light-infrastructure",
      });
    }

    const collisionKey = `${approach.signalX}:${approach.signalY}`;

    if (trafficLightCollisionPadMap.has(collisionKey)) {
      return;
    }

    trafficLightCollisionPadMap.set(collisionKey, {
      id: `traffic-light-base-collision-${trafficLight.id}-${approach.id}`,
      x: approach.signalX - TRAFFIC_LIGHT_COLLISION_SIZE / 2,
      y: approach.signalY - TRAFFIC_LIGHT_COLLISION_SIZE / 2,
      width: TRAFFIC_LIGHT_COLLISION_SIZE,
      height: TRAFFIC_LIGHT_COLLISION_SIZE,
      blocksVehicles: true,
      districtId: "traffic-light-infrastructure",
    });
  });
});

export const trafficLightConcretePads = Object.freeze([
  ...trafficLightConcretePadMap.values(),
]);

export const trafficLightCollisionPads = Object.freeze([
  ...trafficLightCollisionPadMap.values(),
]);

export const barriers = districts.flatMap((district) => {
  return (district.barriers ?? []).map((barrier) => {
    return moveItemIntoWorld(district, {
      ...barrier,
      blocksVehicles: true,
    });
  });
});

function rectanglesOverlap(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function subtractRectangle(source, reserved) {
  if (!rectanglesOverlap(source, reserved)) {
    return [source];
  }

  const overlapLeft = Math.max(source.x, reserved.x);
  const overlapRight = Math.min(
    source.x + source.width,
    reserved.x + reserved.width,
  );
  const overlapTop = Math.max(source.y, reserved.y);
  const overlapBottom = Math.min(
    source.y + source.height,
    reserved.y + reserved.height,
  );

  return [
    {
      ...source,
      x: source.x,
      y: source.y,
      width: source.width,
      height: overlapTop - source.y,
    },
    {
      ...source,
      x: source.x,
      y: overlapBottom,
      width: source.width,
      height: source.y + source.height - overlapBottom,
    },
    {
      ...source,
      x: source.x,
      y: overlapTop,
      width: overlapLeft - source.x,
      height: overlapBottom - overlapTop,
    },
    {
      ...source,
      x: overlapRight,
      y: overlapTop,
      width: source.x + source.width - overlapRight,
      height: overlapBottom - overlapTop,
    },
  ].filter((piece) => {
    return (
      piece.width >= GRID_SIZE &&
      piece.height >= GRID_SIZE
    );
  });
}

const landmarkReservations = districts.flatMap((district) => {
  return district.landmarks.map((landmark) => {
    return moveItemIntoWorld(district, landmark);
  });
});

const busStopReservations = districts.flatMap((district) => {
  return district.busStops.map((busStop) => {
    return moveItemIntoWorld(district, busStop);
  });
});

const healthParkingReservations = districts.flatMap((district) => {
  return (district.healthParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});

const foodParkingReservations = districts.flatMap((district) => {
  return (district.foodParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});
const policeParkingReservations = districts.flatMap((district) => {
  return (district.policeParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});


export const publicParkingZones = districts.flatMap(district =>
  (district.publicParkingZones ?? []).map(zone => moveItemIntoWorld(district, zone)));

const buildingReservations = [
  ...publicParkingZones,
  ...POLICE_LOTS,
  ...roads,
  ...landmarkReservations,
  ...busStopReservations,
  ...healthParkingReservations,
  ...foodParkingReservations,
  ...trafficLightConcretePads,
  ...policeParkingReservations,
];

const BUILDING_SETBACK = 10;

function addPedestrianSetback(building) {
  if (building.singleRoomRow) return { ...building, pedestrianSetback: 0 };
  const inset = Math.min(
    BUILDING_SETBACK,
    Math.max(0, (building.width - GRID_SIZE * 0.6) / 2),
    Math.max(0, (building.height - GRID_SIZE * 0.6) / 2),
  );

  return {
    ...building,
    lotX: building.x,
    lotY: building.y,
    lotWidth: building.width,
    lotHeight: building.height,
    x: building.x + inset,
    y: building.y + inset,
    width: building.width - inset * 2,
    height: building.height - inset * 2,
    pedestrianSetback: inset,
  };
}

export const genericBuildings = districts.flatMap((district) => {
  return district.blocks.flatMap((block) => {
    const worldBlock = moveItemIntoWorld(district, {
      ...block,
      blocksVehicles: true,
      isLandmark: false,
    });

    // Remove the entire decorative footprint for new courts; never crop a house to fit a bay.
    if (workplaceParkingClearances.some(plot => rectanglesOverlap(worldBlock, plot))) return [];
    const pieces = buildingReservations.reduce(
      (remaining, reserved) => {
        return remaining.flatMap((piece) => {
          return subtractRectangle(piece, reserved);
        });
      },
      [worldBlock],
    );

    return pieces.map((piece, index) => {
      const building = {
        ...piece,
        id:
        pieces.length === 1
          ? worldBlock.id
          : `${worldBlock.id}-part-${index + 1}`,
      };
      const billboard = pieces.length === 1 ? BILLBOARD_BY_BUILDING_ID.get(worldBlock.id) : null;

      return addPedestrianSetback({
        ...building,
        ...(billboard ? { billboardId: billboard.id, billboardLabel: billboard.label } : getGenericBuildingVisual(building)),
      });
    });
  });
});

export const landmarks = districts.flatMap((district) => {
  return landmarkReservations
    .filter((landmark) => landmark.districtId === district.id)
    .map((landmark) => {
      return addPedestrianSetback({
        ...landmark,
        blocksVehicles: true,
        isLandmark: true,
        spriteUrl: landmark.spriteUrl ?? LANDMARK_ASSETS[landmark.id] ?? null,
      });
    });
});

export const buildings = [
  ...genericBuildings,
  ...landmarks,
];

export const obstacles = [
  ...POLICE_OBSTACLES,
  ...buildings,
  ...barriers,
  ...trafficLightCollisionPads,
  ...edgeBorderTiles,
];

export const busStops = districts.flatMap((district) => {
  return busStopReservations.filter((busStop) => {
    return busStop.districtId === district.id;
  });
});

export const fuelPumps = districts.flatMap((district) => {
  return (district.fuelPumps ?? []).map((fuelPump) => {
    return moveItemIntoWorld(district, fuelPump);
  });
});

export const repairZones = districts.flatMap((district) => {
  return (district.repairZones ?? []).map((repairZone) => {
    return moveItemIntoWorld(district, repairZone);
  });
});

export const bankParkingZones = districts.flatMap((district) => {
  return (district.bankParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});

export const dealershipParkingZones = districts.flatMap((district) => {
  return (district.dealershipParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});

export const estateAgencyParkingZones = districts.flatMap((district) => {
  return (district.estateAgencyParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});

export const businessOfficeParkingZones = districts.flatMap((district) => {
  return (district.businessOfficeParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});

export const mapTravelZones = districts.flatMap((district) => {
  return (district.mapTravelZones ?? []).map((travelZone) => {
    return moveItemIntoWorld(district, travelZone);
  });
});

export const raceZones = districts.flatMap((district) => {
  return (district.raceZones ?? []).map((raceZone) => {
    return moveItemIntoWorld(district, raceZone);
  });
});

export const homeParkingZones = districts.flatMap((district) => {
  return (district.homeParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});

export const drivingSchoolParkingZones = districts.flatMap((district) => {
  return (district.drivingSchoolParkingZones ?? []).map((parkingZone) => {
    return moveItemIntoWorld(district, parkingZone);
  });
});

export const healthParkingZones = healthParkingReservations;

export const foodParkingZones = foodParkingReservations;

export const policeParkingZones = policeParkingReservations;

export const playerStart = {
  x:
    startingResidential.worldX +
    startingResidential.playerStart.x,

  y:
    startingResidential.worldY +
    startingResidential.playerStart.y,

  rotation:
    startingResidential.playerStart.rotation,
};

export function getDistrictAtWorldPosition(x, y) {
  return (
    districts.find((district) => {
      return (
        x >= district.worldX &&
        x < district.worldX + district.width &&
        y >= district.worldY &&
        y < district.worldY + district.height
      );
    }) ?? null
  );
}




// Deterministic woodland placement, built once; keep all existing plots and road clearances.
const forestReserved=[...roads,...obstacles,...districts.filter(d=>d.id!=='northern-residential').map(d=>({x:d.worldX,y:d.worldY,width:d.width,height:d.height})),{x:12*GRID_SIZE,y:-67*GRID_SIZE,width:26*GRID_SIZE,height:64*GRID_SIZE}];
export const northernForestTiles=[];
for(let row=-69;row<0;row++)for(let column=0;column<64;column++){
 const tile={x:column*GRID_SIZE,y:row*GRID_SIZE,width:GRID_SIZE,height:GRID_SIZE};
 if(forestReserved.some(r=>tile.x<r.x+r.width+10&&tile.x+tile.width>r.x-10&&tile.y<r.y+r.height+10&&tile.y+tile.height>r.y-10))continue;
 const seed=((column*73856093)^(row*19349663))>>>0;
 const positions=seed%2?[[.27,.28],[.72,.38],[.46,.75]]:[[.3,.32],[.69,.7]];
 northernForestTiles.push({...tile,trees:positions.map(([x,y],i)=>({x:tile.x+x*GRID_SIZE,y:tile.y+y*GRID_SIZE,size:(.48+((seed>>>(i*4))%9)/100)*GRID_SIZE,rotation:((seed>>>(i*3))%4)*Math.PI/2}))});
}

// Only the new northern trees are solid. Compact individual trunks keep
// canopy gaps passable and use the existing spatial collision index.
export const northernTreeObstacles = northernForestTiles.flatMap((tile) =>
  tile.trees.map((tree, index) => {
    const diameter = tree.size * 0.42;
    return {
      id: `northern-tree-${tile.x}-${tile.y}-${index}`,
      type: 'tree',
      x: tree.x - diameter / 2,
      y: tree.y - diameter / 2,
      width: diameter,
      height: diameter,
    };
  }),
);
obstacles.push(...northernTreeObstacles);
