import { GRID_SIZE } from "./mapConstants.js";

const roadside = (
  id,
  label,
  districtId,
  districtName,
  column,
  row,
) => Object.freeze({
  id,
  label,
  districtId,
  districtName,
  type: "roadside",
  x: column * GRID_SIZE,
  y: row * GRID_SIZE,
});

export const MOTO_EAZI_LOCATIONS = Object.freeze([
  roadside("coast-kensington-west", "Kensington Row West", "upper-district", "Upper District", 4.5, 3.5),
  roadside("coast-regency-junction", "Regency Junction", "upper-district", "Upper District", 8.5, 3.5),
  roadside("coast-victoria-central", "Victoria Grand Central", "upper-district", "Upper District", 31.5, 6.5),
  roadside("coast-eko-pearl", "Eko Pearl Corner", "upper-district", "Upper District", 25.5, 12.5),
  roadside("coast-coral-vista", "Coral Vista", "upper-district", "Upper District", 59.5, 9.5),

  roadside("coast-crown-regency", "Atlantic Crown · Regency", "highway-district", "Atlantic Crown", 10.5, 15.5),
  roadside("coast-crown-eko", "Atlantic Crown · Eko Pearl", "highway-district", "Atlantic Crown", 27.5, 20.5),
  roadside("coast-crown-cedar", "Atlantic Crown · Cedar", "highway-district", "Atlantic Crown", 39.5, 15.5),
  roadside("coast-crown-kingsley", "Atlantic Crown · Kingsley", "highway-district", "Atlantic Crown", 54.5, 20.5),

  roadside("coast-admiralty-west", "Admiralty Crescent West", "lower-district", "Lower District", 5.5, 24.5),
  roadside("coast-marina-central", "Marina Royal Central", "lower-district", "Lower District", 31.5, 27.5),
  roadside("coast-gold-coast", "Gold Coast Boulevard", "lower-district", "Lower District", 43.5, 33.5),
  roadside("coast-azure-promenade", "Azure Promenade", "waterfront-district", "Atlantic Waterfront", 59.5, 30.5),
  roadside("coast-beach-dropoff", "Coast City Beach", "waterfront-district", "Atlantic Waterfront", 11.5, 34.5),
]);
