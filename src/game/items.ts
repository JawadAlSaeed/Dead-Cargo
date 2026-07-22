// Item definitions and loot generation, salvaged from the original prototype.
// Keys are no longer in the random pool — the Captain's Key is placed
// deterministically during ship generation so every run is winnable.

export type ItemType = "weapon" | "healing" | "ammo" | "key" | "misc";

export interface ItemBlueprint {
  name: string;
  type: ItemType;
  size: { width: number; height: number };
  properties: {
    damage?: number;
    healAmount?: number;
    ammoCount?: number;
    ammoType?: string;
    keyId?: string;
  };
}

export function generateItemId(type: string): string {
  return `${type}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export const WEAPON_TYPES: Record<string, ItemBlueprint> = {
  PISTOL: {
    name: "Pistol",
    type: "weapon",
    size: { width: 2, height: 1 },
    properties: { damage: 25, ammoType: "9mm" }
  },
  SHOTGUN: {
    name: "Shotgun",
    type: "weapon",
    size: { width: 3, height: 1 },
    properties: { damage: 75, ammoType: "shotgun" }
  }
};

export const HEALING_TYPES: Record<string, ItemBlueprint> = {
  FIRST_AID: {
    name: "First Aid",
    type: "healing",
    size: { width: 1, height: 1 },
    properties: { healAmount: 50 }
  },
  HERB_GREEN: {
    name: "Green Herb",
    type: "healing",
    size: { width: 1, height: 1 },
    properties: { healAmount: 30 }
  }
};

export const AMMO_TYPES: Record<string, ItemBlueprint> = {
  PISTOL_AMMO: {
    name: "9mm Ammo",
    type: "ammo",
    size: { width: 1, height: 1 },
    properties: { ammoCount: 8, ammoType: "9mm" }
  },
  SHOTGUN_AMMO: {
    name: "Shotgun Shells",
    type: "ammo",
    size: { width: 1, height: 1 },
    properties: { ammoCount: 4, ammoType: "shotgun" }
  }
};

export const CAPTAIN_KEY: ItemBlueprint = {
  name: "Captain's Key",
  type: "key",
  size: { width: 1, height: 1 },
  properties: { keyId: "captain" }
};

function pickRandom<T>(record: Record<string, T>): T {
  const keys = Object.keys(record);
  return record[keys[Math.floor(Math.random() * keys.length)]];
}

/** Weighted random loot: mostly ammo and healing, occasionally a weapon. */
export function generateRandomItem(): ItemBlueprint {
  const roll = Math.random();
  if (roll < 0.4) return pickRandom(AMMO_TYPES);
  if (roll < 0.8) return pickRandom(HEALING_TYPES);
  return pickRandom(WEAPON_TYPES);
}
