// Mutable per-frame world state, deliberately kept OUT of React/zustand so the
// render tree never re-renders at 60fps. Stores hold game state (health, ammo,
// rooms, inventory); this module holds what changes every frame.

import { Noise, SenseState } from "./senses";

export interface WorldState {
  player: { x: number; z: number; rot: number };
  // Aim point on the floor plane, derived each frame from mouseScreen.
  aim: { x: number; z: number };
  // Cursor position in CSS pixels — drives both the aim raycast and the
  // DOM crosshair. Aiming itself is always on; this is not a toggle.
  mouseScreen: { x: number; y: number };
  moving: boolean;
  // Holding sneak: slower, and quiet enough to emit no footstep noise at all.
  sneaking: boolean;
  keys: Record<string, boolean>;
  // Live zombie positions, keyed by zombie id (only current room's zombies).
  zombiePos: Map<string, { x: number; z: number }>;
  // Per-zombie perception, keyed the same way. Out of React because awareness
  // changes every frame.
  zombieSense: Map<string, SenseState>;
  // Recent sounds. Zombies investigate the position of a noise rather than the
  // player, which is what makes misdirecting them possible.
  noises: Noise[];
  lastShotAt: number;
  lastHitConfirmedAt: number;
  // Where the last hit on the player came from, as a world bearing in the same
  // atan2(dx, dz) convention as player.rot. Drives the HUD's damage arc — with
  // zombies invisible outside the view cone, a hit otherwise arrives from
  // nowhere and there is no way to learn which way to turn.
  lastHit: { angle: number; at: number };
  shake: { until: number; total: number; magnitude: number };
}

const screenCenter = () => ({
  x: typeof window === "undefined" ? 0 : window.innerWidth / 2,
  y: typeof window === "undefined" ? 0 : window.innerHeight / 2
});

export const world: WorldState = {
  player: { x: 0, z: 0, rot: 0 },
  aim: { x: 0, z: 1 },
  mouseScreen: screenCenter(),
  moving: false,
  sneaking: false,
  keys: {},
  zombiePos: new Map(),
  zombieSense: new Map(),
  noises: [],
  lastShotAt: 0,
  lastHitConfirmedAt: 0,
  lastHit: { angle: 0, at: 0 },
  shake: { until: 0, total: 1, magnitude: 0 }
};

/**
 * Make a sound at a place. Zombies in the room that are close enough will go
 * and look at where it came from — so a gunshot pulls a room toward you, and a
 * pipe bomb going off across the deck pulls it somewhere else entirely.
 */
export function emitNoise(x: number, z: number, radius: number, roomId: string) {
  world.noises.push({ x, z, radius, roomId, at: performance.now() });
  // Only the last moment matters; anything older has already been reacted to.
  if (world.noises.length > 24) world.noises.splice(0, world.noises.length - 24);
}

/** Kick off a brief camera jitter — magnitude in world units, duration in ms. */
export function triggerShake(magnitude: number, durationMs: number) {
  const now = performance.now();
  // Don't let a small shake cut a bigger one already in flight short.
  if (now + durationMs < world.shake.until && magnitude <= world.shake.magnitude) return;
  world.shake.until = now + durationMs;
  world.shake.total = durationMs;
  world.shake.magnitude = magnitude;
}

export function resetWorld(startX = 0, startZ = 0) {
  world.player.x = startX;
  world.player.z = startZ;
  world.player.rot = 0;
  world.mouseScreen = screenCenter();
  world.moving = false;
  world.sneaking = false;
  world.keys = {};
  world.zombiePos.clear();
  world.zombieSense.clear();
  world.noises.length = 0;
  world.lastShotAt = 0;
  world.lastHitConfirmedAt = 0;
  world.lastHit = { angle: 0, at: 0 };
  world.shake = { until: 0, total: 1, magnitude: 0 };
}
