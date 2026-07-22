// Shared game data model, carried over from the original prototype's stores.

export interface Wall {
  position: { x: number; z: number };
  size: { width: number; height: number };
  // True for the hallway's outer hull wall — rendered as glass with the sea
  // visible beyond it, instead of an opaque bulkhead.
  isWindow?: boolean;
}

export interface Door {
  id: string;
  position: { x: number; z: number };
  size: { width: number; height: number };
  targetRoomId: string;
  targetPosition: { x: number; z: number };
  locked: boolean;
  keyId?: string;
  // Set for the connector between the two decks' hallways — rendered as an
  // actual staircase instead of a plain doorway.
  kind?: "stairs";
}

export interface RoomObject {
  id: string;
  type: string;
  position: { x: number; z: number };
  size: { width: number; height: number };
  collidable: boolean;
  color: string;
  interactable: boolean;
  containsItem: boolean;
  // When set, this object's container always holds this item in addition
  // to its random loot.
  guaranteedItem?: "captainKey" | "backpack";
}

export type RoomType =
  | "hallway"
  | "bedroom"
  | "kitchen"
  | "medical"
  | "cargo"
  | "engine"
  | "captainCabin";

export interface Room {
  id: string;
  type: RoomType;
  label: string;
  floor: number; // 0 = lower deck, 1 = upper deck
  size: { width: number; height: number };
  walls: Wall[];
  doors: Door[];
  objects: RoomObject[];
}

export interface ZombieSpawn {
  id: string;
  roomId: string;
  position: { x: number; z: number };
  speed: number;
  hp: number;
}

export interface Ship {
  rooms: Record<string, Room>;
  startRoomId: string;
  zombies: ZombieSpawn[];
}
