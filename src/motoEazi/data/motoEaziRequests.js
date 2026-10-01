import { GRID_SIZE } from "../../world/data/mapConstants.js";
import { MOTO_EAZI_LOCATIONS } from "./motoEaziLocations.js";

const DISTRICT_IDS = [
  "starting-residential",
  "work-hub",
  "wealthy-residential",
  "nightlife",
];
const MINIMUM_SHORT_DISTANCE = GRID_SIZE * 20;
const MINIMUM_LONG_DISTANCE = GRID_SIZE * 40;
const MINIMUM_SEGMENT_DISTANCE = GRID_SIZE * 5;

const locationsByDistrict = Object.fromEntries(
  DISTRICT_IDS.map((districtId) => [
    districtId,
    MOTO_EAZI_LOCATIONS.filter(
      (location) => location.districtId === districtId,
    ),
  ]),
);

function hasDestinationAtLeast(origin, minimumDistance) {
  return MOTO_EAZI_LOCATIONS.some(
    (location) =>
      location.id !== origin.id &&
      distanceBetween(location, origin) >= minimumDistance,
  );
}

function request(id, category, pickup, destinations, fare) {
  return Object.freeze({
    id,
    category,
    pickup,
    destinations: Object.freeze(destinations),
    fare,
  });
}

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function chooseDistantLocation(
  locations,
  origin,
  seed,
  minimumDistance = MINIMUM_SEGMENT_DISTANCE,
  excludedIds = new Set(),
) {
  const eligible = locations.filter((location) => {
    return (
      location.id !== origin.id &&
      !excludedIds.has(location.id) &&
      distanceBetween(location, origin) >= minimumDistance
    );
  });
  const fallback = locations
    .filter((location) => {
      return location.id !== origin.id && !excludedIds.has(location.id);
    })
    .sort((first, second) => {
      return distanceBetween(second, origin) - distanceBetween(first, origin);
    });
  const candidates = eligible.length > 0 ? eligible : fallback;

  return candidates[seed % candidates.length];
}

const shortRequests = DISTRICT_IDS.flatMap((districtId, districtIndex) => {
  const locations = locationsByDistrict[districtId].filter((location) =>
    hasDestinationAtLeast(location, MINIMUM_SHORT_DISTANCE),
  );

  return Array.from({ length: 5 }, (_, index) => {
    const pickup = locations[(index * 2 + districtIndex) % locations.length];
    const dropoff = chooseDistantLocation(
      MOTO_EAZI_LOCATIONS,
      pickup,
      index * 3 + districtIndex,
      MINIMUM_SHORT_DISTANCE,
    );

    return request(
      `ME-S${districtIndex + 1}-${String(index + 1).padStart(2, "0")}`,
      "short",
      pickup,
      [dropoff],
      2200 + (index % 5) * 300,
    );
  });
});

const longRequests = Array.from({ length: 30 }, (_, index) => {
  const pickupLocations = MOTO_EAZI_LOCATIONS.filter((location) =>
    hasDestinationAtLeast(location, MINIMUM_LONG_DISTANCE),
  );
  const pickup = pickupLocations[(index * 2) % pickupLocations.length];
  const dropoff = chooseDistantLocation(
    MOTO_EAZI_LOCATIONS,
    pickup,
    index * 5 + 1,
    MINIMUM_LONG_DISTANCE,
  );

  return request(
    `ME-L${String(index + 1).padStart(2, "0")}`,
    "long",
    pickup,
    [dropoff],
    6500 + (index % 6) * 650,
  );
});

const multiStopRequests = Array.from({ length: 10 }, (_, index) => {
  const pickupDistrictIndex = index % DISTRICT_IDS.length;
  const pickupLocations =
    locationsByDistrict[DISTRICT_IDS[pickupDistrictIndex]];
  const pickup = pickupLocations[index % pickupLocations.length];
  const dropCount = index % 2 === 0 ? 3 : 2;
  const destinations = [];
  const usedIds = new Set([pickup.id]);
  let previous = pickup;

  for (let stopIndex = 0; stopIndex < dropCount; stopIndex += 1) {
    const districtIndex =
      (pickupDistrictIndex + stopIndex + 1) % DISTRICT_IDS.length;
    const destination = chooseDistantLocation(
      locationsByDistrict[DISTRICT_IDS[districtIndex]],
      previous,
      index * 7 + stopIndex * 3,
      MINIMUM_SEGMENT_DISTANCE,
      usedIds,
    );
    destinations.push(destination);
    usedIds.add(destination.id);
    previous = destination;
  }

  return request(
    `ME-M${String(index + 1).padStart(2, "0")}`,
    dropCount === 3 ? "three-stop" : "two-stop",
    pickup,
    destinations,
    (dropCount === 3 ? 14500 : 11000) + (index % 5) * 950,
  );
});


// Guarantee that every safe location appears as a pickup in the offer database.
const coverageRequests = MOTO_EAZI_LOCATIONS.map((pickup, index) => {
  const dropoff = chooseDistantLocation(
    MOTO_EAZI_LOCATIONS,
    pickup,
    index * 11 + 3,
    index % 3 === 0 ? MINIMUM_LONG_DISTANCE : MINIMUM_SHORT_DISTANCE,
  );
  const tiles = Math.max(1, Math.round(distanceBetween(pickup, dropoff) / GRID_SIZE));
  return request(
    `ME-C${String(index + 1).padStart(3, "0")}`,
    "coverage",
    pickup,
    [dropoff],
    Math.max(2200, Math.round(tiles * 185)),
  );
});
export const MOTO_EAZI_REQUESTS = Object.freeze([
  ...shortRequests,
  ...longRequests,
  ...multiStopRequests,
  ...coverageRequests,
]);


