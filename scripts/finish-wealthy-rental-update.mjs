import fs from "node:fs";
const path = "src/property/systems/propertySystem.js";
let source = fs.readFileSync(path, "utf8");
if (!source.includes("rentals: createRentalState()")) {
  source = source.replace(/(missingCarPart:\s*false,\s*\r?\n\s*},)/, "$1\n    rentals: createRentalState(),");
}
if (!source.includes("state.rentals = createRentalState")) {
  source = source.replace(/(missingCarPart:\s*Boolean\(savedState\.starterHomeRisk\?\.missingCarPart\),\s*\r?\n\s*};)/, "$1\n  state.rentals = createRentalState(savedState.rentals);");
}
fs.writeFileSync(path, source);
console.log("Finished property rental save migration.");
