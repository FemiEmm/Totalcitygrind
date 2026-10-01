import fs from "node:fs";
const path = "src/world/components/WorldMap.vue";
let s = fs.readFileSync(path, "utf8");
if (!s.includes('wealthy-home-trees.png')) {
  const anchor = 'import EstateAgencyModal from "../../property/components/EstateAgencyModal.vue";';
  s = s.replace(anchor, `${anchor}\nimport wealthyHomeTreesUrl from "../../assets/buildings/wealthy-home-trees.png";`);
  const drawAnchor = `  if (building.isLandmark && landmarkSprite) {
    drawImageContained(
      context,
      landmarkSprite,
      building.x,
      building.y,
      building.width,
      building.height,
    );

    return;
  }`;
  const replacement = `  if (building.isLandmark && landmarkSprite) {
    drawImageContained(context, landmarkSprite, building.x, building.y, building.width, building.height);
    if (building.id === "lagoon-view-residence") {
      const treeSprite = landmarkSprites.get(wealthyHomeTreesUrl);
      if (!treeSprite) requestMappedCanvasImage({ source: wealthyHomeTreesUrl, target: landmarkSprites, key: wealthyHomeTreesUrl, invalidateStaticMap: true });
      else {
        const size = Math.min(building.width, building.height) * 0.38;
        [[-0.1,-0.08],[0.72,-0.08],[-0.1,0.72],[0.72,0.72]].forEach(([px, py]) => drawImageContained(context, treeSprite, building.x + building.width * px, building.y + building.height * py, size, size));
      }
    }
    return;
  }`;
  if (!s.includes(drawAnchor)) throw new Error("Landmark draw anchor not found");
  s = s.replace(drawAnchor, replacement);
  fs.writeFileSync(path, s);
}
console.log("Wired wealthy home tree decorations.");
