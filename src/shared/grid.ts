export type GridPosition = {
  row: number;
  column: number;
  normalizedX: number;
  normalizedY: number;
};

export type GridCell = Pick<GridPosition, "row" | "column">;

export function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
}

export function normalizedToCell(x: number, y: number, rows: number, columns: number): GridCell {
  if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(columns) || columns < 1) {
    throw new Error("Grid dimensions must be positive integers.");
  }
  return {
    row: Math.round(clamp01(y) * (rows - 1)),
    column: Math.round(clamp01(x) * (columns - 1)),
  };
}

export function getSpriteSource(cell: GridCell & { frameWidth: number; frameHeight: number }) {
  return { sourceX: cell.column * cell.frameWidth, sourceY: cell.row * cell.frameHeight };
}

export function createSnakePath(rows: number, columns: number): GridPosition[] {
  const positions: GridPosition[] = [];
  for (let row = 0; row < rows; row++) {
    for (let step = 0; step < columns; step++) {
      const column = row % 2 === 0 ? step : columns - 1 - step;
      positions.push({
        row,
        column,
        normalizedX: columns === 1 ? 0.5 : column / (columns - 1),
        normalizedY: rows === 1 ? 0.5 : row / (rows - 1),
      });
    }
  }
  return positions;
}

// A square spiral keeps every successive move to one neighboring target.
export function createCapturePath(rows: number, columns: number): GridPosition[] {
  const center = normalizedToCell(0.5, 0.5, rows, columns);
  const route: GridPosition[] = [];
  let row = center.row;
  let column = center.column;
  const add = () => {
    if (row >= 0 && row < rows && column >= 0 && column < columns) {
      route.push({ row, column,
        normalizedX: columns === 1 ? 0.5 : column / (columns - 1),
        normalizedY: rows === 1 ? 0.5 : row / (rows - 1) });
    }
  };
  add();
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const maximumLeg = Math.max(rows, columns) * 2;
  for (let leg = 0; leg < maximumLeg && route.length < rows * columns; leg++) {
    const [rowStep, columnStep] = directions[leg % 4];
    const length = Math.floor(leg / 2) + 1;
    for (let step = 0; step < length; step++) {
      row += rowStep;
      column += columnStep;
      add();
    }
  }
  return route;
}
