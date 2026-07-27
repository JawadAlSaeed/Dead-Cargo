// What the zombies can perceive.
//
// The old AI was one line — `aggroed = distance < aggroRange` — which meant
// they saw through walls, through furniture, in the dark, behind themselves,
// instantly, and dropped you the moment you crossed an invisible circle. It
// also meant walking into a room woke every zombie in it, because you land
// about three metres from the nearest one and the ranges are seven to eleven.
//
// Worse, it was backwards. The courier can only see inside a 75-degree wedge;
// making the monsters omniscient put the blindness on the wrong side.
//
// So zombies get senses of their own, and stealth falls out of them rather than
// being bolted on:
//
//   Sight    — a cone they actually face, blocked by furniture tall enough to
//              hide behind, shorter while they are dormant.
//   Hearing  — noises happen at a place. A zombie investigates the place, not
//              you, which is what makes misdirection possible at all.
//
// Detection fills over time instead of flipping, so there is a moment between
// being noticed and being hunted. That moment is the whole game of sneaking.

import { Room, RoomObject } from "./types";
import { blocksSight } from "./furniture";

export type ZombieState = "dormant" | "suspicious" | "hunting" | "searching";

/** Half-angle of a zombie's vision, in radians. Wider than the courier's. */
const CONE_HALF = (110 / 2) * (Math.PI / 180);
/** How far they can see, before and after something has put them on edge. */
const SIGHT_RANGE_DORMANT = 7;
const SIGHT_RANGE_ALERT = 11;

/**
 * Seconds of unbroken sight needed to commit to hunting, at point-blank and at
 * the edge of vision. Walk into one's face and it has you almost at once; catch
 * its eye across the room and you have time to get out of the way.
 */
const SPOT_TIME_NEAR = 0.5;
const SPOT_TIME_FAR = 2.4;
/** Sneaking multiplies the time it takes to be seen. */
const SNEAK_SPOT_MULTIPLIER = 2.2;
/** Awareness bleeds away this fast (per second) with nothing to see or hear. */
const AWARENESS_DECAY = 0.42;
/** Above this, a zombie stops idling and starts moving to investigate. */
export const SUSPICIOUS_AT = 0.3;
/**
 * A noise can rattle a zombie but never, on its own, make it hunt you. It knows
 * something happened over there; it still has to lay eyes on you to commit.
 * Without this ceiling a door click left one primed at 0.75, so sight had
 * almost nothing left to fill and you were rushed a quarter-second after
 * stepping through — which is the instant-alert problem in a new hat.
 */
export const NOISE_AWARENESS_CEILING = 0.72;
/**
 * A noise this loud makes a zombie turn straight to it. Below it they note the
 * spot and drift over without ever looking your way on purpose — set above the
 * door and footstep radii, below the gunshot.
 */
export const LOUD_ENOUGH_TO_TURN = 8;
/** How long they poke around a lost trail before settling down again. */
export const SEARCH_DURATION_MS = 5000;
/**
 * How long a zombie commits to checking out whatever roused it.
 *
 * This has to be a timer rather than a live awareness threshold. Awareness
 * bleeds away at roughly half a bar per second, so a single gunshot bought
 * about half a second of walking before the zombie dropped back to idle having
 * moved a third of a metre — it never actually arrived anywhere. Deciding to go
 * and look is a commitment; it does not get re-litigated every frame.
 */
export const INVESTIGATE_DURATION_MS = 6500;
/** Fraction of normal speed while investigating rather than hunting. */
export const INVESTIGATE_SPEED = 0.42;

/** A sound, at a place. Zombies within `radius` will go and look at it. */
export interface Noise {
  x: number;
  z: number;
  radius: number;
  roomId: string;
  at: number;
}

/** Loudness of everything that makes a sound, as a radius in world units. */
export const NOISE = {
  /** Sneaking emits nothing at all — that is the point of it. */
  footstep: 3.5,
  door: 2.5,
  reload: 4,
  /** The knife is described as silent, and now actually is, near enough. */
  melee: 2,
  pistol: 22,
  shotgun: 30,
  bearTrap: 12,
  pipeBomb: 40
} as const;

/** Per-zombie perception, kept out of React — it changes every frame. */
export interface SenseState {
  state: ZombieState;
  /** 0 to 1. Reaching 1 commits to hunting. */
  awareness: number;
  /** Where it is looking, as a world bearing. */
  facing: number;
  /** Point it is moving to check: a noise, or where you were last seen. */
  investigate: { x: number; z: number } | null;
  /** Timestamp after which a fruitless search is given up. */
  searchUntil: number;
  /** Noises older than this have already been considered. */
  lastHeardAt: number;
  /** Idle look-around timer. */
  nextGlanceAt: number;
}

export function freshSense(facing = 0): SenseState {
  return {
    state: "dormant",
    awareness: 0,
    facing,
    investigate: null,
    searchUntil: 0,
    lastHeardAt: 0,
    nextGlanceAt: 0
  };
}

function shortestAngle(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Does the segment from (ax,az) to (bx,bz) cross this object's footprint?
 * Slab method against the axis-aligned box — furniture is never rotated, so
 * this is exact rather than an approximation.
 */
function segmentHitsBox(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  obj: RoomObject
): boolean {
  const minX = obj.position.x - obj.size.width / 2;
  const maxX = obj.position.x + obj.size.width / 2;
  const minZ = obj.position.z - obj.size.height / 2;
  const maxZ = obj.position.z + obj.size.height / 2;

  const dx = bx - ax;
  const dz = bz - az;
  let t0 = 0;
  let t1 = 1;

  for (const [origin, delta, lo, hi] of [
    [ax, dx, minX, maxX],
    [az, dz, minZ, maxZ]
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < lo || origin > hi) return false;
      continue;
    }
    let near = (lo - origin) / delta;
    let far = (hi - origin) / delta;
    if (near > far) [near, far] = [far, near];
    t0 = Math.max(t0, near);
    t1 = Math.min(t1, far);
    if (t0 > t1) return false;
  }
  return true;
}

/** Clear line of sight between two points, ignoring anything short. */
export function hasLineOfSight(
  from: { x: number; z: number },
  to: { x: number; z: number },
  room: Room
): boolean {
  for (const obj of room.objects) {
    if (!obj.collidable || !blocksSight(obj.type)) continue;
    if (segmentHitsBox(from.x, from.z, to.x, to.z, obj)) return false;
  }
  return true;
}

export interface SightCheck {
  visible: boolean;
  distance: number;
  bearing: number;
}

/** Can this zombie, facing this way, currently see the courier? */
export function canSee(
  sense: SenseState,
  zombie: { x: number; z: number },
  player: { x: number; z: number },
  room: Room
): SightCheck {
  const dx = player.x - zombie.x;
  const dz = player.z - zombie.z;
  const distance = Math.hypot(dx, dz);
  const bearing = Math.atan2(dx, dz);
  const range = sense.state === "dormant" ? SIGHT_RANGE_DORMANT : SIGHT_RANGE_ALERT;

  if (distance > range) return { visible: false, distance, bearing };
  // Close enough to touch is felt regardless of where it happens to be looking.
  const inCone = distance < 1.2 || Math.abs(shortestAngle(bearing, sense.facing)) <= CONE_HALF;
  if (!inCone) return { visible: false, distance, bearing };
  if (!hasLineOfSight(zombie, player, room)) return { visible: false, distance, bearing };
  return { visible: true, distance, bearing };
}

/**
 * How much awareness one second of unbroken sight is worth at this distance.
 * Near the zombie it is most of the bar; at the edge of its vision it is a
 * trickle, and sneaking roughly halves it either way.
 */
export function awarenessGain(distance: number, sneaking: boolean, delta: number): number {
  const t = Math.min(1, distance / SIGHT_RANGE_ALERT);
  const seconds = SPOT_TIME_NEAR + (SPOT_TIME_FAR - SPOT_TIME_NEAR) * t;
  const scaled = seconds * (sneaking ? SNEAK_SPOT_MULTIPLIER : 1);
  return delta / scaled;
}

export function awarenessDecay(delta: number): number {
  return AWARENESS_DECAY * delta;
}

/** A noise at or above this radius counts as fully loud. */
const FULLY_LOUD_RADIUS = 20;

/**
 * Awareness from hearing something. Two things matter and both have to: how
 * close it went off relative to how far it carries, and how loud it was in
 * absolute terms. Using only the first made a gunshot across the room no more
 * rousing than a door easing open at your elbow, which left zombies ignoring
 * gunfire six metres away.
 */
export function noiseAwareness(radius: number, distance: number): number {
  const closeness = Math.max(0, 1 - distance / radius);
  const loudness = Math.min(1, radius / FULLY_LOUD_RADIUS);
  return (0.15 + closeness * 0.45) * (0.3 + 0.7 * loudness);
}
