import { EXPANDED_HOMES } from './expandedHomes.js';
export const PROPERTY_CATALOGUE = Object.freeze([
  Object.freeze({
    id: "starter-rental",
    name: "First Step Flat",
    district: "Ifako-Ijaiye LGA",
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
    parking: {x:16,y:12},
    district: "Ifako-Ijaiye LGA",
    tenure: "ownership",
    price: 5000000,
    deposit: 2000000,
    weeklyPayment: 150000,
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
    parking: {x:8,y:21},
    district: "Alimosho LGA",
    tenure: "ownership",
    price: 10000000,
    deposit: 3000000,
    weeklyPayment: 280000,
    mortgageWeeks: 25,
    description: "A secure premium residence with no home robbery.",
    benefits: Object.freeze([
      "No weekly rent",
      "20% stronger sleep recovery",
      "No home robbery",
    ]),
  }),
  ...EXPANDED_HOMES.map(home => Object.freeze({...home, district:'Alimosho LGA', tenure:'ownership',price:5000000,deposit:2000000,weeklyPayment:150000,mortgageWeeks:20,description:'A spacious home with private parking and improved rest.',benefits:['Private parking','10% stronger sleep recovery','5% weekly home robbery risk']})),
]);

export function getPropertyById(propertyId) {
  return PROPERTY_CATALOGUE.find((property) => property.id === propertyId) ?? null;
}
