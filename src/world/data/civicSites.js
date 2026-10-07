import governorHouseUrl from '../../assets/buildings/governors-house.png';
import lawmaOfficeUrl from '../../assets/buildings/lawma-office.png';
import schoolUrl from '../../assets/buildings/school.png';
import lastmaOfficeUrl from '../../assets/buildings/lastma-office.png';
import { GRID_SIZE, gridRect } from './mapConstants.js';

// Separate plots keep the existing district dimensions, home IDs and AI roads intact.
const road = (id, x, y, w, h) => ({ id, ...gridRect(x, y, w, h), type: 'local' });
const parking = (id, label, x, y, front = 'south') => ({
  id, label, shortLabel: label, parkingFront: front, ...gridRect(x, y, 1, 1),
});
export const schoolCampus = {
  id: 'sango-school-campus', name: 'Sango Otta',
  worldX: 39 * GRID_SIZE, worldY: -9 * GRID_SIZE,
  width: 7 * GRID_SIZE, height: 6 * GRID_SIZE, ground: '#aa783f',
  blocks: [], busStops: [], barriers: [],
  landmarks: [{ id: 'sango-school', label: 'SANGO OTTA SCHOOL', ...gridRect(0, 0, 2, 2),
    spriteUrl: schoolUrl, services: [] }],
  roads: [
    road('school-parking-aisle', 0, 2, 7, 2),
    // Connect Street 15 through the opening at world X38, Y-6/-5.
    road('school-residential-access', -2, 3, 4, 2),
    road('school-entry-court', 0, 4, 2, 2),
    road('school-north-parking', 2, 1, 5, 1),
    road('school-south-parking', 2, 4, 5, 1),
  ],
  publicParkingZones: Array.from({ length: 10 }, (_, i) =>
    parking('school-bay-' + (i + 1), 'S' + (i + 1), 2 + i % 5, i < 5 ? 1 : 4, i < 5 ? 'south' : 'north')),
};
export const lastmaCompound = {
  id: 'ikeja-lastma-compound', name: 'Ikeja LGA',
  worldX: 49 * GRID_SIZE, worldY: -4 * GRID_SIZE,
  width: 4 * GRID_SIZE, height: 4 * GRID_SIZE, ground: '#aa783f',
  blocks: [], busStops: [], barriers: [],
  landmarks: [{ id: 'lastma-office', label: 'LASTMA OFFICE', ...gridRect(0, 0, 1, 2),
    spriteUrl: lastmaOfficeUrl, services: [] }],
  roads: [
    road('lastma-front-court', 0, 2, 4, 2),
    road('lastma-parking-paving', 2, 1, 2, 1),
  ],
  publicParkingZones: [parking('lastma-bay-1', 'L1', 2, 1), parking('lastma-bay-2', 'L2', 3, 1)],
};
// Only this frontage opens onto the mainland perimeter road; AI spawn gates stay untouched.
export const LASTMA_NORTH_EDGE_OPENING = { firstColumn: 49, endColumn: 53 };

export const lawmaCompound = {
 id:'ikeja-lawma-compound',name:'Ikeja LGA',worldX:54*GRID_SIZE,worldY:-9*GRID_SIZE,
 width:6*GRID_SIZE,height:9*GRID_SIZE,ground:'#aa783f',blocks:[],busStops:[],barriers:[],
 landmarks:[{id:'lawma-office',label:'LAWMA DEPOT',...gridRect(0,0,2,2),spriteUrl:lawmaOfficeUrl,services:[]}],
 roads:[road('lawma-turning-yard',0,5,4,4),road('lawma-truck-bay',2,1,2,4),road('lawma-office-access',0,2,2,3)],
 publicParkingZones:[{id:'lawma-truck-spawn',label:'WASTE TRUCK',shortLabel:'LAWMA',parkingFront:'south',...gridRect(2,1,2,4)}],
};

export const governorCompound={
 id:'ikeja-governor-residence',name:'Ikeja LGA',worldX:46*GRID_SIZE,worldY:-4*GRID_SIZE,
 width:3*GRID_SIZE,height:4*GRID_SIZE,ground:'#aa783f',blocks:[],busStops:[],barriers:[],
 landmarks:[{id:'governor-residence',label:'GOVERNOR RESIDENCE',...gridRect(0,0,2,2),spriteUrl:governorHouseUrl,services:[]}],
 roads:[road('governor-forecourt',0,2,3,2),road('governor-side-parking-access',2,0,1,2)],
 publicParkingZones:[parking('governor-bay','GOV',2,0)],
};
