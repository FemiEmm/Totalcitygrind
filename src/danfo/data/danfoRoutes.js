function route(id, name, direction, stopIds, corridor = "city") {
  return Object.freeze({
    id,
    name,
    direction,
    corridor,
    stopIds: Object.freeze(stopIds),
  });
}

export const DANFO_ROUTES = Object.freeze([
  route("R1", "Alakuko to Agege", "Alakuko → Agege", [
    "res-stop-home", "res-stop-garage", "res-stop-estate",
    "work-stop-west", "work-stop-terminal-a", "work-stop-market",
  ]),
  route("R2", "Abule Egba to Mangoro", "Abule Egba → Mangoro", [
    "res-stop-clinic", "res-stop-estate", "work-stop-west",
    "work-stop-terminal-b", "work-stop-office",
  ]),
  route("R3", "Meiran to Dopemu", "Meiran → Dopemu", [
    "res-stop-loop", "res-stop-garage", "res-stop-estate",
    "work-stop-west", "work-stop-terminal-b",
  ]),
  route("R4", "Abule Oki to Ejigbo", "Abule Oki → Ejigbo", [
    "res-stop-estate", "res-stop-east", "wealth-stop-circle",
    "wealth-stop-shopping", "wealth-stop-hotel",
  ]),
  route("W1", "Market and Office Shuttle", "Agege → Ikeja Along", [
    "work-stop-market", "work-stop-office", "work-stop-interchange",
    "work-stop-east",
  ]),
  route("W2", "Ikeja LGA Crosstown", "Ile Epo → Ikeja Along", [
    "work-stop-west", "work-stop-terminal-a", "work-stop-terminal-b",
    "work-stop-office", "work-stop-market", "work-stop-east",
  ]),
  route("W3", "Terminal Connector", "Iyana Ipaja → Sogunle", [
    "work-stop-terminal-a", "work-stop-market", "work-stop-office",
    "work-stop-interchange", "work-stop-dealer",
  ]),
  route("N1", "Ikeja LGA to Mushin LGA", "Iyana Ipaja → Palmgrove", [
    "work-stop-terminal-a", "work-stop-office", "work-stop-market",
    "work-stop-interchange", "night-stop-work-link", "night-stop-clubs",
    "night-stop-circle", "night-stop-restaurants",
  ]),
  route("N2", "Mushin to Yaba", "Mushin → Yaba", [
    "night-stop-old-airport", "night-stop-work-link", "night-stop-clubs",
    "night-stop-circle", "night-stop-harbour", "night-stop-events",
  ]),
  route("N3", "Ojuelegba Club Loop", "Ojuelegba → Isolo", [
    "night-stop-harbour", "night-stop-events", "night-stop-restaurants",
    "night-stop-circle", "night-stop-clubs",
  ]),
  route("H1", "Igando to Oshodi", "Igando → Oshodi", [
    "wealth-stop-hospital", "wealth-stop-south", "wealth-stop-shopping",
    "wealth-stop-circle", "wealth-stop-hotel", "work-stop-dealer",
    "work-stop-interchange",
  ]),
  route("H2", "Akowonjo to Idimu", "Akowonjo → Idimu", [
    "wealth-stop-waterway", "wealth-stop-north", "wealth-stop-circle",
    "wealth-stop-hotel", "wealth-stop-shopping",
  ]),
  route("H3", "Egbeda to Abule Egba", "Egbeda → Abule Egba", [
    "wealth-stop-north", "wealth-stop-circle", "wealth-stop-hospital",
    "res-stop-east", "res-stop-estate", "res-stop-clinic",
  ]),
  route("H4", "Ejigbo to Yaba", "Ejigbo → Yaba", [
    "wealth-stop-hotel", "wealth-stop-shopping", "work-stop-dealer",
    "work-stop-interchange", "night-stop-circle", "night-stop-events",
  ]),
  route("H5", "Gowon Estate to Agege", "Gowon Estate → Agege", [
    "wealth-stop-olowo-epo", "wealth-stop-north", "wealth-stop-circle",
    "res-stop-estate", "work-stop-west", "work-stop-terminal-a",
    "work-stop-market",
  ]),

  // Full-width services that use the central four-lane highway corridor.
  route("HW1", "Mainland Highway Express", "Gowon Estate → Mushin", [
    "wealth-stop-olowo-epo", "wealth-stop-north", "wealth-stop-circle",
    "work-stop-interchange", "night-stop-work-link", "night-stop-old-airport",
  ], "central-highway"),
  route("HW2", "Akowonjo–Ojuelegba Express", "Akowonjo → Ojuelegba", [
    "wealth-stop-waterway", "wealth-stop-circle", "wealth-stop-shopping",
    "work-stop-interchange", "night-stop-circle", "night-stop-harbour",
  ], "central-highway"),
  route("HW3", "Igando–Yaba Express", "Igando → Yaba", [
    "wealth-stop-hospital", "wealth-stop-south", "wealth-stop-shopping",
    "work-stop-dealer", "work-stop-interchange", "night-stop-events",
  ], "central-highway"),
  route("HW4", "West–East Highway Line", "Meiran → Palmgrove", [
    "res-stop-loop", "res-stop-garage", "res-stop-estate",
    "work-stop-west", "work-stop-interchange", "night-stop-circle",
    "night-stop-restaurants",
  ], "central-highway"),
  route("HW5", "Lagos Grand Trunk", "Alakuko → Ojuelegba", [
    "res-stop-home", "res-stop-clinic", "res-stop-east",
    "wealth-stop-circle", "work-stop-dealer", "work-stop-interchange",
    "night-stop-work-link", "night-stop-clubs", "night-stop-harbour",
  ], "central-highway"),
  route("X1", "Four LGA Grand Line", "Alakuko → Ojuelegba", [
    "res-stop-home", "res-stop-clinic", "res-stop-estate", "work-stop-west",
    "work-stop-terminal-a", "work-stop-interchange", "wealth-stop-circle",
    "wealth-stop-shopping", "wealth-stop-hotel", "night-stop-work-link",
    "night-stop-clubs", "night-stop-harbour",
  ], "central-highway"),
  route("X2", "City Discovery Line", "Akowonjo → Yaba", [
    "wealth-stop-waterway", "wealth-stop-north", "wealth-stop-hospital",
    "res-stop-east", "res-stop-loop", "work-stop-market", "work-stop-office",
    "night-stop-circle", "night-stop-events",
  ], "central-highway"),
  route("X3", "Mainland Complete", "Mushin → Gowon Estate", [
    "night-stop-old-airport", "night-stop-work-link", "night-stop-restaurants",
    "work-stop-interchange", "work-stop-dealer", "wealth-stop-shopping",
    "wealth-stop-circle", "wealth-stop-north", "wealth-stop-olowo-epo",
  ], "central-highway"),]);

export function pickRandomDanfoRoutes(count = 5, random = Math.random) {
  const pool = [...DANFO_ROUTES];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, Math.min(count, pool.length));
}

export const DANFO_ROUTE_CONFIG = Object.freeze({
  stopDetectionRadius: 125,
  maximumStopSpeedKmh: 5,
  requiredStopSeconds: 1.25,
});


