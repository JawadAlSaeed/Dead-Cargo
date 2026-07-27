// How tall each piece of furniture stands.
//
// Lives in the game layer rather than the renderer because height is not only a
// visual property any more: anything tall enough breaks a zombie's line of
// sight, so a wardrobe is cover and a pallet is not.

export const OBJECT_HEIGHTS: Record<string, number> = {
  // Sleeping
  bunk: 0.5,
  medBed: 0.5,
  nightstand: 0.6,
  // Storage — the tall ones read as a silhouette even unlit
  wardrobe: 2.0,
  tallLocker: 1.9,
  fridge: 1.9,
  cabinet: 1.5,
  medCabinet: 1.5,
  bookshelf: 1.8,
  shelving: 1.8,
  supplyShelf: 1.7,
  footlocker: 0.5,
  toolbox: 0.45,
  crate: 1.0,
  // Surfaces
  counter: 0.95,
  workbench: 0.95,
  stove: 0.9,
  diningTable: 0.8,
  deskSmall: 0.78,
  desk: 0.9,
  chair: 0.9,
  // Bulk
  engineBlock: 1.6,
  pipes: 2.0,
  barrel: 1.1,
  pallet: 0.22,
  radio: 0.4
};

export function objectHeight(type: string): number {
  return OBJECT_HEIGHTS[type] ?? 1;
}

/**
 * Tall enough to hide behind. Set just above a crate, so the deliberate cover —
 * wardrobes, lockers, shelving, the engine block — breaks sight, while counters
 * and tables you could see over do not.
 */
export const SIGHT_BLOCK_HEIGHT = 1.25;

export function blocksSight(type: string): boolean {
  return objectHeight(type) >= SIGHT_BLOCK_HEIGHT;
}
