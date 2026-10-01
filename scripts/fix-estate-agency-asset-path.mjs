import fs from "node:fs";

const path = "src/world/data/landmarkAssets.js";
let source = fs.readFileSync(path, "utf8");
source = source.replace(
  "../../assets/buildings/work-skyscraper-1x1.png",
  "../../assets/buildings/generic/work-skyscraper-1x1.png",
);
fs.writeFileSync(path, source);
