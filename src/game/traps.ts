// Deployable traps: the third crafting branch, after healing and ammo.
//
// The point of a trap is that it is the opposite trade to a gun. A gun spends
// ammo to deal with a threat you can see, right now. A trap spends grid space
// and a guess about where things will come from, ahead of time — so it rewards
// knowing the ship, which is the knowledge a run accumulates anyway.
//
// The two are deliberately not two flavours of the same thing:
//
//   Pipe Bomb  — heavy damage in a radius, and it will hurt you too. Arms after
//                a delay so it cannot be a panic button dropped at your feet.
//   Bear Trap  — no damage worth speaking of, but it pins one zombie in place.
//                Safe to stand near. It buys time rather than removing a threat.

export type TrapKind = "pipeBomb" | "bearTrap";

export interface TrapConfig {
  label: string;
  /** Distance at which a zombie sets it off. */
  triggerRadius: number;
  /** Damage to zombies, applied within `blastRadius` of the trap. */
  damage: number;
  blastRadius: number;
  /**
   * Damage to the courier if caught in it. The pipe bomb is meant to be worth
   * respecting; the bear trap is a snare set for the undead and ignores you.
   */
  selfDamage: number;
  /** How long a caught zombie is held still. 0 for traps that do not hold. */
  holdMs: number;
  /** Delay before it becomes live, so you have time to back away. */
  armDelayMs: number;
  color: string;
}

export const TRAPS: Record<TrapKind, TrapConfig> = {
  pipeBomb: {
    label: "Pipe Bomb",
    triggerRadius: 1.6,
    // Kills a Shambler or Runner outright and takes most of a Brute, so it is
    // worth the two materials and the grid space it cost to carry.
    damage: 110,
    blastRadius: 3.6,
    selfDamage: 35,
    holdMs: 0,
    armDelayMs: 1500,
    color: "#8a5a20"
  },
  bearTrap: {
    label: "Bear Trap",
    triggerRadius: 0.9,
    damage: 25,
    blastRadius: 0.9,
    selfDamage: 0,
    holdMs: 3200,
    armDelayMs: 400,
    color: "#7d838a"
  }
};

/** Traps you have put down. Live in the store, keyed to the room they are in. */
export interface DeployedTrap {
  id: string;
  kind: TrapKind;
  roomId: string;
  position: { x: number; z: number };
  /** performance.now() at which it goes live. */
  armedAt: number;
}
