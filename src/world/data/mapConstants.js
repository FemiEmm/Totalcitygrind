export const DISTRICT_WIDTH = 3840;
export const DISTRICT_HEIGHT = 2160;

export const WORLD_WIDTH = DISTRICT_WIDTH * 2;
export const WORLD_HEIGHT = DISTRICT_HEIGHT * 2;

export const GROUND_COLOUR = "#65cf5b";

export const GRID_SIZE = 120;
export const WORLD_MIN_X = -GRID_SIZE;
export const WORLD_MIN_Y = -GRID_SIZE;
export const WORLD_MAX_X = WORLD_WIDTH + GRID_SIZE;
export const WORLD_MAX_Y = WORLD_HEIGHT + GRID_SIZE;
export const WORLD_EDGE_COLOUR = "#102a43";
export const GRID_COLUMNS = WORLD_WIDTH / GRID_SIZE;
export const GRID_ROWS = WORLD_HEIGHT / GRID_SIZE;

export function gridRect(
  column,
  row,
  widthInCells = 1,
  heightInCells = 1,
) {
  return {
    x: column * GRID_SIZE,
    y: row * GRID_SIZE,
    width: widthInCells * GRID_SIZE,
    height: heightInCells * GRID_SIZE,
  };
}

export function createTiledDistrictBlocks({
  idPrefix,
  width = DISTRICT_WIDTH,
  height = DISTRICT_HEIGHT,
  reserved = [],
}) {
  const columns = Math.floor(width / GRID_SIZE);
  const rows = Math.floor(height / GRID_SIZE);
  const occupied = Array.from(
    { length: rows },
    () => Array(columns).fill(false),
  );

  reserved.forEach((rectangle) => {
    const firstColumn = Math.max(
      0,
      Math.floor(rectangle.x / GRID_SIZE),
    );
    const lastColumn = Math.min(
      columns - 1,
      Math.ceil(
        (rectangle.x + rectangle.width) / GRID_SIZE,
      ) - 1,
    );
    const firstRow = Math.max(
      0,
      Math.floor(rectangle.y / GRID_SIZE),
    );
    const lastRow = Math.min(
      rows - 1,
      Math.ceil(
        (rectangle.y + rectangle.height) / GRID_SIZE,
      ) - 1,
    );

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (
        let column = firstColumn;
        column <= lastColumn;
        column += 1
      ) {
        occupied[row][column] = true;
      }
    }
  });

  const blocks = [];
  let blockNumber = 1;

  const addBlock = (column, row, size) => {
    blocks.push({
      id: `${idPrefix}-${String(blockNumber).padStart(3, "0")}`,
      ...gridRect(column, row, size, size),
      plotSize: `${size}x${size}`,
    });
    blockNumber += 1;

    for (
      let occupiedRow = row;
      occupiedRow < row + size;
      occupiedRow += 1
    ) {
      for (
        let occupiedColumn = column;
        occupiedColumn < column + size;
        occupiedColumn += 1
      ) {
        occupied[occupiedRow][occupiedColumn] = true;
      }
    }
  };

  for (let row = 0; row < rows - 1; row += 1) {
    for (
      let column = 0;
      column < columns - 1;
      column += 1
    ) {
      const canFitTwoByTwo =
        !occupied[row][column] &&
        !occupied[row][column + 1] &&
        !occupied[row + 1][column] &&
        !occupied[row + 1][column + 1];

      if (canFitTwoByTwo) {
        addBlock(column, row, 2);
      }
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!occupied[row][column]) {
        addBlock(column, row, 1);
      }
    }
  }

  return blocks;
}

// Increase the current camera magnification by 50% in both worlds.
const CAMERA_ZOOM = 1.5;
export const CAMERA_WIDTH = 1024 / CAMERA_ZOOM;
export const CAMERA_HEIGHT = 576 / CAMERA_ZOOM;
