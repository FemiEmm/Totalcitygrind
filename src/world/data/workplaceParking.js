import { GRID_SIZE, gridRect } from './mapConstants.js';
// World-tile plots. These are private parking courts, never traffic lanes.
const sites = [
  ['starting-residential', 'ahmadiyya-garage', 'GARAGE', 13, 4, 'south'],
  ['work-hub', 'bus-terminal', 'TERMINAL', 33, 5, 'east'],
  ['work-hub', 'agege-market', 'MARKET', 47, 5, 'north'],
  ['wealthy-residential', 'ejigbo-hotel', 'HOTEL', 26, 30, 'south'],
  ['nightlife', 'night-club', 'CLUB', 36, 30, 'west'],
  ['nightlife', 'live-music', 'MUSIC', 42, 21, 'east'],
  ['nightlife', 'city-hotel', 'HOTEL', 44, 28, 'north'],
  ['nightlife', 'yaba-events', 'EVENTS', 45, 28, 'north'],
];
const driveways = [
  ['work-hub', 'terminal-parking-drive', 34, 5, 1, 1],
  ['nightlife', 'hotel-events-parking-drive', 44, 27, 2, 1],
];
// Relocated service bays also need clear ground and private paving.
const movedCourts = [
  ['work-hub', 'mangoro-office-court', 49, 5, 1, 1],
  ['work-hub', 'estate-agency-court', 42, 15, 1, 1],
  ['wealthy-residential', 'alimosho-fuel-court', 29, 22, 1, 1],
];
export const workplaceParkingClearances = [
  ...sites.map(([, , , x, y]) => gridRect(x, y, 1, 1)),
  ...driveways.map(([, , x, y, w, h]) => gridRect(x, y, w, h)),
  ...movedCourts.map(([, , x, y, w, h]) => gridRect(x, y, w, h)),
];
export function addWorkplaceParking(districts) {
  const local = (district, x, y, w = 1, h = 1) => ({ ...gridRect(x, y, w, h), x: x * GRID_SIZE - district.worldX, y: y * GRID_SIZE - district.worldY });
  for (const [districtId, id, label, x, y, front] of sites) {
    const district = districts.find(item => item.id === districtId);
    district.publicParkingZones ??= [];
    district.publicParkingZones.push({ id: id + '-career-parking', label: label + ' PARKING', shortLabel: label,
      parkingFront: front, ...local(district, x, y) });
    district.roads.push({ id: id + '-parking-paving', type: 'local', privateParking: true, ...local(district, x, y) });
  }
  for (const [districtId, id, x, y, w, h] of [...driveways, ...movedCourts]) {
    const district = districts.find(item => item.id === districtId);
    district.roads.push({ id, type: 'local', privateParking: true, ...local(district, x, y, w, h) });
  }
}
