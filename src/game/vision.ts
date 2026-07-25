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
/**
 * Outside the cone an aggroed zombie still shows its eyes, faintly, within
 * this range. Two red pinpricks in the dark tell you something is coming
 * without telling you what or exactly where. Set to 0 to switch it off.
 */
const EYE_GLOW_RANGE = 9;
const EYE_GLOW_OPACITY = 0.55;

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

export interface Visibility {
  /** Opacity for the body, head and arms. */
  body: number;
  /** Opacity for the eyes — never below the body's. */
  eyes: number;
}

/**
 * How visible a zombie is right now. Rotations use the same convention as the
 * rest of the game: atan2(dx, dz), zero pointing down +z.
 */
export function zombieVisibility(
  player: { x: number; z: number; rot: number },
  zombie: { x: number; z: number },
  distance: number,
  aggroed: boolean,
  revealedUntil: number,
  now: number
): Visibility {
  if (now < revealedUntil) return { body: 1, eyes: 1 };

  const bearing = Math.atan2(zombie.x - player.x, zombie.z - player.z);
  const offAxis = Math.abs(angleDelta(bearing, player.rot));
  const inCone = 1 - smoothstep(CONE_HALF, CONE_HALF + SOFT_EDGE, offAxis);
  const nearby = 1 - smoothstep(FEEL_RADIUS * 0.6, FEEL_RADIUS, distance);

  const body = Math.max(inCone, nearby);
  const glow =
    aggroed && EYE_GLOW_RANGE > 0
      ? EYE_GLOW_OPACITY * (1 - smoothstep(EYE_GLOW_RANGE * 0.6, EYE_GLOW_RANGE, distance))
      : 0;

  return { body, eyes: Math.max(body, glow) };
}
