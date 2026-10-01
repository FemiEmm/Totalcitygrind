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
const HOUSE_ROWS = [0, 4, 8, 10, 13];
const HOUSE_SPRITES = [
  modernHouse01,
  modernHouse02,
  modernHouse03,
  modernHouse04,
  modernHouse05,
];

export const UPPER_DISTRICT = Object.freeze({
  id: "upper-district",
  name: "Upper District",
  colour: "#829b58",
  bounds: { x: 0, y: 0, width: 7680, height: 1920 },
  buildings: Object.freeze(
    HOUSE_ROWS.flatMap((row, rowIndex) =>
      HOUSE_COLUMNS.map((column, columnIndex) => ({
        id: `upper-home-${row}-${column}`,
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
            (rowIndex + columnIndex) % HOUSE_SPRITES.length
          ],
        })),
    ),
  ),
});
