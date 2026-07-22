// Polyomino grid placement: items are cell masks (Tetris-style shapes) with
// four rotations. Shared by the player inventory and container grids.

export interface Cell {
  x: number;
  y: number;
}

export interface GridItemLike {
  id: string;
  shape: Cell[];
  rotation: number; // 0..3, quarter turns clockwise
  position: Cell;
}

/** Rotate a shape by n quarter turns clockwise, normalized to min (0,0). */
export function rotateCells(shape: Cell[], rotation: number): Cell[] {
  let cells = shape;
  for (let i = 0; i < ((rotation % 4) + 4) % 4; i++) {
    const maxY = Math.max(...cells.map((c) => c.y));
    cells = cells.map((c) => ({ x: maxY - c.y, y: c.x }));
  }
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  return cells.map((c) => ({ x: c.x - minX, y: c.y - minY }));
}

export function shapeBounds(cells: Cell[]): { width: number; height: number } {
  return {
    width: Math.max(...cells.map((c) => c.x)) + 1,
    height: Math.max(...cells.map((c) => c.y)) + 1
  };
}

/** Absolute occupied cells of a placed item. */
export function absCells(item: GridItemLike): Cell[] {
  return rotateCells(item.shape, item.rotation).map((c) => ({
    x: c.x + item.position.x,
    y: c.y + item.position.y
  }));
}

function occupancy(items: GridItemLike[], ignoreId?: string): Set<string> {
  const occ = new Set<string>();
  for (const item of items) {
    if (item.id === ignoreId) continue;
    for (const c of absCells(item)) occ.add(`${c.x},${c.y}`);
  }
  return occ;
}

export function canPlace(
  shape: Cell[],
  rotation: number,
  x: number,
  y: number,
  grid: { width: number; height: number },
  items: GridItemLike[],
  ignoreId?: string
): boolean {
  const occ = occupancy(items, ignoreId);
  for (const c of rotateCells(shape, rotation)) {
    const ax = x + c.x;
    const ay = y + c.y;
    if (ax < 0 || ay < 0 || ax >= grid.width || ay >= grid.height) return false;
    if (occ.has(`${ax},${ay}`)) return false;
  }
  return true;
}

/** First free placement scanning rows, trying all four rotations per cell. */
export function findPlacement(
  shape: Cell[],
  grid: { width: number; height: number },
  items: GridItemLike[]
): { x: number; y: number; rotation: number } | null {
  const occ = occupancy(items);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      for (let rotation = 0; rotation < 4; rotation++) {
        const cells = rotateCells(shape, rotation);
        let ok = true;
        for (const c of cells) {
          const ax = x + c.x;
          const ay = y + c.y;
          if (ax >= grid.width || ay >= grid.height || occ.has(`${ax},${ay}`)) {
            ok = false;
            break;
          }
        }
        if (ok) return { x, y, rotation };
      }
    }
  }
  return null;
}
