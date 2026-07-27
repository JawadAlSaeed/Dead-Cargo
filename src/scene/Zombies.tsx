// Zombies for the current room. Live positions are kept in world.zombiePos
// (refs, mutated in useFrame) — the store only tracks hp/alive, which changes
// on discrete hits. Combat stats and visuals come from ZOMBIE_KINDS, keyed
// by each spawn's kind.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Room, ZombieSpawn } from "../game/types";
import { world } from "../game/world";
import { moveWithCollision, roomColliders } from "../game/movement";
import { getDistance } from "../game/collision";
import { isUiOpen, useGameStore } from "../state/useGameStore";
import { useAudio } from "../state/useAudio";
import { ZOMBIE_KINDS, ZOMBIE_SIZE } from "../game/zombieKinds";
import { CONTACT_REVEAL_MS, zombieVisibility } from "../game/vision";
import { TRAPS } from "../game/traps";
import {
  INVESTIGATE_DURATION_MS,
  INVESTIGATE_SPEED,
  LOUD_ENOUGH_TO_TURN,
  NOISE_AWARENESS_CEILING,
  SEARCH_DURATION_MS,
  SUSPICIOUS_AT,
  awarenessDecay,
  awarenessGain,
  canSee,
  freshSense,
  noiseAwareness
} from "../game/senses";

// Growls are the only warning you get for anything outside the view cone, so
// they repeat for as long as a zombie is hunting you rather than firing once
// when it first notices. Closer means louder and more often.
const GROWL_VOLUME_FAR = 0.1;
const GROWL_VOLUME_NEAR = 0.42;
const GROWL_GAP_NEAR_MS = 1400;
const GROWL_GAP_FAR_MS = 2900;
/** Sideways offset that pans a growl fully to one ear. */
const GROWL_PAN_RANGE = 7;

/**
 * Fade every material under a group, and skip drawing it once fully hidden.
 *
 * `transparent` is pinned on rather than derived from the opacity: three.js
 * bakes it into the shader program key, so flipping it would recompile the
 * material every time a zombie crossed the edge of the cone.
 */
function applyOpacity(group: THREE.Object3D | null, opacity: number) {
  if (!group) return;
  group.visible = opacity > 0.01;
  if (!group.visible) return;
  group.traverse((obj) => {
    const mat = (obj as THREE.Mesh).material as THREE.Material | undefined;
    if (!mat) return;
    mat.transparent = true;
    mat.opacity = opacity;
  });
}

function Zombie({ spawn, room }: { spawn: ZombieSpawn; room: Room }) {
  const cfg = ZOMBIE_KINDS[spawn.kind];
  const groupRef = useRef<THREE.Group>(null);
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const lastAttackAt = useRef(0);
  const lastHp = useRef(spawn.hp);
  const flashUntil = useRef(0);
  const nextGrowlAt = useRef(0);
  // Contact — either direction — reveals it briefly, so nothing is ever hitting
  // you from a place you cannot see.
  const revealedUntil = useRef(0);

  const alive = useGameStore((s) => s.zombies[spawn.id]?.alive ?? false);
  const colliders = useMemo(() => roomColliders(room), [room]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const store = useGameStore.getState();
    const live = store.zombies[spawn.id];
    if (!live?.alive) return;
    if (store.phase !== "playing") return;

    let pos = world.zombiePos.get(spawn.id);
    if (!pos) {
      pos = { x: spawn.position.x, z: spawn.position.z };
      world.zombiePos.set(spawn.id, pos);
    }

    // Hit flash: detect hp drops without subscribing per frame.
    if (live.hp < lastHp.current) {
      flashUntil.current = performance.now() + 120;
      revealedUntil.current = performance.now() + CONTACT_REVEAL_MS;
      lastHp.current = live.hp;
    }
    if (bodyMat.current) {
      bodyMat.current.emissive.set(performance.now() < flashUntil.current ? "#ffffff" : "#1a0000");
    }

    const { player } = world;
    const dist = getDistance(pos.x, pos.z, player.x, player.z);

    // Walked into a trap? Checked before movement so it goes off on the step
    // that reached it, not the one after.
    const now0 = performance.now();
    for (const trap of store.traps) {
      if (trap.roomId !== room.id || now0 < trap.armedAt) continue;
      if (getDistance(pos.x, pos.z, trap.position.x, trap.position.z) <= TRAPS[trap.kind].triggerRadius) {
        store.springTrap(trap.id, spawn.id);
        break;
      }
    }

    // Caught in a bear trap: it thrashes where it stands, and cannot reach you.
    const held = (useGameStore.getState().zombies[spawn.id]?.heldUntil ?? 0) > now0;

    let sense = world.zombieSense.get(spawn.id);
    if (!sense) {
      sense = freshSense(Math.random() * Math.PI * 2);
      world.zombieSense.set(spawn.id, sense);
    }

    const uiOpen = isUiOpen(store);
    const sight = uiOpen
      ? { visible: false, distance: dist, bearing: 0 }
      : canSee(sense, pos, player, room);

    // --- Hearing: anything new and close enough is worth going to look at ---
    if (!uiOpen) {
      for (const noise of world.noises) {
        if (noise.at <= sense.lastHeardAt || noise.roomId !== room.id) continue;
        if (getDistance(pos.x, pos.z, noise.x, noise.z) > noise.radius) continue;
        sense.investigate = { x: noise.x, z: noise.z };
        // Capped so no amount of noise alone tips into hunting — it has to see
        // you to commit.
        sense.awareness = Math.min(
          NOISE_AWARENESS_CEILING,
          sense.awareness +
            noiseAwareness(noise.radius, getDistance(pos.x, pos.z, noise.x, noise.z))
        );
        // Only something genuinely loud makes it whip round. A door easing open
        // or a footstep gets noted and wandered towards; if it snapped its head
        // to every small sound it would end up staring straight at you, which
        // is the instant-alert problem wearing a disguise.
        if (noise.radius >= LOUD_ENOUGH_TO_TURN) {
          sense.facing = Math.atan2(noise.x - pos.x, noise.z - pos.z);
        }
      }
      sense.lastHeardAt = now0;
    }

    // --- Sight ---
    if (sight.visible) {
      sense.awareness = Math.min(
        1,
        sense.awareness + awarenessGain(sight.distance, world.sneaking, delta)
      );
      sense.investigate = { x: player.x, z: player.z };
      // Turn to look at what it has noticed.
      sense.facing += Math.max(-6 * delta, Math.min(6 * delta,
        ((sight.bearing - sense.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI));
    } else if (!uiOpen) {
      sense.awareness = Math.max(0, sense.awareness - awarenessDecay(delta));
    }

    // --- State transitions ---
    const wasHunting = sense.state === "hunting";
    if (sense.awareness >= 1) {
      // Committed. It has you.
      sense.state = "hunting";
      sense.investigate = { x: player.x, z: player.z };
      sense.searchUntil = 0;
    } else if (sense.state === "hunting") {
      // Lost it. Head for where you were last and cast about there.
      sense.state = "searching";
      sense.searchUntil = now0 + SEARCH_DURATION_MS;
    } else if (sense.state === "dormant" && sense.awareness >= SUSPICIOUS_AT && sense.investigate) {
      // Roused. Commit to going and looking, on a timer rather than on the
      // awareness value — otherwise the decay pulls it back to idle before it
      // has taken more than a step.
      sense.state = "suspicious";
      sense.searchUntil = now0 + INVESTIGATE_DURATION_MS;
    } else if (sense.state === "suspicious" && sense.awareness >= SUSPICIOUS_AT) {
      // Something roused it again while it was already on its way — reset the
      // clock so a trail of noises keeps it interested.
      sense.searchUntil = Math.max(sense.searchUntil, now0 + INVESTIGATE_DURATION_MS);
    } else if (
      (sense.state === "suspicious" || sense.state === "searching") &&
      now0 > sense.searchUntil
    ) {
      sense.state = "dormant";
      sense.investigate = null;
      sense.awareness = 0;
    }

    // --- Growls, now tied to state rather than raw distance ---
    const alerted = sense.state === "hunting" || sense.state === "suspicious";
    if (alerted && !uiOpen) {
      if (now0 >= nextGrowlAt.current) {
        const closeness = 1 - Math.min(1, dist / cfg.aggroRange);
        const volume = GROWL_VOLUME_FAR + (GROWL_VOLUME_NEAR - GROWL_VOLUME_FAR) * closeness;
        const pan = Math.max(-1, Math.min(1, (pos.x - player.x) / GROWL_PAN_RANGE));
        useAudio.getState().playGrowl(volume * (sense.state === "hunting" ? 1 : 0.6), pan);
        const gap = GROWL_GAP_FAR_MS - (GROWL_GAP_FAR_MS - GROWL_GAP_NEAR_MS) * closeness;
        nextGrowlAt.current = now0 + gap * (0.75 + Math.random() * 0.5);
      }
      // The moment it commits, it barks regardless of the timer — that bark is
      // the tell that your window to back out has just closed.
      if (!wasHunting && sense.state === "hunting") {
        useAudio.getState().playGrowl(GROWL_VOLUME_NEAR, Math.max(-1, Math.min(1, (pos.x - player.x) / GROWL_PAN_RANGE)));
        nextGrowlAt.current = now0 + GROWL_GAP_NEAR_MS;
      }
    } else {
      nextGrowlAt.current = 0;
    }

    // --- Movement ---
    const target =
      sense.state === "hunting"
        ? { x: player.x, z: player.z }
        : sense.investigate;
    const speedScale = sense.state === "hunting" ? 1 : INVESTIGATE_SPEED;
    const stopWithin = sense.state === "hunting" ? cfg.attackRange * 0.6 : 0.6;

    if (!held && !uiOpen && target && sense.state !== "dormant") {
      const toTarget = getDistance(pos.x, pos.z, target.x, target.z);
      if (toTarget > stopWithin) {
        let dx = ((target.x - pos.x) / toTarget) * spawn.speed * speedScale * delta;
        let dz = ((target.z - pos.z) / toTarget) * spawn.speed * speedScale * delta;

        // Light separation so zombies don't stack into one another.
        for (const [otherId, other] of world.zombiePos) {
          if (otherId === spawn.id || !store.zombies[otherId]?.alive) continue;
          const d = getDistance(pos.x, pos.z, other.x, other.z);
          if (d > 0.01 && d < 0.9) {
            dx += ((pos.x - other.x) / d) * 0.6 * delta;
            dz += ((pos.z - other.z) / d) * 0.6 * delta;
          }
        }
        moveWithCollision(pos, dx, dz, ZOMBIE_SIZE, colliders);
        // Face where it is going.
        if (Math.abs(dx) + Math.abs(dz) > 1e-5) sense.facing = Math.atan2(dx, dz);
      } else {
        // Reached the spot and found nothing — look around while the clock runs.
        if (now0 >= sense.nextGlanceAt) {
          sense.facing += (Math.random() - 0.5) * 2.2;
          sense.nextGlanceAt = now0 + 700 + Math.random() * 900;
        }
      }
    } else if (sense.state === "dormant" && !uiOpen && !held) {
      // Idle drift, so a dormant zombie is not a statue staring at one wall.
      if (now0 >= sense.nextGlanceAt) {
        sense.facing += (Math.random() - 0.5) * 1.8;
        sense.nextGlanceAt = now0 + 1600 + Math.random() * 2400;
      }
    }

    if (
      !held &&
      sense.state === "hunting" &&
      dist < cfg.attackRange &&
      !uiOpen &&
      performance.now() - lastAttackAt.current > cfg.attackCooldownMs
    ) {
      lastAttackAt.current = performance.now();
      revealedUntil.current = performance.now() + CONTACT_REVEAL_MS;
      world.lastHit = {
        angle: Math.atan2(pos.x - player.x, pos.z - player.z),
        at: performance.now()
      };
      store.damagePlayer(cfg.damage);
    }

    // Visibility last, so it accounts for everything that happened this frame.
    applyOpacity(
      groupRef.current,
      zombieVisibility(player, pos, dist, revealedUntil.current, performance.now())
    );

    const group = groupRef.current;
    if (group) {
      // Held in a bear trap: rocks on the spot instead of standing calmly, so
      // a pinned zombie reads as caught rather than as one that stopped working.
      const thrash = held ? Math.sin(now0 / 45) * 0.09 : 0;
      group.position.set(pos.x + thrash, 0, pos.z);
      // Faces where it is actually looking, not always at the player — the
      // whole sense model depends on you being able to read which way it faces.
      group.rotation.y = sense.facing + thrash * 1.6;
      // Shamble bob
      group.position.y = Math.abs(Math.sin(performance.now() / 180 + spawn.position.x)) * 0.06;
    }
    // Twitchy reaching-arm sway, always active for an unsettled, restless feel.
    const t = performance.now() / 1000;
    const armSwing = Math.sin(t * (held ? cfg.armSwingSpeed * 3 : cfg.armSwingSpeed) + spawn.position.x) * (held ? 0.35 : 0.18);
    if (armLRef.current) armLRef.current.rotation.x = Math.PI / 2.4 + armSwing;
    if (armRRef.current) armRRef.current.rotation.x = Math.PI / 2.4 - armSwing;
  });

  if (!alive) {
    // Corpse: a dark stain where it fell (or at spawn if it never moved).
    const pos = world.zombiePos.get(spawn.id) ?? spawn.position;
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pos.x, 0.015, pos.z]}>
        <circleGeometry args={[0.6 * cfg.scale, 10]} />
        <meshStandardMaterial color="#3a1410" transparent opacity={0.85} />
      </mesh>
    );
  }

  return (
    <group ref={groupRef} position={[spawn.position.x, 0, spawn.position.z]} scale={cfg.scale}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.65, 6, 12]} />
        <meshStandardMaterial ref={bodyMat} color={cfg.bodyColor} emissive="#1a0000" />
      </mesh>
      <mesh position={[0, 1.35, 0.05]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color={cfg.headColor} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 1.4, 0.22]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color={cfg.eyeColor} />
      </mesh>
      <mesh position={[0.08, 1.4, 0.22]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color={cfg.eyeColor} />
      </mesh>
      {/* Reaching arms */}
      <mesh ref={armLRef} position={[-0.28, 0.95, 0.3]} rotation={[Math.PI / 2.4, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.55]} />
        <meshStandardMaterial color={cfg.bodyColor} />
      </mesh>
      <mesh ref={armRRef} position={[0.28, 0.95, 0.3]} rotation={[Math.PI / 2.4, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.55]} />
        <meshStandardMaterial color={cfg.bodyColor} />
      </mesh>
    </group>
  );
}

export function Zombies({ room }: { room: Room }) {
  const ship = useGameStore((s) => s.ship);
  const spawns = useMemo(
    () => ship?.zombies.filter((z) => z.roomId === room.id) ?? [],
    [ship, room.id]
  );
  return (
    <>
      {spawns.map((spawn) => (
        <Zombie key={spawn.id} spawn={spawn} room={room} />
      ))}
    </>
  );
}
