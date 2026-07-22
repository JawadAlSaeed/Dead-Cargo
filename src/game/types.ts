// Shared game data model, carried over from the original prototype's stores.

export interface Wall {
  position: { x: number; z: number };
  size: { width: number; height: number };
}

export interface Door {
  id: string;
  position: { x: number; z: number };
  size: { width: number; height: number };
  targetRoomId: string;
  targetPosition: { x: number; z: number };
  locked: boolean;
  keyId?: string;
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
  // When set, searching this object yields this specific item instead of random loot.
  guaranteedItem?: "captainKey";
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
