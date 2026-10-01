import { MOTO_EAZI_LOCATIONS } from "./motoEaziLocations.js";

const request = (
  id,
  category,
  pickup,
  destinations,
  fare,
) => Object.freeze({
  id,
  category,
  pickup,
  destinations: Object.freeze(destinations),
  fare,
});

const requests = MOTO_EAZI_LOCATIONS.map((pickup, index) => {
  const longRide = index % 3 === 0;
  const firstOffset = longRide ? 7 : 3;
  const firstDestination =
    MOTO_EAZI_LOCATIONS[
      (index + firstOffset) % MOTO_EAZI_LOCATIONS.length
    ];
  const destinations =
    index % 5 === 0
      ? [
          firstDestination,
          MOTO_EAZI_LOCATIONS[
            (index + firstOffset + 4) %
              MOTO_EAZI_LOCATIONS.length
          ],
        ]
      : [firstDestination];

  return request(
    `CME-${String(index + 1).padStart(2, "0")}`,
    destinations.length > 1
      ? "two-drop"
      : longRide
        ? "long"
        : "short",
    pickup,
    destinations,
    destinations.length > 1
      ? 9800 + index * 300
      : longRide
        ? 6200 + index * 250
        : 2200 + index * 150,
  );
});

export const MOTO_EAZI_REQUESTS = Object.freeze(requests);
