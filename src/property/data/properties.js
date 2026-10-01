export const PROPERTY_CATALOGUE = Object.freeze([
  Object.freeze({
    id: "starter-rental",
    name: "First Step Flat",
    district: "Starting Residential",
    tenure: "rental",
    price: 0,
    deposit: 0,
    weeklyPayment: 20000,
    description: "Your current rented home. A practical place to begin.",
    benefits: Object.freeze(["Home parking", "Sleep and save"]),
  }),
  Object.freeze({
    id: "mainland-home",
    name: "Mainland Terrace",
    district: "Starting Residential",
    tenure: "ownership",
    price: 750000,
    deposit: 200000,
    weeklyPayment: 27500,
    mortgageWeeks: 20,
    description: "A modest home that removes weekly rent and improves rest.",
    benefits: Object.freeze([
      "No weekly rent",
      "10% stronger sleep recovery",
      "Permanent home ownership",
    ]),
  }),
  Object.freeze({
    id: "wealthy-estate-home",
    name: "Lagoon View Residence",
    district: "Wealthy Residential",
    tenure: "ownership",
    price: 3500000,
    deposit: 1000000,
    weeklyPayment: 100000,
    mortgageWeeks: 25,
    requiresPropertyId: "mainland-home",
    description: "A premium estate residence and the key to the future upper district.",
    benefits: Object.freeze([
      "No weekly rent",
      "20% stronger sleep recovery",
      "Unlocks the second-map district",
    ]),
  }),
]);

export function getPropertyById(propertyId) {
  return PROPERTY_CATALOGUE.find((property) => property.id === propertyId) ?? null;
}
