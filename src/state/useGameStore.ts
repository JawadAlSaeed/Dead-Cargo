// Central game state: phase, health, ammo, the generated ship, zombie health,
// container loot and door locks. Per-frame data (positions) lives in
// src/game/world.ts, not here.

import { create } from "zustand";
import { Ship, Door } from "../game/types";
import { generateShip } from "../game/shipGen";
import {
  AMMO_TYPES,
  CAPTAIN_KEY,
  HEALING_TYPES,
  ItemBlueprint,
  UPGRADE_TYPES,
  WEAPON_TYPES,
  generateRandomItem
} from "../game/items";
import { canPlace, findPlacement } from "../game/grid";
import { resetWorld, world } from "../game/world";
import { InventoryItem, itemFromBlueprint, useInventory } from "./useInventory";
import { useAudio } from "./useAudio";

export type GamePhase = "menu" | "playing" | "dead" | "won";

interface ZombieLive {
  hp: number;
  alive: boolean;
}

export interface ContainerState {
  gridSize: { width: number; height: number };
  items: InventoryItem[];
}

/** 'inventory' or a container object id. */
export type GridSide = string;

interface GameState {
  phase: GamePhase;
  health: number;
  maxHealth: number;
  ship: Ship | null;
  currentRoomId: string;
  searched: Record<string, boolean>;
  unlockedDoors: Record<string, boolean>;
  zombies: Record<string, ZombieLive>;
  containers: Record<string, ContainerState>;
  lootTarget: { objectId: string; firstOpen: boolean } | null;
  equippedItemId: string | null;
  ammoLoaded: number;
  message: { text: string; at: number } | null;
  inventoryOpen: boolean;

  startGame: () => void;
  backToMenu: () => void;
  setMessage: (text: string) => void;
  setInventoryOpen: (open: boolean) => void;

  damagePlayer: (amount: number) => void;
  enterRoom: (door: Door) => void;
  openContainer: (roomId: string, objectId: string) => void;
  closeLoot: () => void;
  /**
   * Move an item between grids ('inventory' or a container id), optionally to
   * an exact cell/rotation; without a target it auto-places. Returns success.
   */
  transferItem: (
    source: GridSide,
    dest: GridSide,
    itemId: string,
    target?: { x: number; y: number; rotation: number }
  ) => boolean;
  interactRadio: () => void;
  hitZombie: (zombieId: string, damage: number) => void;
  fireShot: () => boolean;
  reload: () => void;
  useItem: (itemId: string) => void;
  dropItem: (itemId: string) => void;
}

const STARTING_ITEMS: ItemBlueprint[] = [
  WEAPON_TYPES.PISTOL,
  HEALING_TYPES.FIRST_AID,
  AMMO_TYPES.PISTOL_AMMO
];

const CONTAINER_SIZES: Record<string, { width: number; height: number }> = {
  footlocker: { width: 4, height: 2 },
  crate: { width: 4, height: 3 },
  cabinet: { width: 4, height: 3 },
  locker: { width: 4, height: 4 }
};

function generateContainer(guaranteed?: "captainKey" | "backpack", type?: string): ContainerState {
  const gridSize = CONTAINER_SIZES[type ?? ""] ?? { width: 4, height: 3 };
  const blueprints: ItemBlueprint[] = [];
  if (guaranteed === "captainKey") blueprints.push(CAPTAIN_KEY);
  if (guaranteed === "backpack") blueprints.push(UPGRADE_TYPES.BACKPACK);
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) blueprints.push(generateRandomItem());

  const items: InventoryItem[] = [];
  for (const bp of blueprints) {
    const spot = findPlacement(bp.shape, gridSize, items);
    if (!spot) continue; // container ran out of space — drop the extra item
    items.push(itemFromBlueprint(bp, { x: spot.x, y: spot.y }, spot.rotation));
  }
  return { gridSize, items };
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "menu",
  health: 100,
  maxHealth: 100,
  ship: null,
  currentRoomId: "",
  searched: {},
  unlockedDoors: {},
  zombies: {},
  containers: {},
  lootTarget: null,
  equippedItemId: null,
  ammoLoaded: 0,
  message: null,
  inventoryOpen: false,

  startGame: () => {
    const ship = generateShip();
    const zombies: Record<string, ZombieLive> = {};
    for (const z of ship.zombies) zombies[z.id] = { hp: z.hp, alive: true };

    useInventory.getState().reset(STARTING_ITEMS);
    const pistol = useInventory.getState().items.find((i) => i.type === "weapon");

    resetWorld(0, 0);
    useAudio.getState().startMusic();

    set({
      phase: "playing",
      health: 100,
      ship,
      currentRoomId: ship.startRoomId,
      searched: {},
      unlockedDoors: {},
      zombies,
      containers: {},
      lootTarget: null,
      equippedItemId: pistol?.id ?? null,
      ammoLoaded: 8,
      message: { text: "Find the Captain's Key. Reach the radio in the Captain's Cabin.", at: performance.now() },
      inventoryOpen: false
    });
  },

  backToMenu: () => {
    useAudio.getState().stopMusic();
    set({ phase: "menu", ship: null, inventoryOpen: false, lootTarget: null });
  },

  setMessage: (text) => set({ message: { text, at: performance.now() } }),
  setInventoryOpen: (open) => set({ inventoryOpen: open }),

  damagePlayer: (amount) => {
    const { health, phase } = get();
    if (phase !== "playing") return;
    const next = Math.max(0, health - amount);
    useAudio.getState().playHit();
    if (next <= 0) {
      useAudio.getState().stopMusic();
      set({ health: 0, phase: "dead", inventoryOpen: false, lootTarget: null });
    } else {
      set({ health: next });
    }
  },

  enterRoom: (door) => {
    const { ship, unlockedDoors, currentRoomId, setMessage } = get();
    if (!ship) return;
    if (door.locked && !unlockedDoors[door.id]) {
      const hasKey = useInventory
        .getState()
        .items.some((i) => i.type === "key" && i.properties.keyId === door.keyId);
      if (!hasKey) return; // solid door; collision handles the block
      set({ unlockedDoors: { ...unlockedDoors, [door.id]: true } });
      setMessage("Unlocked with the Captain's Key.");
    }
    world.player.x = door.targetPosition.x;
    world.player.z = door.targetPosition.z;
    world.zombiePos.clear();
    set({ currentRoomId: door.targetRoomId });
    if (door.kind === "stairs") {
      const fromFloor = ship.rooms[currentRoomId]?.floor;
      const toFloor = ship.rooms[door.targetRoomId]?.floor;
      if (fromFloor !== undefined && toFloor !== undefined) {
        setMessage(toFloor > fromFloor ? "You climb to the upper deck." : "You descend to the lower deck.");
      }
    }
  },

  openContainer: (roomId, objectId) => {
    const { ship, containers, searched } = get();
    if (!ship) return;
    const obj = ship.rooms[roomId]?.objects.find((o) => o.id === objectId);
    if (!obj || !obj.containsItem) return;

    const firstOpen = !containers[objectId];
    const nextContainers = firstOpen
      ? { ...containers, [objectId]: generateContainer(obj.guaranteedItem, obj.type) }
      : containers;

    set({
      containers: nextContainers,
      lootTarget: { objectId, firstOpen },
      searched: { ...searched, [objectId]: true },
      inventoryOpen: false
    });
  },

  closeLoot: () => set({ lootTarget: null }),

  transferItem: (source, dest, itemId, target) => {
    const { containers, equippedItemId, setMessage } = get();
    const inv = useInventory.getState();

    const sideOf = (side: GridSide) =>
      side === "inventory"
        ? { grid: inv.gridSize, items: inv.items }
        : { grid: containers[side]?.gridSize, items: containers[side]?.items ?? [] };

    const from = sideOf(source);
    const to = sideOf(dest);
    if (!from.grid || !to.grid) return false;
    const item = from.items.find((i) => i.id === itemId);
    if (!item) return false;

    // Work out the destination placement.
    let placement: { x: number; y: number; rotation: number } | null = null;
    if (target) {
      const ignoreId = source === dest ? itemId : undefined;
      if (canPlace(item.shape, target.rotation, target.x, target.y, to.grid, to.items, ignoreId)) {
        placement = target;
      }
    } else {
      const itemsForSearch = source === dest ? to.items.filter((i) => i.id !== itemId) : to.items;
      placement = findPlacement(item.shape, to.grid, itemsForSearch);
    }
    if (!placement) {
      setMessage("No room for that.");
      return false;
    }

    const placed: InventoryItem = {
      ...item,
      position: { x: placement.x, y: placement.y },
      rotation: placement.rotation
    };

    // Same-grid move.
    if (source === dest) {
      if (source === "inventory") {
        inv.placeItem(itemId, placement.x, placement.y, placement.rotation);
      } else {
        set({
          containers: {
            ...containers,
            [source]: {
              ...containers[source],
              items: containers[source].items.map((i) => (i.id === itemId ? placed : i))
            }
          }
        });
      }
      return true;
    }

    // Cross-grid: remove from source, insert into destination.
    if (source === "inventory") {
      if (itemId === equippedItemId) set({ equippedItemId: null, ammoLoaded: 0 });
      inv.removeItem(itemId);
    } else {
      set((s) => ({
        containers: {
          ...s.containers,
          [source]: {
            ...s.containers[source],
            items: s.containers[source].items.filter((i) => i.id !== itemId)
          }
        }
      }));
    }
    if (dest === "inventory") {
      inv.insertItem(placed);
      useAudio.getState().playSuccess();
    } else {
      set((s) => ({
        containers: {
          ...s.containers,
          [dest]: { ...s.containers[dest], items: [...s.containers[dest].items, placed] }
        }
      }));
    }
    return true;
  },

  interactRadio: () => {
    useAudio.getState().playSuccess();
    useAudio.getState().stopMusic();
    set({ phase: "won", inventoryOpen: false, lootTarget: null });
  },

  hitZombie: (zombieId, damage) => {
    const { zombies } = get();
    const z = zombies[zombieId];
    if (!z || !z.alive) return;
    const hp = z.hp - damage;
    useAudio.getState().playHit();
    set({
      zombies: {
        ...zombies,
        [zombieId]: { hp: Math.max(0, hp), alive: hp > 0 }
      }
    });
  },

  fireShot: () => {
    const { ammoLoaded, setMessage } = get();
    if (ammoLoaded <= 0) {
      setMessage("Click. Empty — press R to reload.");
      return false;
    }
    set({ ammoLoaded: ammoLoaded - 1 });
    return true;
  },

  reload: () => {
    const { equippedItemId, ammoLoaded, setMessage } = get();
    const inv = useInventory.getState();
    const weapon = inv.items.find((i) => i.id === equippedItemId);
    if (!weapon) {
      setMessage("No weapon equipped.");
      return;
    }
    const ammoType = weapon.properties.ammoType;
    const box = inv.items.find((i) => i.type === "ammo" && i.properties.ammoType === ammoType);
    if (!box) {
      setMessage(`No ${ammoType} ammo left.`);
      return;
    }
    inv.removeItem(box.id);
    set({ ammoLoaded: ammoLoaded + (box.properties.ammoCount ?? 0) });
    setMessage(`Reloaded (+${box.properties.ammoCount}).`);
  },

  useItem: (itemId) => {
    const { health, maxHealth, setMessage } = get();
    const inv = useInventory.getState();
    const item = inv.items.find((i) => i.id === itemId);
    if (!item) return;

    switch (item.type) {
      case "healing": {
        const amount = item.properties.healAmount ?? 0;
        if (health >= maxHealth) {
          setMessage("Already at full health.");
          return;
        }
        inv.removeItem(itemId);
        set({ health: Math.min(maxHealth, health + amount) });
        setMessage(`Used ${item.name} (+${amount} HP).`);
        break;
      }
      case "weapon": {
        if (get().equippedItemId === itemId) {
          setMessage(`${item.name} already equipped.`);
          return;
        }
        set({ equippedItemId: itemId, ammoLoaded: 0 });
        setMessage(`Equipped ${item.name} — press R to load it.`);
        break;
      }
      case "upgrade": {
        const expand = item.properties.expand;
        if (!expand) return;
        if (!inv.expandGrid(expand.w, expand.h)) {
          setMessage("Your pack can't be expanded any further.");
          return;
        }
        inv.removeItem(itemId);
        useAudio.getState().playSuccess();
        const grown = useInventory.getState().gridSize;
        setMessage(`${item.name} attached — inventory is now ${grown.width}×${grown.height}.`);
        break;
      }
      case "key":
        setMessage("Bring it to the locked door.");
        break;
      default:
        setMessage(`Nothing to do with ${item.name}.`);
    }
  },

  dropItem: (itemId) => {
    const { equippedItemId, setMessage } = get();
    const inv = useInventory.getState();
    const item = inv.items.find((i) => i.id === itemId);
    if (!item) return;
    if (item.type === "key") {
      setMessage("Better hold on to that.");
      return;
    }
    if (itemId === equippedItemId) {
      set({ equippedItemId: null, ammoLoaded: 0 });
    }
    inv.removeItem(itemId);
    setMessage(`Dropped ${item.name}.`);
  }
}));

/** True when any full-screen UI (inventory or loot window) is open. */
export function isUiOpen(s: { inventoryOpen: boolean; lootTarget: unknown }): boolean {
  return s.inventoryOpen || s.lootTarget !== null;
}
