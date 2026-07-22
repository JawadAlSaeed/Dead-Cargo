// Central game state: phase, health, ammo, the generated ship, zombie health,
// searched containers and door locks. Per-frame data (positions) lives in
// src/game/world.ts, not here.

import { create } from "zustand";
import { Ship, Door } from "../game/types";
import { generateShip } from "../game/shipGen";
import {
  AMMO_TYPES,
  CAPTAIN_KEY,
  HEALING_TYPES,
  ItemBlueprint,
  WEAPON_TYPES,
  generateRandomItem
} from "../game/items";
import { resetWorld, world } from "../game/world";
import { useInventory } from "./useInventory";
import { useAudio } from "./useAudio";

export type GamePhase = "menu" | "playing" | "dead" | "won";

interface ZombieLive {
  hp: number;
  alive: boolean;
}

interface GameState {
  phase: GamePhase;
  health: number;
  maxHealth: number;
  ship: Ship | null;
  currentRoomId: string;
  searched: Record<string, boolean>;
  unlockedDoors: Record<string, boolean>;
  zombies: Record<string, ZombieLive>;
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
  searchObject: (roomId: string, objectId: string) => void;
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

export const useGameStore = create<GameState>((set, get) => ({
  phase: "menu",
  health: 100,
  maxHealth: 100,
  ship: null,
  currentRoomId: "",
  searched: {},
  unlockedDoors: {},
  zombies: {},
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
      equippedItemId: pistol?.id ?? null,
      ammoLoaded: 8,
      message: { text: "Find the Captain's Key. Reach the radio in the Captain's Cabin.", at: performance.now() },
      inventoryOpen: false
    });
  },

  backToMenu: () => {
    useAudio.getState().stopMusic();
    set({ phase: "menu", ship: null, inventoryOpen: false });
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
      set({ health: 0, phase: "dead" });
    } else {
      set({ health: next });
    }
  },

  enterRoom: (door) => {
    const { ship, unlockedDoors, setMessage } = get();
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
  },

  searchObject: (roomId, objectId) => {
    const { ship, searched, setMessage } = get();
    if (!ship || searched[objectId]) return;
    const obj = ship.rooms[roomId]?.objects.find((o) => o.id === objectId);
    if (!obj || !obj.containsItem) return;

    const loot: ItemBlueprint = obj.guaranteedItem === "captainKey" ? CAPTAIN_KEY : generateRandomItem();
    const added = useInventory.getState().addItem(loot);
    if (!added) {
      setMessage("Inventory full — make room and search again.");
      return;
    }
    useAudio.getState().playSuccess();
    setMessage(`Found: ${loot.name}`);
    set({ searched: { ...searched, [objectId]: true } });
  },

  interactRadio: () => {
    useAudio.getState().playSuccess();
    useAudio.getState().stopMusic();
    set({ phase: "won" });
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
