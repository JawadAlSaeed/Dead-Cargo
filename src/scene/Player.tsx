// Player: movement, aiming, attacking, door transitions and interaction.
// Position and rotation live in refs / world state — the store is only touched
// on discrete events (shots, damage, room changes), never per frame.
//
// Aiming is always active: the player faces the cursor, and the aim point is
// recomputed each frame by raycasting the cursor onto the floor plane.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { world, triggerShake, emitNoise } from "../game/world";
import { NOISE } from "../game/senses";
import { moveWithCollision, roomColliders } from "../game/movement";
import { getDistance, isPointInRect } from "../game/collision";
import { Room } from "../game/types";
import { CONE_LIGHT_ANGLE } from "../game/vision";
import { isUiOpen, useGameStore } from "../state/useGameStore";
import { useInventory } from "../state/useInventory";
import { useAudio } from "../state/useAudio";

const PLAYER_SPEED = 4.5;
const PLAYER_SIZE = 0.7;
const SHOT_RANGE = 14;
const SHOT_COOLDOWN_MS = 300;
const MELEE_RANGE = 2.0;
const MELEE_COOLDOWN_MS = 420;
const INTERACT_RANGE = 1.8;
const MUZZLE_FLASH_MS = 60;
const SWING_DURATION_MS = 160;
const FOOTSTEP_INTERVAL_MS = 340;
/** Sneaking trades speed for silence. Slow enough to feel like a decision. */
const SNEAK_SPEED_SCALE = 0.45;

// Reused across frames so aiming allocates nothing per frame.
const aimRaycaster = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimNdc = new THREE.Vector2();
const aimHit = new THREE.Vector3();

function currentWeapon() {
  const { equippedItemId } = useGameStore.getState();
  return useInventory.getState().items.find((i) => i.id === equippedItemId);
}

function tryAttack(roomId: string) {
  const store = useGameStore.getState();
  if (!store.equippedItemId) {
    store.setMessage("No weapon equipped — open inventory (Tab).");
    return;
  }
  const weapon = currentWeapon();
  const isMelee = !!weapon?.properties.melee;
  const cooldown = isMelee ? MELEE_COOLDOWN_MS : SHOT_COOLDOWN_MS;
  const now = performance.now();
  if (now - world.lastShotAt < cooldown) return;
  world.lastShotAt = now;

  const big = (weapon?.properties.damage ?? 0) >= 50;
  if (isMelee) {
    useAudio.getState().playMeleeSwing();
    triggerShake(0.06, 80);
    // Near enough to silent — the reason to carry a knife at all.
    emitNoise(world.player.x, world.player.z, NOISE.melee, roomId);
  } else {
    if (!store.fireShot()) {
      useAudio.getState().playDryFire();
      return;
    }
    useAudio.getState().playGunshot(big);
    triggerShake(big ? 0.16 : 0.08, big ? 140 : 90);
    // A gunshot pulls the whole room, and then some, toward where you fired it.
    emitNoise(world.player.x, world.player.z, big ? NOISE.shotgun : NOISE.pistol, roomId);
  }

  // Hitscan (or a short-range swing): nearest living zombie close to the aim ray.
  const range = isMelee ? MELEE_RANGE : SHOT_RANGE;
  const perpThreshold = isMelee ? 1.1 : 0.75;
  const { player, aim, zombiePos } = world;
  const dirX = aim.x - player.x;
  const dirZ = aim.z - player.z;
  const len = Math.hypot(dirX, dirZ) || 1;
  const nx = dirX / len;
  const nz = dirZ / len;

  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const [id, pos] of zombiePos) {
    if (!store.zombies[id]?.alive) continue;
    const relX = pos.x - player.x;
    const relZ = pos.z - player.z;
    const along = relX * nx + relZ * nz; // distance along the aim ray
    if (along < 0 || along > range) continue;
    const perp = Math.abs(relX * nz - relZ * nx); // distance off the ray
    if (perp > perpThreshold) continue;
    if (along < bestDist) {
      bestDist = along;
      bestId = id;
    }
  }
  if (bestId) {
    store.hitZombie(bestId, weapon?.properties.damage ?? 0);
    world.lastHitConfirmedAt = now;
    triggerShake(isMelee ? 0.1 : big ? 0.22 : 0.12, 130);
  }
}

function tryInteract(room: Room) {
  const store = useGameStore.getState();
  const { player } = world;

  let nearest: { id: string; type: string; dist: number } | null = null;
  for (const obj of room.objects) {
    if (!obj.interactable) continue;
    const d = getDistance(player.x, player.z, obj.position.x, obj.position.z);
    if (d <= INTERACT_RANGE + Math.max(obj.size.width, obj.size.height) / 2) {
      if (!nearest || d < nearest.dist) nearest = { id: obj.id, type: obj.type, dist: d };
    }
  }
  if (!nearest) return;
  if (nearest.type === "radio") {
    store.interactRadio();
  } else {
    store.openContainer(room.id, nearest.id);
  }
}

export function Player({ room }: { room: Room }) {
  const groupRef = useRef<THREE.Group>(null);
  const muzzleRef = useRef<THREE.Mesh>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const coneRef = useRef<THREE.SpotLight>(null);
  const coneTargetRef = useRef<THREE.Object3D>(null);
  const lockedMsgAt = useRef(0);
  const lastFootstepAt = useRef(0);
  const strideRef = useRef(0);

  const baseColliders = useMemo(() => roomColliders(room), [room]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      world.keys[e.code] = true;
      const store = useGameStore.getState();
      if (store.phase !== "playing") return;
      if (e.code === "KeyF") {
        if (store.lootTarget) store.closeLoot();
        else if (!store.inventoryOpen) tryInteract(room);
      }
      if (e.code === "KeyR" && !isUiOpen(store)) store.reload();
    };
    const up = (e: KeyboardEvent) => {
      world.keys[e.code] = false;
    };
    const mouseMove = (e: MouseEvent) => {
      world.mouseScreen.x = e.clientX;
      world.mouseScreen.y = e.clientY;
    };
    const mouseDown = (e: MouseEvent) => {
      const store = useGameStore.getState();
      if (store.phase !== "playing" || isUiOpen(store)) return;
      if (e.button === 0) tryAttack(room.id);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mousedown", mouseDown);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mousedown", mouseDown);
    };
  }, [room]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const store = useGameStore.getState();
    if (store.phase !== "playing" || isUiOpen(store)) return;

    const { player, keys, aim } = world;

    // Aim point: unproject the cursor onto the floor plane. Done by raycast
    // rather than a pointer-event catcher mesh so it stays correct even when
    // the cursor is off the room's floor.
    aimNdc.set(
      (world.mouseScreen.x / state.size.width) * 2 - 1,
      -(world.mouseScreen.y / state.size.height) * 2 + 1
    );
    aimRaycaster.setFromCamera(aimNdc, state.camera);
    if (aimRaycaster.ray.intersectPlane(floorPlane, aimHit)) {
      aim.x = aimHit.x;
      aim.z = aimHit.z;
    }

    // Locked doors are solid until the player carries the right key.
    const hasKeyFor = (keyId?: string) =>
      useInventory.getState().items.some((i) => i.type === "key" && i.properties.keyId === keyId);
    const colliders = [...baseColliders];
    for (const door of room.doors) {
      if (door.locked && !store.unlockedDoors[door.id] && !hasKeyFor(door.keyId)) {
        colliders.push({
          x: door.position.x,
          z: door.position.z,
          width: door.size.width,
          height: 1.6
        });
      }
    }

    let dx = 0;
    let dz = 0;
    if (keys["KeyW"] || keys["ArrowUp"]) dz -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) dz += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) dx -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) dx += 1;
    const isMoving = dx !== 0 || dz !== 0;
    world.moving = isMoving;
    const sneaking = !!(keys["ShiftLeft"] || keys["ShiftRight"]);
    world.sneaking = sneaking;
    if (isMoving) {
      const len = Math.hypot(dx, dz);
      const speed = PLAYER_SPEED * (sneaking ? SNEAK_SPEED_SCALE : 1);
      dx = (dx / len) * speed * delta;
      dz = (dz / len) * speed * delta;
      moveWithCollision(player, dx, dz, PLAYER_SIZE, colliders);

      strideRef.current += delta * (sneaking ? 4.5 : 9);
      const now = performance.now();
      const interval = sneaking ? FOOTSTEP_INTERVAL_MS * 1.9 : FOOTSTEP_INTERVAL_MS;
      if (now - lastFootstepAt.current > interval) {
        lastFootstepAt.current = now;
        useAudio.getState().playFootstep(sneaking);
        // Sneaking emits no noise event at all. That is the entire mechanic:
        // walking pulls zombies toward where you are, creeping does not.
        if (!sneaking) emitNoise(player.x, player.z, NOISE.footstep, room.id);
      }
    }

    // Facing: always toward the cursor. Below a small deadzone the direction is
    // degenerate (cursor sitting on the player), so hold the previous facing.
    const aimDx = aim.x - player.x;
    const aimDz = aim.z - player.z;
    if (Math.hypot(aimDx, aimDz) > 0.35) {
      player.rot = Math.atan2(aimDx, aimDz);
    }

    // Door transitions (and locked-door feedback).
    for (const door of room.doors) {
      if (isPointInRect(player.x, player.z, door.position.x, door.position.z, door.size.width, 2.0)) {
        if (door.locked && !store.unlockedDoors[door.id] && !hasKeyFor(door.keyId)) {
          if (performance.now() - lockedMsgAt.current > 2000) {
            lockedMsgAt.current = performance.now();
            store.setMessage("Locked. It needs the Captain's Key.");
          }
        } else {
          store.enterRoom(door);
          return;
        }
      }
    }

    // Apply to meshes.
    const group = groupRef.current;
    if (group) {
      group.position.set(player.x, 0, player.z);
      group.rotation.y = player.rot;
    }
    // A spotlight aims at its target object, which three.js does not parent for
    // us. Both live inside the player group, so pointing one at the other makes
    // the cone follow the courier's facing for free.
    if (coneRef.current && coneTargetRef.current && coneRef.current.target !== coneTargetRef.current) {
      coneRef.current.target = coneTargetRef.current;
    }
    const equipped = currentWeapon();
    const meleeEquipped = !!equipped?.properties.melee;
    const sinceAttack = performance.now() - world.lastShotAt;
    if (muzzleRef.current) {
      muzzleRef.current.visible = !meleeEquipped && sinceAttack < MUZZLE_FLASH_MS;
    }
    if (weaponRef.current) {
      const swinging = meleeEquipped && sinceAttack < SWING_DURATION_MS;
      weaponRef.current.rotation.y = swinging ? Math.sin((sinceAttack / SWING_DURATION_MS) * Math.PI) * -1.3 : 0;
    }
    if (!isMoving) strideRef.current = THREE.MathUtils.lerp(strideRef.current, 0, delta * 8);
    const swing = Math.sin(strideRef.current) * 0.5;
    if (legLRef.current) legLRef.current.rotation.x = swing;
    if (legRRef.current) legRRef.current.rotation.x = -swing;
  });

  return (
    <group ref={groupRef}>
      {/* Legs, pivoted at the hip so they swing while walking */}
      <group ref={legLRef} position={[-0.13, 0.4, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.15, 0.4, 0.15]} />
          <meshStandardMaterial color="#2b3550" />
        </mesh>
      </group>
      <group ref={legRRef} position={[0.13, 0.4, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.15, 0.4, 0.15]} />
          <meshStandardMaterial color="#2b3550" />
        </mesh>
      </group>
      {/* Body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.75, 6, 12]} />
        <meshStandardMaterial color="#3d6ea5" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#d9b38c" />
      </mesh>
      {/* Weapon group, pointing forward (+z); pivots at the grip for the melee swing */}
      <group ref={weaponRef} position={[0.22, 0.95, 0]}>
        <mesh position={[0, 0, 0.35]}>
          <boxGeometry args={[0.12, 0.12, 0.5]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* Muzzle flash, shown for a couple frames on each ranged shot */}
        <mesh ref={muzzleRef} position={[0, 0, 0.66]} visible={false}>
          <coneGeometry args={[0.14, 0.28, 6]} />
          <meshBasicMaterial color="#ffdc7a" />
        </mesh>
      </group>
      {/* Personal light — the ship is dark. Kept well above head height: at
          2.2 it sat less than a unit over the head sphere and blew it out to
          pure white, so the courier read as a lightbulb rather than a person.
          Dimmer than it would otherwise be, so the view cone reads against it. */}
      <pointLight position={[0, 3.6, 0]} intensity={24} distance={12} color="#ffe8c0" />
      {/* The view cone, cast forward along the courier's facing. Without it the
          rule that zombies are only visible ahead of you would be invisible
          itself, and a rule you cannot see reads as a glitch. */}
      <spotLight
        ref={coneRef}
        position={[0, 2.4, 0]}
        angle={CONE_LIGHT_ANGLE}
        penumbra={0.55}
        intensity={34}
        distance={17}
        decay={1.4}
        color="#ffeccd"
      />
      <object3D ref={coneTargetRef} position={[0, -0.6, 7]} />
    </group>
  );
}
