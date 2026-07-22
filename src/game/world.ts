// Mutable per-frame world state, deliberately kept OUT of React/zustand so the
// render tree never re-renders at 60fps. Stores hold game state (health, ammo,
// rooms, inventory); this module holds what changes every frame.

export interface WorldState {
  player: { x: number; z: number; rot: number };
  aim: { x: number; z: number };
  aiming: boolean;
  keys: Record<string, boolean>;
  // Live zombie positions, keyed by zombie id (only current room's zombies).
  zombiePos: Map<string, { x: number; z: number }>;
  lastShotAt: number;
}

export const world: WorldState = {
  player: { x: 0, z: 0, rot: 0 },
  aim: { x: 0, z: 1 },
  aiming: false,
  keys: {},
  zombiePos: new Map(),
  lastShotAt: 0
};

export function resetWorld(startX = 0, startZ = 0) {
  world.player.x = startX;
  world.player.z = startZ;
  world.player.rot = 0;
  world.aiming = false;
  world.keys = {};
  world.zombiePos.clear();
  world.lastShotAt = 0;
}
