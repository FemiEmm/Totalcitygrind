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
  route("R1", "Home to Central Market", "Home Junction → Central Market", [
    "res-stop-home", "res-stop-garage", "res-stop-estate",
    "work-stop-west", "work-stop-terminal-a", "work-stop-market",
  ]),
  route("R2", "Clinic to Office Hub", "General Hospital → Office Hub", [
    "res-stop-clinic", "res-stop-estate", "work-stop-west",
    "work-stop-terminal-b", "work-stop-office",
  ]),
  route("R3", "Community to Terminal B", "Community Loop → Terminal B", [
    "res-stop-loop", "res-stop-garage", "res-stop-estate",
    "work-stop-west", "work-stop-terminal-b",
  ]),
  route("R4", "Estate to Luxury Hotel", "Estate Gate → Luxury Hotel", [
    "res-stop-estate", "res-stop-east", "wealth-stop-circle",
    "wealth-stop-shopping", "wealth-stop-hotel",
  ]),
  route("W1", "Market and Office Shuttle", "Central Market → East Gate", [
    "work-stop-market", "work-stop-office", "work-stop-interchange",
    "work-stop-east",
  ]),
  route("W2", "Work Hub Crosstown", "West Gate → East Gate", [
    "work-stop-west", "work-stop-terminal-a", "work-stop-terminal-b",
    "work-stop-office", "work-stop-market", "work-stop-east",
  ]),
  route("W3", "Terminal Connector", "Terminal A → Dealership", [
    "work-stop-terminal-a", "work-stop-market", "work-stop-office",
    "work-stop-interchange", "work-stop-dealer",
  ]),
  route("N1", "Work Hub to Nightlife", "Terminal A → Restaurant Row", [
    "work-stop-terminal-a", "work-stop-office", "work-stop-market",
    "work-stop-interchange", "night-stop-work-link", "night-stop-clubs",
    "night-stop-circle", "night-stop-restaurants",
  ]),
  route("N2", "Airport Night Run", "Old Airport → Events", [
    "night-stop-old-airport", "night-stop-work-link", "night-stop-clubs",
    "night-stop-circle", "night-stop-harbour", "night-stop-events",
  ]),
  route("N3", "Harbour Club Loop", "Harbour → Club Strip", [
    "night-stop-harbour", "night-stop-events", "night-stop-restaurants",
    "night-stop-circle", "night-stop-clubs",
  ]),
  route("H1", "Private Clinic to Interchange", "Private Clinic → Interchange", [
    "wealth-stop-hospital", "wealth-stop-south", "wealth-stop-shopping",
    "wealth-stop-circle", "wealth-stop-hotel", "work-stop-dealer",
    "work-stop-interchange",
  ]),
  route("H2", "Waterway to Shopping Centre", "Waterway → Shopping Centre", [
    "wealth-stop-waterway", "wealth-stop-north", "wealth-stop-circle",
    "wealth-stop-hotel", "wealth-stop-shopping",
  ]),
  route("H3", "Estate Medical Link", "Estate North → General Hospital", [
    "wealth-stop-north", "wealth-stop-circle", "wealth-stop-hospital",
    "res-stop-east", "res-stop-estate", "res-stop-clinic",
  ]),
  route("H4", "Hotel to Event Centre", "Luxury Hotel → Events", [
    "wealth-stop-hotel", "wealth-stop-shopping", "work-stop-dealer",
    "work-stop-interchange", "night-stop-circle", "night-stop-events",
  ]),
  route("H5", "Olowo Epo to Market", "Olowo Epo → Central Market", [
    "wealth-stop-olowo-epo", "wealth-stop-north", "wealth-stop-circle",
    "res-stop-estate", "work-stop-west", "work-stop-terminal-a",
    "work-stop-market",
  ]),

  // Full-width services that use the central four-lane highway corridor.
  route("HW1", "Mainland Highway Express", "Olowo Epo → Old Airport", [
    "wealth-stop-olowo-epo", "wealth-stop-north", "wealth-stop-circle",
    "work-stop-interchange", "night-stop-work-link", "night-stop-old-airport",
  ], "central-highway"),
  route("HW2", "Waterway–Harbour Express", "Waterway → Harbour", [
    "wealth-stop-waterway", "wealth-stop-circle", "wealth-stop-shopping",
    "work-stop-interchange", "night-stop-circle", "night-stop-harbour",
  ], "central-highway"),
  route("HW3", "Hospital–Events Express", "Private Clinic → Events", [
    "wealth-stop-hospital", "wealth-stop-south", "wealth-stop-shopping",
    "work-stop-dealer", "work-stop-interchange", "night-stop-events",
  ], "central-highway"),
  route("HW4", "West–East Highway Line", "Community Loop → Restaurant Row", [
    "res-stop-loop", "res-stop-garage", "res-stop-estate",
    "work-stop-west", "work-stop-interchange", "night-stop-circle",
    "night-stop-restaurants",
  ], "central-highway"),
  route("HW5", "Lagos Grand Trunk", "Home Junction → Harbour", [
    "res-stop-home", "res-stop-clinic", "res-stop-east",
    "wealth-stop-circle", "work-stop-dealer", "work-stop-interchange",
    "night-stop-work-link", "night-stop-clubs", "night-stop-harbour",
  ], "central-highway"),
  route("X1", "Four District Grand Line", "Home Junction → Harbour", [
    "res-stop-home", "res-stop-clinic", "res-stop-estate", "work-stop-west",
    "work-stop-terminal-a", "work-stop-interchange", "wealth-stop-circle",
    "wealth-stop-shopping", "wealth-stop-hotel", "night-stop-work-link",
    "night-stop-clubs", "night-stop-harbour",
  ], "central-highway"),
  route("X2", "City Discovery Line", "Waterway → Event Centre", [
    "wealth-stop-waterway", "wealth-stop-north", "wealth-stop-hospital",
    "res-stop-east", "res-stop-loop", "work-stop-market", "work-stop-office",
    "night-stop-circle", "night-stop-events",
  ], "central-highway"),
  route("X3", "Mainland Complete", "Old Airport → Olowo Epo", [
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


