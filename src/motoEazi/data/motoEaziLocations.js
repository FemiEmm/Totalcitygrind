import { GRID_SIZE } from "../../world/data/mapConstants.js";
import { nightlife } from "../../world/data/nightlife.js";
import { startingResidential } from "../../world/data/startingResidential.js";
import { wealthyResidential } from "../../world/data/wealthyResidential.js";
import { workHub } from "../../world/data/workHub.js";

const districts = [
  startingResidential,
  workHub,
  wealthyResidential,
  nightlife,
];
const coverageLocationNames = Object.freeze({
  "starting-residential": Object.freeze(["Bolade Street", "Ajayi Close", "Unity Crescent", "Adeniran Junction", "Olaniyi Road", "Peace Estate Gate", "Akinola Avenue", "Community School Corner"]),
  "work-hub": Object.freeze(["Commerce Street", "Marina Office Gate", "Labour House Junction", "Tinubu Market Road", "Enterprise Avenue", "Railway Quarter", "Factory Lane", "Central Exchange"]),
  "wealthy-residential": Object.freeze(["Admiralty Gardens", "Sapphire Close", "Royal Palm Avenue", "Victoria Estate Gate", "Lagoon Crescent", "Embassy Row", "Diamond Court", "Heritage Villas"]),
  nightlife: Object.freeze(["Night and Glam Club Stop", "Rhythm Avenue", "Moonlight Junction", "Carnival Street", "Sunset Lounge", "Freedom Bar Corner", "Starlight Hotel Gate", "After Hours Boulevard"]),
});


// Every passenger point is deliberately centred on a driveable road. Building
// landmarks use their nearest roadside approach for ordinary map navigation,
// but are never added to the Moto Eazi passenger pool.
const roadsideDefinitions = {
  "starting-residential": [
    ["Home Junction Roadside", 6.5, 7.5],
    ["Community Avenue West", 9.5, 7.5],
    ["Estate Gate Roadside", 21.5, 8.5],
    ["Clinic Junction Roadside", 18.5, 7.5],
    ["East Link Roadside", 29.5, 11.5],
  ],
  "work-hub": [
    ["Terminal West Gate", 3.5, 7.5],
    ["Office Street", 19.5, 4.5],
    ["Market Junction", 14.5, 10.5],
    ["Dealership Roadside", 9.5, 14.5],
    ["Interchange Roadside", 23.5, 13.5],
  ],
  "wealthy-residential": [
    ["Estate North Gate", 7.5, 6.5],
    ["Shopping Avenue", 14.5, 9.5],
    ["Hospital Roadside", 3.5, 13.5],
    ["South Estate Roadside", 12.5, 14.5],
    ["Private Hotel Roadside", 24.5, 10.5],
  ],
  nightlife: [
    ["Club Strip West", 3.5, 9.5],
    ["Event Centre Roadside", 13.5, 6.5],
    ["Hotel Strip", 21.5, 10.5],
    ["Beach Roadside", 27.5, 14.5],
    ["Night Market Roadside", 10.5, 13.5],
  ],
};

const roadsideLocations = districts.flatMap((district) => {
  const anchors = getDistrictRoadAnchors(district);
  const used = new Set();
  return roadsideDefinitions[district.id].map(([label, column, row], index) => {
    const desiredX = district.worldX + column * GRID_SIZE;
    const desiredY = district.worldY + row * GRID_SIZE;
    const approach = anchors
      .filter((anchor) => !used.has(Math.round(anchor.x) + ":" + Math.round(anchor.y)))
      .sort((a, b) => Math.hypot(a.x - desiredX, a.y - desiredY) - Math.hypot(b.x - desiredX, b.y - desiredY))[0];
    if (!approach) throw new Error("No safe roadside anchor for " + label);
    used.add(Math.round(approach.x) + ":" + Math.round(approach.y));
    return {
      id: `${district.id}-roadside-${index + 1}`, label,
      districtId: district.id, districtName: district.name, type: "roadside",
      x: approach.x, y: approach.y,
    };
  });
});

function rectanglesContainPoint(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function getDistrictRoadAnchors(district) {
  const candidates = [];

  // Passenger stops belong at a curb on an ordinary street. Highways and
  // overlapping road rectangles are excluded: those are live lanes and
  // junction centres, not safe pickup/drop-off bays.
  district.roads
    .filter((road) => road.type !== "highway" && road.type !== "dirt")
    .forEach((road) => {
      const columns = Math.max(1, Math.round(road.width / GRID_SIZE));
      const rows = Math.max(1, Math.round(road.height / GRID_SIZE));
      const horizontal = columns >= rows;

      for (let column = 0; column < columns; column += 1) {
        for (let row = 0; row < rows; row += 1) {
          const centreX = road.x + (column + 0.5) * GRID_SIZE;
          const centreY = road.y + (row + 0.5) * GRID_SIZE;
          const coveringRoads = district.roads.filter((candidate) =>
            candidate.type !== "dirt" && rectanglesContainPoint(candidate, centreX, centreY),
          );
          if (coveringRoads.length > 1) continue;

          const side = (column + row) % 2 === 0 ? 0.18 : 0.82;
          candidates.push({
            x: district.worldX + (horizontal ? centreX : road.x + (column + side) * GRID_SIZE),
            y: district.worldY + (horizontal ? road.y + (row + side) * GRID_SIZE : centreY),
          });
        }
      }
    });

  const anchors = new Map();
  candidates.forEach((anchor) => anchors.set(Math.round(anchor.x) + ":" + Math.round(anchor.y), anchor));
  return [...anchors.values()];
}
const landmarkLocations = districts.flatMap((district) => {
  const districtRoadsideLocations = roadsideLocations.filter(
    (location) => location.districtId === district.id,
  );
  const occupiedAnchorKeys = new Set(
    districtRoadsideLocations.map((location) => location.x + ":" + location.y),
  );
  const roadAnchors = getDistrictRoadAnchors(district);

  return district.landmarks.map((landmark) => {
    const centre = {
      x: district.worldX + landmark.x + landmark.width / 2,
      y: district.worldY + landmark.y + landmark.height / 2,
    };
    const availableAnchors = roadAnchors.filter((anchor) => {
      return !occupiedAnchorKeys.has(anchor.x + ":" + anchor.y);
    });
    const approach = availableAnchors.sort((first, second) => {
      return (
        Math.hypot(first.x - centre.x, first.y - centre.y) -
        Math.hypot(second.x - centre.x, second.y - centre.y)
      );
    })[0];

    if (!approach) {
      throw new Error("No unique Moto Eazi road approach for " + landmark.id);
    }

    occupiedAnchorKeys.add(approach.x + ":" + approach.y);

    return {
      id: landmark.id,
      label: landmark.label,
      districtId: district.id,
      districtName: district.name,
      type: "place",
      x: approach.x,
      y: approach.y,
    };
  });
});


// Additional street-side pickup points deliberately sample road tiles not already
// used by landmarks. This ensures every district keeps receiving work over long saves.
const districtCoverageLocations = districts.flatMap((district) => {
  const occupied = new Set(
    [...roadsideLocations, ...landmarkLocations]
      .filter((location) => location.districtId === district.id)
      .map((location) => `${location.x}:${location.y}`),
  );
  const candidates = getDistrictRoadAnchors(district).filter(
    (anchor) => !occupied.has(`${anchor.x}:${anchor.y}`),
  );
  const stride = Math.max(1, Math.floor(candidates.length / 8));
  return candidates
    .filter((_, index) => index % stride === 0)
    .slice(0, 8)
    .map((anchor, index) => ({
      id: `${district.id}-coverage-${index + 1}`,
      label: coverageLocationNames[district.id][index],
      districtId: district.id,
      districtName: district.name,
      type: "roadside",
      x: anchor.x,
      y: anchor.y,
    }));
});
const safeLandmarkLocations = landmarkLocations.filter((location) => {
  return location.id !== "player-home";
});

export const MOTO_EAZI_LOCATIONS = Object.freeze(
  [...safeLandmarkLocations, ...roadsideLocations, ...districtCoverageLocations].map((location) => {
    return Object.freeze(location);
  }),
);

export const MAP_DRIVING_LOCATIONS = Object.freeze(
  [...landmarkLocations, ...roadsideLocations, ...districtCoverageLocations].map((location) => {
    return Object.freeze(location);
  }),
);


