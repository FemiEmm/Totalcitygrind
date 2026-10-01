import fs from "node:fs";

function replace(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Missing expected text in ${path}: ${before}`);
  fs.writeFileSync(path, source.replace(before, after));
}

replace("src/world/data/landmarkAssets.js",
  'import mainlandTerraceHomeUrl from "../../assets/buildings/mainland-terrace-home.png";',
  'import mainlandTerraceHomeUrl from "../../assets/buildings/mainland-terrace-home.png";\nimport lagoonViewResidenceUrl from "../../assets/buildings/lagoon-view-residence.png";');
replace("src/world/data/landmarkAssets.js", '"lagoon-view-residence": playerHomeUrl', '"lagoon-view-residence": lagoonViewResidenceUrl');
replace("src/world/data/wealthyResidential.js", "...gridRect(5, 3, 2, 2)", "...gridRect(5, 2, 2, 2)");
replace("src/world/data/wealthyResidential.js", "...gridRect(9, 3, 1, 1)", "...gridRect(8, 3, 1, 1)");
replace("src/world/data/wealthyResidential.js", 'stop("wealth-stop-north", "Estate North", 7, 4, ["H1"])', 'stop("wealth-stop-north", "Estate North", 8, 4, ["H1"])');

replace("src/property/systems/propertySystem.js",
  'import { getPropertyById } from "../data/properties.js";',
  'import { getPropertyById } from "../data/properties.js";\nimport { createRentalState } from "./propertyRentalSystem.js";');
replace("src/property/systems/propertySystem.js",
  '    starterHomeRisk: {\n      lastTheftDay: 0,\n      missingCarPart: false,\n    },',
  '    starterHomeRisk: {\n      lastTheftDay: 0,\n      missingCarPart: false,\n    },\n    rentals: createRentalState(),');
replace("src/property/systems/propertySystem.js",
  '  state.starterHomeRisk = {\n    lastTheftDay: Math.max(0, Number(savedState.starterHomeRisk?.lastTheftDay) || 0),\n    missingCarPart: Boolean(savedState.starterHomeRisk?.missingCarPart),\n  };',
  '  state.starterHomeRisk = {\n    lastTheftDay: Math.max(0, Number(savedState.starterHomeRisk?.lastTheftDay) || 0),\n    missingCarPart: Boolean(savedState.starterHomeRisk?.missingCarPart),\n  };\n  state.rentals = createRentalState(savedState.rentals);');

console.log("Applied wealthy residence and rental state update.");
