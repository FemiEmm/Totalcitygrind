export const BUSINESS_CONFIG = Object.freeze({
  officePrice: 1000000,
  officeRequirementPropertyId: "mainland-home",
  assets: Object.freeze([
    Object.freeze({
      id: "fleet-danfo",
      name: "Managed Danfo",
      icon: "fa-bus-simple",
      purchasePrice: 450000,
      dailyGross: 35000,
      dailyCosts: 14000,
      maximumOwned: 10,
      description: "Hire a driver to operate one Danfo on city routes.",
    }),
    Object.freeze({
      id: "lease-car",
      name: "Lease Car",
      icon: "fa-car-side",
      purchasePrice: 300000,
      dailyGross: 22000,
      dailyCosts: 8000,
      maximumOwned: 10,
      description: "Place a private car with a vetted daily lease driver.",
    }),
  ]),
});
