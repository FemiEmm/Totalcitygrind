import fs from "node:fs";

const files = [
  "src/world/components/WorldMap.vue",
  "src/world2/components/WorldMap2.vue",
];

const replacement = `function drawMapTravelGateway(context, zone) {
  context.save();

  // One square gate marker per tile: four vertically aligned markers for Y16-Y19.
  const markerSize = Math.min(GRID_SIZE * 0.68, zone.width - 10);
  const markerX = zone.x + (zone.width - markerSize) / 2;
  const markerCount = Math.max(1, Math.round(zone.height / GRID_SIZE));

  for (let tileIndex = 0; tileIndex < markerCount; tileIndex += 1) {
    const markerY =
      zone.y + tileIndex * GRID_SIZE + (GRID_SIZE - markerSize) / 2;
    context.fillStyle = "#14213d";
    context.fillRect(markerX - 4, markerY - 4, markerSize + 8, markerSize + 8);
    context.fillStyle = "#ffca3a";
    context.fillRect(markerX, markerY, markerSize, markerSize);
    context.fillStyle = "#ff595e";
    const stripeHeight = markerSize / 4;
    context.fillRect(markerX, markerY, markerSize, stripeHeight);
    context.fillRect(markerX, markerY + stripeHeight * 2, markerSize, stripeHeight);
  }

  const textDirection = zone.orientation === "west" ? 1 : -1;
  const warningX = zone.x + zone.width / 2 + textDirection * GRID_SIZE * 2.15;
  const warningY = zone.y + zone.height / 2 - 8;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  context.font = "900 19px Basic, sans-serif";
  context.fillText(zone.warningLabel || "SLOW DOWN", warningX, warningY);

  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.font = "900 14px Basic, sans-serif";
  const destination = zone.shortLabel || zone.label;
  context.fillText(destination, warningX, warningY + 25);
  context.restore();
}

function drawServiceParkingZone`;

for (const path of files) {
  const before = fs.readFileSync(path, "utf8");
  const pattern = /function drawMapTravelGateway\(context, zone\) \{[\s\S]*?\n\}\n\nfunction drawServiceParkingZone/;
  const after = before.replace(pattern, replacement);
  if (after === before) {
    throw new Error(`Travel gate renderer not found in ${path}`);
  }
  fs.writeFileSync(path, after);
}
