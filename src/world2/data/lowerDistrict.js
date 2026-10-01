import modernHouse01 from "../../assets/buildings/generic/wealthy-modern-01.png";
import modernHouse02 from "../../assets/buildings/generic/wealthy-modern-02.png";
import modernHouse03 from "../../assets/buildings/generic/wealthy-modern-03.png";
import modernHouse04 from "../../assets/buildings/generic/wealthy-modern-04.png";
import modernHouse05 from "../../assets/buildings/generic/wealthy-modern-05.png";

const TILE = 120;
const HOUSE_COLUMNS = [
  0, 2, 4, 6,
  9, 11, 13,
  17, 19, 21, 23,
  26, 28, 30, 32,
  36, 38, 40, 42,
  46, 48, 50,
  53, 55,
  60, 62,
];
const HOUSE_ROWS = [20, 22, 28, 30];
const HOUSE_SPRITES = [
  modernHouse03,
  modernHouse05,
  modernHouse01,
  modernHouse04,
  modernHouse02,
];

export const LOWER_DISTRICT = Object.freeze({
  id: "lower-district",
  name: "Lower District",
  colour: "#789451",
  bounds: { x: 0, y: 2400, width: 7680, height: 1920 },
  buildings: Object.freeze(
    HOUSE_ROWS.flatMap((row, rowIndex) =>
      HOUSE_COLUMNS
        .filter(
          (column) =>
            !(row === 20 && [9, 26, 38, 53].includes(column)),
        )
        .map((column, columnIndex) => ({
        id: `lower-home-${row}-${column}`,
        type: "residence",
        x: column * TILE,
        y: row * TILE,
        width: 2 * TILE,
        height: 2 * TILE,
        tileColumn: column,
        tileRow: row,
        tileWidth: 2,
        tileHeight: 2,
        spriteUrl:
          HOUSE_SPRITES[
            (rowIndex * 2 + columnIndex) % HOUSE_SPRITES.length
          ],
        })),
    ),
  ),
});
