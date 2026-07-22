// RE4-style grid inventory, salvaged from the original prototype.
// Pure grid logic only — item *effects* (healing, equipping) live in
// useGameStore so this store has no cross-store dependencies.

import { create } from "zustand";
import { ItemBlueprint, ItemType, generateItemId } from "../game/items";

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  size: { width: number; height: number };
  position: { x: number; y: number };
  rotated: boolean;
  properties: ItemBlueprint["properties"];
}

interface InventoryState {
  gridSize: { width: number; height: number };
  items: InventoryItem[];

  addItem: (item: ItemBlueprint) => boolean;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, x: number, y: number) => void;
  rotateItem: (itemId: string) => void;
  findFreePosition: (width: number, height: number) => { x: number; y: number } | null;
  reset: (starting: ItemBlueprint[]) => void;
}

function itemFootprint(item: InventoryItem): { width: number; height: number } {
  return item.rotated
    ? { width: item.size.height, height: item.size.width }
    : { width: item.size.width, height: item.size.height };
}

function overlaps(
  x: number,
  y: number,
  w: number,
  h: number,
  item: InventoryItem
): boolean {
  const fp = itemFootprint(item);
  return !(
    x + w <= item.position.x ||
    y + h <= item.position.y ||
    x >= item.position.x + fp.width ||
    y >= item.position.y + fp.height
  );
}

export const useInventory = create<InventoryState>((set, get) => ({
  gridSize: { width: 6, height: 8 },
  items: [],

  addItem: (blueprint) => {
    const { items, findFreePosition } = get();
    const freePosition = findFreePosition(blueprint.size.width, blueprint.size.height);
    if (!freePosition) return false;

    const newItem: InventoryItem = {
      id: generateItemId(blueprint.type),
      name: blueprint.name,
      type: blueprint.type,
      size: blueprint.size,
      position: freePosition,
      rotated: false,
      properties: blueprint.properties
    };
    set({ items: [...items, newItem] });
    return true;
  },

  removeItem: (itemId) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== itemId) }));
  },

  moveItem: (itemId, x, y) => {
    const { items, gridSize } = get();
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const fp = itemFootprint(item);
    if (x < 0 || y < 0 || x + fp.width > gridSize.width || y + fp.height > gridSize.height) return;
    for (const other of items) {
      if (other.id !== itemId && overlaps(x, y, fp.width, fp.height, other)) return;
    }
    set({
      items: items.map((i) => (i.id === itemId ? { ...i, position: { x, y } } : i))
    });
  },

  rotateItem: (itemId) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;
        const rotated = !item.rotated;
        const newWidth = rotated ? item.size.height : item.size.width;
        const newHeight = rotated ? item.size.width : item.size.height;

        if (
          item.position.x + newWidth > state.gridSize.width ||
          item.position.y + newHeight > state.gridSize.height
        ) {
          return item;
        }
        for (const other of state.items) {
          if (other.id === itemId) continue;
          if (overlaps(item.position.x, item.position.y, newWidth, newHeight, other)) {
            return item;
          }
        }
        return { ...item, rotated };
      })
    }));
  },

  findFreePosition: (width, height) => {
    const { items, gridSize } = get();
    for (let y = 0; y <= gridSize.height - height; y++) {
      for (let x = 0; x <= gridSize.width - width; x++) {
        if (items.every((item) => !overlaps(x, y, width, height, item))) {
          return { x, y };
        }
      }
    }
    return null;
  },

  reset: (starting) => {
    set({ items: [] });
    for (const blueprint of starting) get().addItem(blueprint);
  }
}));
