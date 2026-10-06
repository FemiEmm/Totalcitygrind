import { NORTHERN_ESTATE_HOMES } from './northernEstateHomes.js';
import { LIFE_OBLIGATION_CONFIG } from '../../life/data/lifeObligations.js';
export const STARTER_HOME_ROWS = Object.freeze([
  { name: 'A', x: 7, y: 5, front: 'south' },
  { name: 'B', x: 27, y: 5, front: 'south' },
  { name: 'C', x: 4, y: 11, front: 'north' },
  { name: 'D', x: 11, y: 9, front: 'east' },
  { name: 'E', x: 21, y: 10, front: 'west' },
].map(Object.freeze));
const ORIGINAL_STARTER_HOMES = STARTER_HOME_ROWS.flatMap(row =>
  Array.from({ length: 4 }, (_, index) => Object.freeze({
    id: 'single-room-row-' + row.name.toLowerCase() + '-room-' + (index + 1),
    label: row.name + (index + 1),
    name: 'Room ' + row.name + (index + 1),
    row: row.name, district: 'Ifako-Ijaiye LGA',
    front: row.front,
    weeklyRent: LIFE_OBLIGATION_CONFIG.weeklyRent,
  })));
export const STARTER_HOMES = Object.freeze([...ORIGINAL_STARTER_HOMES, ...NORTHERN_ESTATE_HOMES]);
