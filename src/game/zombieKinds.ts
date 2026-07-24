// Per-kind stats and visuals for zombie variety. Shared between ship
// generation (which rolls a kind + stats per spawn) and the Zombies scene
// component (which reads the same config for combat and rendering).

import { ZombieKind } from "./types";

export interface ZombieKindConfig {
  label: string;
  hp: number;
  speedMin: number;
  speedMax: number;
  damage: number;
  attackCooldownMs: number;
  aggroRange: number;
  attackRange: number;
  scale: number;
  bodyColor: string;
  headColor: string;
  eyeColor: string;
  armSwingSpeed: number;
  // Relative odds of spawning this kind — need not sum to 1.
  weight: number;
}

export const ZOMBIE_KINDS: Record<ZombieKind, ZombieKindConfig> = {
  shambler: {
    label: "Shambler",
    hp: 50,
    speedMin: 1.2,
    speedMax: 2.0,
    damage: 10,
    attackCooldownMs: 1200,
    aggroRange: 9,
    attackRange: 1.1,
    scale: 1.0,
    bodyColor: "#5e7d4a",
    headColor: "#75906a",
    eyeColor: "#ff2222",
    armSwingSpeed: 3,
    weight: 0.6
  },
  runner: {
    label: "Runner",
    hp: 25,
    speedMin: 3.0,
    speedMax: 3.8,
    damage: 8,
    attackCooldownMs: 900,
    aggroRange: 11,
    attackRange: 1.0,
    scale: 0.9,
    bodyColor: "#6b3f3f",
    headColor: "#8a5a5a",
    eyeColor: "#ff8a1a",
    armSwingSpeed: 6.5,
    weight: 0.25
  },
  brute: {
    label: "Brute",
    hp: 120,
    speedMin: 0.8,
    speedMax: 1.1,
    damage: 22,
    attackCooldownMs: 1700,
    aggroRange: 7,
    attackRange: 1.35,
    scale: 1.35,
    bodyColor: "#3d4a3a",
    headColor: "#4d5a4a",
    eyeColor: "#ff2222",
    armSwingSpeed: 1.4,
    weight: 0.15
  }
};

const KIND_ORDER: ZombieKind[] = ["shambler", "runner", "brute"];

export function pickZombieKind(): ZombieKind {
  const totalWeight = KIND_ORDER.reduce((sum, k) => sum + ZOMBIE_KINDS[k].weight, 0);
  let roll = Math.random() * totalWeight;
  for (const kind of KIND_ORDER) {
    roll -= ZOMBIE_KINDS[kind].weight;
    if (roll <= 0) return kind;
  }
  return "shambler";
}
