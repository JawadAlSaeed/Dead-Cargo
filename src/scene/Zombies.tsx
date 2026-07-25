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
  const wasAggroed = useRef(false);
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

    const aggroed = dist < cfg.aggroRange;
    if (aggroed && !wasAggroed.current && !isUiOpen(store)) {
      useAudio.getState().playGrowl();
    }
    wasAggroed.current = aggroed;

    if (dist < cfg.aggroRange && dist > cfg.attackRange * 0.6 && !isUiOpen(store)) {
      let dx = ((player.x - pos.x) / dist) * spawn.speed * delta;
      let dz = ((player.z - pos.z) / dist) * spawn.speed * delta;

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
    }

    if (
      dist < cfg.attackRange &&
      !isUiOpen(store) &&
      performance.now() - lastAttackAt.current > cfg.attackCooldownMs
    ) {
      lastAttackAt.current = performance.now();
      revealedUntil.current = performance.now() + CONTACT_REVEAL_MS;
      store.damagePlayer(cfg.damage);
    }

    // Visibility last, so it accounts for everything that happened this frame.
    applyOpacity(
      groupRef.current,
      zombieVisibility(player, pos, dist, revealedUntil.current, performance.now())
    );

    const group = groupRef.current;
    if (group) {
      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = Math.atan2(player.x - pos.x, player.z - pos.z);
      // Shamble bob
      group.position.y = Math.abs(Math.sin(performance.now() / 180 + spawn.position.x)) * 0.06;
    }
    // Twitchy reaching-arm sway, always active for an unsettled, restless feel.
    const t = performance.now() / 1000;
    const armSwing = Math.sin(t * cfg.armSwingSpeed + spawn.position.x) * 0.18;
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
