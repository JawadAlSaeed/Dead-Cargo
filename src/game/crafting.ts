// Combining items. Drag one item onto another in the inventory and, if the
// pair has a recipe, they become the result — the Resident Evil mechanic the
// rest of this inventory is modelled on, so the grid stays the only interface
// and there is no crafting screen to open.
//
// Every recipe has to beat the sum of its parts, or nobody would ever use it:
// two Green Herbs heal 30 each, so turning them into anything that heals less
// than 60 is a trap. What you pay instead is flexibility — a Medical Kit is one
// action you cannot split across two bad moments, and it overheals if you use
// it at 90 health. That trade is the decision the system is actually about.

import { AMMO_TYPES, CRAFTED_TYPES, ItemBlueprint, MELEE_TYPES } from "./items";
import { Cell, GridItemLike, absCells } from "./grid";

export interface Recipe {
  /** Blueprint names, order-independent. */
  inputs: [string, string];
  output: ItemBlueprint;
  /** Shown in the inventory panel so recipes are discoverable in game. */
  note: string;
}

export const RECIPES: Recipe[] = [
  {
    inputs: ["Green Herb", "Green Herb"],
    output: CRAFTED_TYPES.MEDICAL_KIT,
    note: "heals 80, against 60 for the two herbs apart"
  },
  {
    inputs: ["Gunpowder", "Gunpowder"],
    output: AMMO_TYPES.SHOTGUN_AMMO,
    note: "turns dead weight into shells"
  },
  {
    inputs: ["Gunpowder", "Scrap Metal"],
    output: AMMO_TYPES.PISTOL_AMMO,
    note: "two cells of junk become one of ammo"
  },
  {
    inputs: ["Scrap Metal", "Scrap Metal"],
    output: MELEE_TYPES.KNIFE,
    note: "a way out of a run that turned up no weapons"
  }
];

/**
 * The recipe for a pair, if there is one. Matching is on item name because that
 * is what survives onto a placed InventoryItem — blueprints have no id, and the
 * names are unique.
 */
export function findRecipe(a: string, b: string): Recipe | null {
  return (
    RECIPES.find(
      (r) =>
        (r.inputs[0] === a && r.inputs[1] === b) || (r.inputs[0] === b && r.inputs[1] === a)
    ) ?? null
  );
}

/**
 * The inventory item sitting at `cell` that the held item could combine with.
 *
 * Shared by the inventory window and the loot window, which both show your
 * inventory — crafting has to work in either, and it works from a container
 * item too, so `held` is not required to be in the inventory itself.
 */
export function combineTargetAt<T extends GridItemLike & { name: string }>(
  held: { id: string; name: string } | null,
  inventoryItems: T[],
  cell: Cell
): T | null {
  if (!held) return null;
  const under = inventoryItems.find(
    (i) => i.id !== held.id && absCells(i).some((c) => c.x === cell.x && c.y === cell.y)
  );
  return under && findRecipe(held.name, under.name) ? under : null;
}

/** Every recipe a given item can take part in. Drives the in-game hint. */
export function recipesFor(name: string): Recipe[] {
  return RECIPES.filter((r) => r.inputs.includes(name));
}

/** What this item needs combining with, as short display text. */
export function combinesWith(name: string): string[] {
  return recipesFor(name).map((r) => {
    const other = r.inputs[0] === name ? r.inputs[1] : r.inputs[0];
    return `+ ${other} → ${r.output.name}`;
  });
}
