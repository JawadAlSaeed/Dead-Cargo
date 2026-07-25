// Item definitions and loot generation. Items occupy irregular cell shapes
// (Tetris-style masks) in the grid inventory. Keys and grid upgrades are not
// in the random pool — they're placed deterministically during generation.

import { Cell } from "./grid";

export type ItemType = "weapon" | "healing" | "ammo" | "key" | "upgrade" | "misc";

export interface ItemBlueprint {
  name: string;
  type: ItemType;
  shape: Cell[];
  properties: {
    damage?: number;
    healAmount?: number;
    ammoCount?: number;
    ammoType?: string;
    keyId?: string;
    // Grid expansion granted when used: columns / rows.
    expand?: { w: number; h: number };
    // No ammoType, no reload — a short-range weapon swung on the same attack input.
    melee?: boolean;
  };
}

export function generateItemId(type: string): string {
  return `${type}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

const cellRect = (w: number, h: number): Cell[] => {
  const cells: Cell[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push({ x, y });
  return cells;
};

export const WEAPON_TYPES: Record<string, ItemBlueprint> = {
  PISTOL: {
    name: "Pistol",
    type: "weapon",
    // Small L: barrel along the top, grip below
    shape: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    ],
    properties: { damage: 25, ammoType: "9mm" }
  },
  SHOTGUN: {
    name: "Shotgun",
    type: "weapon",
    // Large L: long barrel with the stock dropping down
    shape: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 1 }
    ],
    properties: { damage: 75, ammoType: "shotgun" }
  }
};

export const MELEE_TYPES: Record<string, ItemBlueprint> = {
  KNIFE: {
    name: "Combat Knife",
    type: "weapon",
    // A thin blade shape — distinct from the firearms' L footprints.
    shape: cellRect(1, 2),
    properties: { damage: 35, melee: true }
  }
};

export const HEALING_TYPES: Record<string, ItemBlueprint> = {
  FIRST_AID: {
    name: "First Aid",
    type: "healing",
    shape: cellRect(2, 1),
    properties: { healAmount: 50 }
  },
  HERB_GREEN: {
    name: "Green Herb",
    type: "healing",
    shape: cellRect(1, 1),
    properties: { healAmount: 30 }
  }
};

export const AMMO_TYPES: Record<string, ItemBlueprint> = {
  PISTOL_AMMO: {
    name: "9mm Ammo",
    type: "ammo",
    shape: cellRect(1, 1),
    properties: { ammoCount: 8, ammoType: "9mm" }
  },
  SHOTGUN_AMMO: {
    name: "Shotgun Shells",
    type: "ammo",
    shape: cellRect(2, 1),
    properties: { ammoCount: 4, ammoType: "shotgun" }
  }
};

export const UPGRADE_TYPES: Record<string, ItemBlueprint> = {
  POUCH: {
    name: "Side Pouch",
    type: "upgrade",
    shape: cellRect(1, 1),
    properties: { expand: { w: 1, h: 0 } }
  },
  BACKPACK: {
    name: "Backpack",
    type: "upgrade",
    shape: cellRect(2, 2),
    properties: { expand: { w: 0, h: 2 } }
  }
};

export const CAPTAIN_KEY: ItemBlueprint = {
  name: "Captain's Key",
  type: "key",
  shape: cellRect(1, 1),
  properties: { keyId: "captain" }
};

function pickRandom<T>(record: Record<string, T>): T {
  const keys = Object.keys(record);
  return record[keys[Math.floor(Math.random() * keys.length)]];
}

/** Weighted random loot: mostly ammo and healing, sometimes a weapon or upgrade. */
export function generateRandomItem(): ItemBlueprint {
  const roll = Math.random();
  if (roll < 0.35) return pickRandom(AMMO_TYPES);
  if (roll < 0.72) return pickRandom(HEALING_TYPES);
  if (roll < 0.85) return pickRandom(WEAPON_TYPES);
  if (roll < 0.93) return MELEE_TYPES.KNIFE;
  return Math.random() < 0.6 ? UPGRADE_TYPES.POUCH : UPGRADE_TYPES.BACKPACK;
}
