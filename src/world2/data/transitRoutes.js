const stopIds = Object.freeze({
  north: Object.freeze([
    "crown-north-regency",
    "crown-north-eko-pearl",
    "crown-north-cedar",
    "crown-north-kingsley",
  ]),
  south: Object.freeze([
    "crown-south-regency",
    "crown-south-eko-pearl",
    "crown-south-cedar",
    "crown-south-kingsley",
  ]),
});

const route = (
  id,
  name,
  direction,
  stops,
  corridor = "atlantic-crown",
) => Object.freeze({
  id,
  name,
  direction,
  corridor,
  stopIds: Object.freeze(stops),
});

export const COAST_CITY_DANFO_ROUTES = Object.freeze([
  route(
    "CC-D1",
    "Kingsley–Regency Line",
    "Kingsley North → Regency North",
    [...stopIds.north].reverse(),
  ),
  route(
    "CC-D2",
    "Regency–Kingsley Line",
    "Regency South → Kingsley South",
    stopIds.south,
  ),
  route(
    "CC-D3",
    "Kingsley–Eko Pearl Shuttle",
    "Kingsley North → Eko Pearl North",
    [...stopIds.north.slice(1)].reverse(),
  ),
  route(
    "CC-D4",
    "Regency–Cedar Shuttle",
    "Regency South → Cedar South",
    stopIds.south.slice(0, 3),
  ),
  route(
    "CC-D5",
    "Atlantic Crown Loop",
    "Kingsley North → Regency North → Kingsley South",
    [
      ...[...stopIds.north].reverse(),
      ...stopIds.south,
    ],
  ),
  route(
    "CC-D6",
    "Kensington Local",
    "Kensington West → Kensington East",
    ["kensington-west", "kensington-east"],
    "kensington-row",
  ),
  route(
    "CC-D7",
    "Palm Court Local",
    "Palm Court West → Palm Court East",
    ["palm-court-west", "palm-court-east"],
    "palm-court-avenue",
  ),
  route(
    "CC-D8",
    "Admiralty Local",
    "Admiralty East → Admiralty West",
    ["admiralty-east", "admiralty-west"],
    "admiralty-crescent",
  ),
  route(
    "CC-D9",
    "Gold Coast Beach Line",
    "Coast City Beach → Gold Coast East",
    [
      "coast-city-beach",
      "gold-coast-central",
      "gold-coast-east",
    ],
    "gold-coast-boulevard",
  ),
]);

export const COAST_CITY_BRT_ROUTES = Object.freeze([
  route(
    "CC-BRT-A",
    "Atlantic Crown Westbound",
    "Kingsley North → Regency North",
    [...stopIds.north].reverse(),
    "atlantic-crown-brt",
  ),
  route(
    "CC-BRT-B",
    "Atlantic Crown Eastbound",
    "Regency South → Kingsley South",
    stopIds.south,
    "atlantic-crown-brt",
  ),
  route(
    "CC-BRT-C",
    "Coast City Grand Loop",
    "Kingsley North → Regency North → Kingsley South",
    [
      ...[...stopIds.north].reverse(),
      ...stopIds.south,
    ],
    "atlantic-crown-brt",
  ),
]);

export function pickRandomCoastCityDanfoRoutes(
  count = 5,
  random = Math.random,
) {
  const pool = [...COAST_CITY_DANFO_ROUTES];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [
      pool[swapIndex],
      pool[index],
    ];
  }

  return pool.slice(0, Math.min(count, pool.length));
}
