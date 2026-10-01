import fs from "node:fs";

function update(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No change made to ${path}`);
  fs.writeFileSync(path, after);
}

update("src/population/data/trafficLights.js", (source) => source.replace(
  `      horizontalGreenSeconds: 30,
      verticalGreenSeconds: 10,`,
  `      horizontalGreenSeconds: 30,
      verticalGreenSeconds: 10,
      // This compact T-junction has no two-tile central reservation. A
      // general 2x2 clearance box made cars stop again just after green.
      controlledBoxTiles: 1,
      exitClearanceBuffer: 0,`,
));

update("src/world/data/landmarkAssets.js", (source) => {
  let next = source.replace(
    `import workRestaurantRowUrl from "../../assets/buildings/work-restaurant-row.png";`,
    `import workRestaurantRowUrl from "../../assets/buildings/work-restaurant-row.png";\nimport workSkyscraperSquareUrl from "../../assets/buildings/work-skyscraper-1x1.png";`,
  );
  next = next.replace(`  "estate-agency": officeHubUrl,`, `  "estate-agency": workSkyscraperSquareUrl,`);
  return next;
});

update("src/world/data/nightlife.js", (source) => {
  let next = source.replace(
    `      ...gridRect(19, 4, 1, 1),`,
    `      // The artwork is a native 2:1 roof strip; reserve its real 2x1 footprint.\n      ...gridRect(19, 4, 2, 1),`,
  );
  next = next.replace(
    `      ...gridRect(20, 4, 1, 1),`,
    `      // Dedicated curb bay immediately east of the restaurant strip.\n      ...gridRect(21, 4, 1, 1),`,
  );
  return next;
});

update("src/motoEazi/data/motoEaziLocations.js", (source) => {
  const start = source.indexOf("function getDistrictRoadAnchors(district) {");
  const end = source.indexOf("\nconst landmarkLocations", start);
  if (start < 0 || end < 0) throw new Error("Road-anchor function not found");

  const replacement = `function rectanglesContainPoint(rect, x, y) {
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
}`;
  let next = source.slice(0, start) + replacement + source.slice(end);

  // Hand-authored points also use the same audited curb pool. Replace each
  // raw lane-centre coordinate with its nearest available curb anchor.
  next = next.replace(
    `const roadsideLocations = districts.flatMap((district) => {
  return roadsideDefinitions[district.id].map(
    ([label, column, row], index) => ({
      id: \`${"${district.id}"}-roadside-${"${index + 1}"}\`,
      label,
      districtId: district.id,
      districtName: district.name,
      type: "roadside",
      x: district.worldX + column * GRID_SIZE,
      y: district.worldY + row * GRID_SIZE,
    }),
  );
});`,
    `const roadsideLocations = districts.flatMap((district) => {
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
      id: \`${"${district.id}"}-roadside-${"${index + 1}"}\`, label,
      districtId: district.id, districtName: district.name, type: "roadside",
      x: approach.x, y: approach.y,
    };
  });
});`,
  );
  return next;
});
