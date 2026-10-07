import singleRoomRowUrl from '../../assets/buildings/generic/single-room-row-1x4.png';
import { GRID_SIZE, gridRect, GROUND_COLOUR } from './mapConstants.js';
import { NORTHERN_ESTATE_HOMES, NORTHERN_ESTATE_STREETS } from '../../property/data/northernEstateHomes.js';
// World tile positions stay unchanged in the original city. New housing extends north.
const originX = 11, originY = -68;
const rect = (x,y,w,h) => gridRect(x-originX,y-originY,w,h);
const road = (id,x,y,w,h,type='local') => ({ id, ...rect(x,y,w,h), type });
export const northernResidential = {
  id: 'northern-residential', name: 'Sango Otta',
  worldX: originX * GRID_SIZE, worldY: originY * GRID_SIZE,
  width: 28 * GRID_SIZE, height: 66 * GRID_SIZE, ground: GROUND_COLOUR,
  blocks: [], landmarks: [], busStops: [], homeParkingZones: [],
  roads: [
    road('estate-spine-northern-extension',24,-70,2,71,'main'),
    road('estate-west-residential-lane',21,-67,2,64),
    road('estate-east-residential-lane',27,-67,2,64),
    road('estate-north-cross-street',21,-67,8,2),
    road('estate-south-cross-street',21,-5,8,2),
  ],
  // Woodland now meets the estate directly; no perimeter dividing blocks.
  barriers: [],
};
for (const side of ['W','E']) {
  const houseX = side === 'W' ? 14 : 30;
  for (let street=1; street<=NORTHERN_ESTATE_STREETS; street++) {
    const y = -64 + (street-1)*4;
    const key = 'estate-' + side.toLowerCase() + '-street-' + street;
    // Six homes per terrace: a four-room roof and a two-room crop of the same asset.
    for (const [offset,rooms] of [[0,4],[4,2]]) {
      northernResidential.landmarks.push({
        id:key+'-houses-'+offset, label:'STREET '+street+' '+side,
        ...rect(houseX+offset,y,rooms,1), services:[],
        spriteUrl:singleRoomRowUrl, singleRoomRow:true, spriteRotationQuarterTurns:0,
        spriteSourceFraction:{ x:.03,y:.14,width:.94*rooms/4,height:.71 },
      });
    }
    northernResidential.roads.push(road(key+'-access',side==='W'?13:27,y+2,10,2));
  }
}
for (const home of NORTHERN_ESTATE_HOMES) {
  northernResidential.roads.push(road(home.id+'-paving',home.column,home.houseRow+1,1,1));
  northernResidential.homeParkingZones.push({
    id:home.id+'-parking', homeId:home.id, label:home.name+' PARKING',
    shortLabel:home.label, parkingFront:home.front,
    ...rect(home.column,home.houseRow+1,1,1),
  });
}

// Cover only complete, unoccupied four-cell strips. Narrow strips can use
// the same 1x4 image rotated; leftover cells retain the district grass.
const columns = northernResidential.width / GRID_SIZE;
const rows = northernResidential.height / GRID_SIZE;
const reserved = [...northernResidential.roads, ...northernResidential.landmarks, ...northernResidential.barriers];
const occupied = Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) =>
  reserved.some(area => x * GRID_SIZE < area.x + area.width && (x + 1) * GRID_SIZE > area.x &&
    y * GRID_SIZE < area.y + area.height && (y + 1) * GRID_SIZE > area.y)));
northernResidential.mudGroundPatches = [];
for (const vertical of [false, true]) {
  const width = vertical ? 1 : 4, height = vertical ? 4 : 1;
  for (let y = 0; y <= rows - height; y++) {
    for (let x = 0; x <= columns - width; x++) {
      let clear = true;
      for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) {
        if (occupied[y + dy][x + dx]) clear = false;
      }
      if (!clear) continue;
      northernResidential.mudGroundPatches.push({ ...gridRect(x, y, width, height), vertical });
      for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) occupied[y + dy][x + dx] = true;
    }
  }
}
