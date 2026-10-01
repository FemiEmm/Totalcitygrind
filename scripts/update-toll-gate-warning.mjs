import fs from "node:fs";

for (const path of [
  "src/world/data/workHub.js",
  "src/world2/data/worldMap2.js",
]) {
  const before = fs.readFileSync(path, "utf8");
  const after = before
    .replace("SLOW DOWN · COAST CITY GATE", "SLOW DOWN · TOLL GATE AHEAD")
    .replace("SLOW DOWN · MAINLAND GATE", "SLOW DOWN · TOLL GATE AHEAD");
  if (after === before) throw new Error(`Warning text not found in ${path}`);
  fs.writeFileSync(path, after);
}
