import {
  buildings,
  busStops,
  roads,
} from "../src/world/data/worldMap.js";
import { GRID_SIZE } from "../src/world/data/mapConstants.js";

const gap = 2;

function rectanglesTouch(a, b) {
  return (
    a.x <= b.x + b.width + gap &&
    a.x + a.width + gap >= b.x &&
    a.y <= b.y + b.height + gap &&
    a.y + a.height + gap >= b.y
  );
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function nodesTouch(a, b) {
  return rectanglesTouch(a, b);
}

const nodes = [
  ...roads.map((item) => ({ ...item, kind: "road" })),
];

const adjacency = nodes.map(() => []);

for (let left = 0; left < nodes.length; left += 1) {
  for (let right = left + 1; right < nodes.length; right += 1) {
    if (nodesTouch(nodes[left], nodes[right])) {
      adjacency[left].push(right);
      adjacency[right].push(left);
    }
  }
}

const visited = new Set();
const components = [];

for (let index = 0; index < nodes.length; index += 1) {
  if (visited.has(index)) continue;

  const component = [];
  const queue = [index];
  visited.add(index);

  while (queue.length) {
    const current = queue.shift();
    component.push(nodes[current].id);

    adjacency[current].forEach((neighbour) => {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push(neighbour);
      }
    });
  }

  components.push(component);
}

const buildingRoadOverlaps = [];
const buildingBuildingOverlaps = [];
const parallelRoadOverlaps = [];
const offGridRectangles = [...roads, ...buildings].filter((item) => {
  return [item.x, item.y, item.width, item.height].some(
    (value) => value % GRID_SIZE !== 0,
  );
});
const invalidBusStops = busStops.filter((busStop) => {
  return (
    busStop.x % GRID_SIZE !== 0 ||
    busStop.y % GRID_SIZE !== 0 ||
    busStop.width !== GRID_SIZE ||
    busStop.height !== GRID_SIZE
  );
});
const obstructedBusStops = busStops.filter((busStop) => {
  return (
    roads.some((road) => rectanglesOverlap(busStop, road)) ||
    buildings.some((building) => rectanglesOverlap(busStop, building))
  );
});
const busStopsWithoutRoadAccess = busStops.filter((busStop) => {
  return !roads.some((road) => rectanglesTouch(busStop, road));
});
const unconnectedRoadEndpoints = [];

roads.forEach((road) => {
  const horizontal = road.width > road.height;
  const endpoints = horizontal
    ? [
        ["start", road.x, road.y + road.height / 2],
        ["end", road.x + road.width, road.y + road.height / 2],
      ]
    : [
        ["start", road.x + road.width / 2, road.y],
        ["end", road.x + road.width / 2, road.y + road.height],
      ];

  endpoints.forEach(([side, x, y]) => {
    const endpointId = `${road.id}:${side}`;
    if (road.terminalEnds?.includes(side)) return;

    const touchesRoad = roads.some((otherRoad) => {
      return (
        otherRoad !== road &&
        x >= otherRoad.x - gap &&
        x <= otherRoad.x + otherRoad.width + gap &&
        y >= otherRoad.y - gap &&
        y <= otherRoad.y + otherRoad.height + gap
      );
    });

    if (!touchesRoad) {
      unconnectedRoadEndpoints.push(endpointId);
    }
  });
});

for (let left = 0; left < roads.length; left += 1) {
  for (let right = left + 1; right < roads.length; right += 1) {
    const first = roads[left];
    const second = roads[right];
    const firstIsHorizontal = first.width > first.height;
    const secondIsHorizontal = second.width > second.height;

    if (
      firstIsHorizontal === secondIsHorizontal &&
      rectanglesOverlap(first, second)
    ) {
      parallelRoadOverlaps.push(`${first.id} ↔ ${second.id}`);
    }
  }
}

for (let left = 0; left < buildings.length; left += 1) {
  for (let right = left + 1; right < buildings.length; right += 1) {
    if (rectanglesOverlap(buildings[left], buildings[right])) {
      buildingBuildingOverlaps.push(
        `${buildings[left].id} ↔ ${buildings[right].id}`,
      );
    }
  }
}

buildings.forEach((building) => {
  roads.forEach((road) => {
    if (rectanglesOverlap(building, road)) {
      buildingRoadOverlaps.push(`${building.id} ↔ ${road.id}`);
    }
  });

});

console.log(`Road-network components: ${components.length}`);
components
  .sort((a, b) => b.length - a.length)
  .forEach((component, index) => {
    console.log(`  ${index + 1}. ${component.length} nodes: ${component.join(", ")}`);
  });

console.log(`Building/road overlaps: ${buildingRoadOverlaps.length}`);
buildingRoadOverlaps.forEach((overlap) => console.log(`  ${overlap}`));

console.log(`Building/building overlaps: ${buildingBuildingOverlaps.length}`);
buildingBuildingOverlaps.forEach((overlap) => console.log(`  ${overlap}`));

console.log(`Improper parallel-road overlaps: ${parallelRoadOverlaps.length}`);
parallelRoadOverlaps.forEach((overlap) => console.log(`  ${overlap}`));

console.log(`Off-grid roads/buildings: ${offGridRectangles.length}`);
offGridRectangles.forEach((item) => console.log(`  ${item.id}`));

console.log(`Invalid bus-stop grid footprints: ${invalidBusStops.length}`);
invalidBusStops.forEach((item) => console.log(`  ${item.id}`));

console.log(`Obstructed bus stops: ${obstructedBusStops.length}`);
obstructedBusStops.forEach((item) => console.log(`  ${item.id}`));

console.log(`Bus stops without adjacent road access: ${busStopsWithoutRoadAccess.length}`);
busStopsWithoutRoadAccess.forEach((item) => console.log(`  ${item.id}`));

console.log(`Unconnected non-destination road endpoints: ${unconnectedRoadEndpoints.length}`);
unconnectedRoadEndpoints.forEach((item) => console.log(`  ${item}`));

if (
  components.length !== 1 ||
  buildingRoadOverlaps.length !== 0 ||
  buildingBuildingOverlaps.length !== 0 ||
  parallelRoadOverlaps.length !== 0 ||
  offGridRectangles.length !== 0 ||
  invalidBusStops.length !== 0 ||
  obstructedBusStops.length !== 0 ||
  busStopsWithoutRoadAccess.length !== 0 ||
  unconnectedRoadEndpoints.length !== 0
) {
  process.exitCode = 1;
}
