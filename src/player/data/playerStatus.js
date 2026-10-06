import breadImageUrl from "../../assets/ui/fresh-bread.png";
import waterImageUrl from "../../assets/ui/water.png";
import energyDrinkImageUrl from "../../assets/ui/energy-drink.png";
import foodPackImageUrl from "../../assets/ui/food-pack.png";
import dryGinImageUrl from "../../assets/ui/dry-gin.png";

export const PLAYER_STATUS_CONFIG = Object.freeze({
  maximumHealth: 100,
  maximumEnergy: 100,
  collisionHealthLossMaximum: 20,
  energyHoursFromFullToEmpty: 16,
  lowEnergyThreshold: 20,
  publicHospitalCost: 7500,
  privateClinicCost: 15000,
  doctorCallCost: 22500,
  faintHospitalCost: 7500,
  faintRecoveryEnergy: 35,
  sleepEnergyPerHour: 22,
  dryGinCrashAfterMinutes: 180,
  dryGinCrashEnergy: 10,
});

export const FOOD_ITEMS = Object.freeze([
  Object.freeze({
    id: "bread",
    label: "Fresh bread",
    description: "Simple and filling.",
    price: 500,
    energy: 20,
    imageUrl: breadImageUrl,
    sellers: Object.freeze(["shop", "supermarket"]),
  }),
  Object.freeze({
    id: "bottled-water",
    label: "Bottled water",
    description: "A small energy refresh.",
    price: 300,
    energy: 8,
    imageUrl: waterImageUrl,
    sellers: Object.freeze(["shop", "supermarket", "restaurant"]),
  }),
  Object.freeze({
    id: "energy-drink",
    label: "Energy drink",
    description: "Fast energy for a long shift.",
    price: 1000,
    energy: 30,
    imageUrl: energyDrinkImageUrl,
    sellers: Object.freeze(["shop", "supermarket"]),
  }),
  Object.freeze({
    id: "jollof-meal",
    label: "Jollof rice and chicken",
    description: "A proper hot meal.",
    price: 2500,
    energy: 55,
    imageUrl: foodPackImageUrl,
    sellers: Object.freeze(["restaurant", "supermarket"]),
  }),
  Object.freeze({
    id: "dry-gin",
    label: "Dry gin",
    description:
      "Restores 100 energy now. After three game hours energy drops to 10 and intoxication rises by 50%.",
    price: 1800,
    energy: 100,
    imageUrl: dryGinImageUrl,
    delayedCrash: true,
    sellers: Object.freeze(["shop", "supermarket"]),
  }),
]);
