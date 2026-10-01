import fs from "node:fs";

const path = "src/world2/components/WorldMap2.vue";
let source = fs.readFileSync(path, "utf8");

function once(find, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(find)) throw new Error(`Missing ${label}`);
  source = source.replace(find, replacement);
}

once(
  '} from "../../property/systems/propertySystem.js";',
  '} from "../../property/systems/propertySystem.js";\nimport {\n  handleLateTenant,\n  listOwnedHome,\n  processRentalDay,\n  removeVacantListing,\n} from "../../property/systems/propertyRentalSystem.js";',
  "rental import",
);

once(
  "\nfunction processCurrentBusinessIncome() {",
  `\nfunction processCurrentRentalIncome() {
  processRentalDay(propertyState, gameClock.day).forEach((event) => {
    if (event.amount > 0) {
      creditIncome({ economyState, amount: event.amount, type: "property-rent", label: "PROPERTY RENT", config: DANFO_ECONOMY_CONFIG });
    }
  });
}

function handleRentalListing({ propertyId, weeklyRent }) {
  listOwnedHome({ propertyState, propertyId, weeklyRent, currentDay: gameClock.day });
}

function handleRentalRemoval(propertyId) {
  removeVacantListing(propertyState, propertyId, gameClock.day);
}

function handleLateRentalAction({ propertyId, action }) {
  handleLateTenant(propertyState, propertyId, action, gameClock.day);
}
\nfunction processCurrentBusinessIncome() {`,
  "rental functions",
);

source = source.replaceAll(
  "processCurrentPropertyMortgage();\n      processCurrentBusinessIncome();",
  "processCurrentPropertyMortgage();\n      processCurrentRentalIncome();\n      processCurrentBusinessIncome();",
).replaceAll(
  "processCurrentPropertyMortgage();\n    processCurrentBusinessIncome();",
  "processCurrentPropertyMortgage();\n    processCurrentRentalIncome();\n    processCurrentBusinessIncome();",
);

once(
  '      :life-obligations="lifeObligationView"\n      :traffic-report="towTruckState.trafficReport"',
  '      :life-obligations="lifeObligationView"\n      :property-state="propertyState"\n      :property-catalogue="PROPERTY_CATALOGUE"\n      :traffic-report="towTruckState.trafficReport"',
  "phone rental props",
);

once(
  '      @sell-stock="handleSellStock"',
  '      @sell-stock="handleSellStock"\n      @list-property-rental="handleRentalListing"\n      @remove-property-rental="handleRentalRemoval"\n      @rental-action="handleLateRentalAction"',
  "phone rental events",
);

fs.writeFileSync(path, source);
