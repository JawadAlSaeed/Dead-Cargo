// Grid inventory with irregular (polyomino) item shapes. Starts small (5x6)
// and can be expanded by upgrade items. Pure grid logic only — item effects
// live in useGameStore.

import { create } from "zustand";
import { ItemBlueprint, ItemType, generateItemId } from "../game/items";
import { Cell, canPlace, findPlacement } from "../game/grid";

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  shape: Cell[];
  rotation: number; // 0..3 quarter turns
  position: Cell;
  properties: ItemBlueprint["properties"];
}

// A 4x4 pack that you feel the walls of immediately. The old 5x6 start was
// never full, so upgrades landed as a nice-to-have rather than relief, and the
// whole point of a grid inventory is that space hurts. The ceiling comes down
// with it — growing to 8x10 from here would undo the pressure entirely.
export const GRID_MAX = { width: 6, height: 6 };
const GRID_START = { width: 4, height: 4 };

export function itemFromBlueprint(
  blueprint: ItemBlueprint,
  position: Cell,
  rotation = 0
): InventoryItem {
  return {
    id: generateItemId(blueprint.type),
    name: blueprint.name,
    type: blueprint.type,
    shape: blueprint.shape,
    rotation,
    position,
    properties: blueprint.properties
  };
}

interface InventoryState {
  gridSize: { width: number; height: number };
  items: InventoryItem[];

  /** Auto-place a new item (tries all rotations). Returns false when full. */
  addItem: (blueprint: ItemBlueprint) => boolean;
  /** Insert an already-built item at an exact spot (must be validated first). */
  insertItem: (item: InventoryItem) => void;
  /** Auto-place an existing item (keeps id/properties). Returns false when full. */
  autoPlace: (item: InventoryItem) => boolean;
  removeItem: (itemId: string) => void;
  /** Move/rotate an item within the grid. Returns false if it doesn't fit. */
  placeItem: (itemId: string, x: number, y: number, rotation: number) => boolean;
  expandGrid: (dw: number, dh: number) => boolean;
  reset: (starting: ItemBlueprint[]) => void;
}

export const useInventory = create<InventoryState>((set, get) => ({
  gridSize: { ...GRID_START },
  items: [],

  addItem: (blueprint) => {
    const { items, gridSize } = get();
    const spot = findPlacement(blueprint.shape, gridSize, items);
    if (!spot) return false;
    set({
      items: [...items, itemFromBlueprint(blueprint, { x: spot.x, y: spot.y }, spot.rotation)]
    });
    return true;
  },

  insertItem: (item) => {
    set((state) => ({ items: [...state.items, item] }));
  },

  autoPlace: (item) => {
    const { items, gridSize } = get();
    const spot = findPlacement(item.shape, gridSize, items);
    if (!spot) return false;
    set({
      items: [
        ...items,
        { ...item, position: { x: spot.x, y: spot.y }, rotation: spot.rotation }
      ]
    });
    return true;
  },

  removeItem: (itemId) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== itemId) }));
  },

  placeItem: (itemId, x, y, rotation) => {
    const { items, gridSize } = get();
    const item = items.find((i) => i.id === itemId);
    if (!item) return false;
    if (!canPlace(item.shape, rotation, x, y, gridSize, items, itemId)) return false;
    set({
      items: items.map((i) =>
        i.id === itemId ? { ...i, position: { x, y }, rotation } : i
      )
    });
    return true;
  },

  expandGrid: (dw, dh) => {
    const { gridSize } = get();
    const width = gridSize.width + dw;
    const height = gridSize.height + dh;
    if (width > GRID_MAX.width || height > GRID_MAX.height) return false;
    set({ gridSize: { width, height } });
    return true;
  },

  reset: (starting) => {
    set({ gridSize: { ...GRID_START }, items: [] });
    for (const blueprint of starting) get().addItem(blueprint);
  }
}));
