// What the courier can and cannot see.
//
// The ship's darkness is a mechanic, not just atmosphere: the layout, the
// furniture and the loot are always visible, so you never get lost or have to
// hunt for a container in the dark — but the zombies are only visible inside
// the wedge you are facing. Everything you cannot see, you have to hear.
//
// Facing follows the cursor, so where you look is a decision with a cost:
// looking down the corridor means not looking at the door behind you.

/** Total width of the visible wedge, in degrees. */
const CONE_DEGREES = 75;
/** Fade band past the cone edge. A hard cutoff pops and reads as a bug. */
const SOFT_EDGE_DEGREES = 18;
/** Close enough to sense regardless of facing — you can hear it breathing. */
const FEEL_RADIUS = 2.6;
/** After it hits you, or you hit it, it stays visible this long. */
export const CONTACT_REVEAL_MS = 900;

const DEG = Math.PI / 180;
const CONE_HALF = (CONE_DEGREES / 2) * DEG;
const SOFT_EDGE = SOFT_EDGE_DEGREES * DEG;

/** Half-angle the view cone light should cover, including its soft edge. */
export const CONE_LIGHT_ANGLE = CONE_HALF + SOFT_EDGE;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Shortest signed distance between two angles, wrapped to [-PI, PI]. */
export function angleDelta(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * How visible a zombie is right now, as an opacity from 0 to 1 applied to the
 * whole figure — eyes included, so nothing is left hanging in the dark once
 * the body is gone. Rotations use the same convention as the rest of the game:
 * atan2(dx, dz), zero pointing down +z.
 */
export function zombieVisibility(
  player: { x: number; z: number; rot: number },
  zombie: { x: number; z: number },
  distance: number,
  revealedUntil: number,
  now: number
): number {
  if (now < revealedUntil) return 1;

  const bearing = Math.atan2(zombie.x - player.x, zombie.z - player.z);
  const offAxis = Math.abs(angleDelta(bearing, player.rot));
  const inCone = 1 - smoothstep(CONE_HALF, CONE_HALF + SOFT_EDGE, offAxis);
  const nearby = 1 - smoothstep(FEEL_RADIUS * 0.6, FEEL_RADIUS, distance);

  return Math.max(inCone, nearby);
}
