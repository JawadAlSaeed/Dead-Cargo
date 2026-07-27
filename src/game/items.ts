// Item definitions and loot generation. Items occupy irregular cell shapes
// (Tetris-style masks) in the grid inventory. Keys and grid upgrades are not
// in the random pool — they're placed deterministically during generation.

import { Cell } from "./grid";
import { TrapKind } from "./traps";

export type ItemType = "weapon" | "healing" | "ammo" | "key" | "upgrade" | "misc" | "trap";

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
    // Deployable trap: using it puts it on the floor rather than consuming it
    // for an immediate effect.
    trapKind?: TrapKind;
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

/**
 * Raw materials. Useless on their own — their whole purpose is to be combined,
 * which is what makes carrying them a real decision: they cost grid space now
 * for a payoff later.
 */
export const MATERIAL_TYPES: Record<string, ItemBlueprint> = {
  GUNPOWDER: {
    name: "Gunpowder",
    type: "misc",
    shape: cellRect(1, 1),
    properties: {}
  },
  SCRAP: {
    name: "Scrap Metal",
    type: "misc",
    shape: cellRect(1, 1),
    properties: {}
  },
  WIRING: {
    name: "Wiring",
    type: "misc",
    shape: cellRect(1, 1),
    properties: {}
  }
};

/**
 * Craft-only outputs. Deliberately not in the loot pool — finding one would
 * undercut the reason to combine anything.
 */
export const CRAFTED_TYPES: Record<string, ItemBlueprint> = {
  MEDICAL_KIT: {
    name: "Medical Kit",
    type: "healing",
    shape: cellRect(2, 1),
    properties: { healAmount: 80 }
  },
  PIPE_BOMB: {
    name: "Pipe Bomb",
    type: "trap",
    // A 1x2 pipe. Awkward enough in a 4x4 pack that carrying two is a real
    // commitment rather than an afterthought.
    shape: cellRect(1, 2),
    properties: { trapKind: "pipeBomb" }
  },
  BEAR_TRAP: {
    name: "Bear Trap",
    type: "trap",
    shape: cellRect(2, 1),
    properties: { trapKind: "bearTrap" }
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
    // One row, not two. Against a 4x4 start, two rows was a 50% jump that
    // ended the space problem in a single pickup.
    name: "Backpack",
    type: "upgrade",
    shape: cellRect(2, 2),
    properties: { expand: { w: 0, h: 1 } }
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

function rollItem(): ItemBlueprint {
  const roll = Math.random();
  if (roll < 0.28) return pickRandom(AMMO_TYPES);
  if (roll < 0.54) return pickRandom(HEALING_TYPES);
  // A little wider than before to absorb the third material: with Wiring added,
  // an unchanged share would have made any single pairing much rarer.
  if (roll < 0.8) return pickRandom(MATERIAL_TYPES);
  if (roll < 0.89) return pickRandom(WEAPON_TYPES);
  if (roll < 0.94) return MELEE_TYPES.KNIFE;
  return Math.random() < 0.6 ? UPGRADE_TYPES.POUCH : UPGRADE_TYPES.BACKPACK;
}

/**
 * Weighted random loot: mostly ammo, healing and raw materials, sometimes a
 * weapon or upgrade. Materials take a fifth of the pool — enough that crafting
 * comes up on its own during a run rather than being a system you have to go
 * looking for.
 *
 * `exclude` holds names the player already carries. A second pistol is not a
 * reward, it is a grid-space problem you have to spend a turn dropping, so
 * duplicates of things you cannot use twice are rolled again.
 */
export function generateRandomItem(exclude: ReadonlySet<string> = new Set()): ItemBlueprint {
  for (let attempt = 0; attempt < 8; attempt++) {
    const blueprint = rollItem();
    if (!exclude.has(blueprint.name)) return blueprint;
  }
  // Carrying one of everything that can be excluded — fall back to a material,
  // which is never redundant because it stacks into something else.
  return pickRandom(MATERIAL_TYPES);
}
