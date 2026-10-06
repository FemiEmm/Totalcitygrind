import { GRID_SIZE } from "../../world/data/mapConstants.js";

function towBase({
  id,
  label,
  column,
  row,
  rotation = Math.PI / 2,
  roadEntry,
}) {
  return Object.freeze({
    id,
    label,
    x: (column + 0.5) * GRID_SIZE,
    y: (row + 0.5) * GRID_SIZE,
    width: GRID_SIZE,
    height: GRID_SIZE,
    rotation,
    tileColumn: column,
    tileRow: row,
    yardTiles: Object.freeze([
      Object.freeze({ column, row }),
    ]),
    roadEntry: Object.freeze({
      column: roadEntry[0],
      row: roadEntry[1],
    }),
  });
}

export const TOW_TRUCK_BASES = Object.freeze([
  towBase({
    id: "tow-base-starting-residential",
    label: "Ifako-Ijaiye LGA Tow Bay",
    column: 9,
    row: 9,
    roadEntry: [9, 10],
  }),
  towBase({
    id: "tow-base-work-hub",
    label: "Ikeja LGA Tow Bay",
    column: 36,
    row: 10,
    roadEntry: [35, 10],
  }),
  towBase({
    id: "tow-base-wealthy-residential",
    label: "Alimosho LGA Tow Bay",
    column: 7,
    row: 30,
    roadEntry: [7, 31],
  }),
  towBase({
    id: "tow-base-nightlife",
    label: "Mushin LGA Tow Bay",
    column: 45,
    row: 26,
    roadEntry: [46, 26],
  }),
]);
