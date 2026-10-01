import fs from "node:fs";

function edit(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No changes made to ${path}`);
  fs.writeFileSync(path, after);
}

function replaceRequired(source, search, replacement, label) {
  const next = source.replace(search, replacement);
  if (next === source) throw new Error(`Missing ${label}`);
  return next;
}

edit("src/world/data/workHub.js", (source) => {
  source = replaceRequired(
    source,
`    {
      id: "lagoon-centre-median-east-c",
      ...gridRect(29, 17.95, 3, 0.1),
    },
`,
    "",
    "final Mainland highway median segment",
  );
  source = replaceRequired(
    source,
`      orientation: "east",
      ...gridRect(31, 16, 1, 4),`,
`      orientation: "east",
      warningLabel: "SLOW DOWN · COAST CITY GATE",
      ...gridRect(31, 16, 1, 4),`,
    "Mainland gateway warning",
  );
  return source;
});

edit("src/world2/data/worldMap2.js", (source) => {
  source = replaceRequired(
    source,
`export const WORLD2_RETURN_ZONE = Object.freeze({
  ...gridRect(0, 6, 1, 2),
});`,
`export const WORLD2_RETURN_ZONE = Object.freeze({
  ...gridRect(0, 16, 1, 4),
});`,
    "Coast City return gateway position",
  );
  source = replaceRequired(
    source,
`    orientation: "west",
    ...WORLD2_RETURN_ZONE,`,
`    orientation: "west",
    warningLabel: "SLOW DOWN · MAINLAND GATE",
    ...WORLD2_RETURN_ZONE,`,
    "Coast City gateway warning",
  );
  return source;
});

const gatewayRenderer = `function drawMapTravelGateway(context, zone) {
  context.save();

  // The entrance occupies X63, Y16-Y19 (or the mirrored Coast City edge).
  // Each end marker is a true square contained inside its own 1x1 tile.
  const markerSize = Math.min(GRID_SIZE * 0.72, zone.width - 10);
  const markerX = zone.x + (zone.width - markerSize) / 2;
  const markerYs = [
    zone.y + (GRID_SIZE - markerSize) / 2,
    zone.y + zone.height - GRID_SIZE + (GRID_SIZE - markerSize) / 2,
  ];

  markerYs.forEach((markerY) => {
    context.fillStyle = "#14213d";
    context.fillRect(markerX - 4, markerY - 4, markerSize + 8, markerSize + 8);
    context.fillStyle = "#ffca3a";
    context.fillRect(markerX, markerY, markerSize, markerSize);
    context.fillStyle = "#ff595e";
    const stripeHeight = markerSize / 4;
    context.fillRect(markerX, markerY, markerSize, stripeHeight);
    context.fillRect(markerX, markerY + stripeHeight * 2, markerSize, stripeHeight);
  });

  const textDirection = zone.orientation === "west" ? 1 : -1;
  const warningX = zone.x + zone.width / 2 + textDirection * GRID_SIZE * 2.15;
  const warningY = zone.y + zone.height / 2 - 8;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "#14213d";
  context.fillStyle = "#ffca3a";
  context.lineWidth = 7;
  context.font = "900 19px Basic, sans-serif";
  context.strokeText(zone.warningLabel || "SLOW DOWN", warningX, warningY);
  context.fillText(zone.warningLabel || "SLOW DOWN", warningX, warningY);

  context.fillStyle = "#ffffff";
  context.lineWidth = 6;
  context.font = "900 14px Basic, sans-serif";
  const destination = zone.shortLabel || zone.label;
  context.strokeText(destination, warningX, warningY + 25);
  context.fillText(destination, warningX, warningY + 25);
  context.restore();
}`;

for (const path of [
  "src/world/components/WorldMap.vue",
  "src/world2/components/WorldMap2.vue",
]) {
  edit(path, (source) => replaceRequired(
    source,
    /function drawMapTravelGateway\(context, zone\) \{[\s\S]*?\n\}/,
    gatewayRenderer,
    `${path} gateway renderer`,
  ));
}

console.log("Fixed Coast City gate layout and Mainland divider.");
