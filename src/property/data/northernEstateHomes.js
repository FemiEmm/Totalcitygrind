import { LIFE_OBLIGATION_CONFIG } from '../../life/data/lifeObligations.js';
export const NORTHERN_ESTATE_STREETS = 15;
export const NORTHERN_ESTATE_HOMES = Object.freeze(['W','E'].flatMap(side =>
  Array.from({ length: NORTHERN_ESTATE_STREETS * 6 }, (_, index) => {
    const street = Math.floor(index / 6) + 1;
    const label = side + String(index + 1).padStart(2, '0');
    return Object.freeze({
      id: 'northern-estate-' + label.toLowerCase(), label, name: 'Room ' + label,
      row: 'Street ' + street, district: 'Sango Otta', side, street,
      column: (side === 'W' ? 14 : 30) + index % 6,
      houseRow: -64 + (street - 1) * 4,
      front: 'south', weeklyRent: LIFE_OBLIGATION_CONFIG.weeklyRent,
    });
  })));
