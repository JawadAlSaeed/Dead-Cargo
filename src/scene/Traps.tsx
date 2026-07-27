// Traps you have put down in the current room.
//
// Always visible, unlike zombies: you placed these, so hiding them behind the
// view cone would only punish you for using them. The pipe bomb's light is the
// tell for whether it is live yet — it blinks slowly while arming and settles
// to a steady red once it will go off.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../state/useGameStore";
import { TRAPS } from "../game/traps";
import type { DeployedTrap } from "../game/traps";

function PipeBomb({ trap }: { trap: DeployedTrap }) {
  const lightRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.MeshBasicMaterial>(null);
  const blast = TRAPS.pipeBomb.blastRadius;

  useFrame(() => {
    const now = performance.now();
    const arming = now < trap.armedAt;
    if (lightRef.current) {
      // Blinking while it arms, steady once it is live.
      const on = arming ? Math.sin(now / 90) > 0 : true;
      lightRef.current.color.set(on ? (arming ? "#ffb020" : "#ff2a2a") : "#3a1a05");
    }
    if (ringRef.current) {
      ringRef.current.opacity = arming ? 0.1 : 0.2 + Math.sin(now / 420) * 0.05;
    }
  });

  return (
    <group position={[trap.position.x, 0, trap.position.z]}>
      {/*
        The blast radius, drawn on the floor. The bomb does not care whose side
        you are on, so where it will catch you has to be something you can see
        rather than something you learn by dying to it.
      */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[blast - 0.12, blast, 40]} />
        <meshBasicMaterial ref={ringRef} color="#ff3a2a" transparent opacity={0.2} />
      </mesh>
      {/* The pipe, lying on its side */}
      <mesh position={[0, 0.11, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.62, 10]} />
        <meshStandardMaterial color="#6a6f75" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* End caps */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.11, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.06, 10]} />
          <meshStandardMaterial color="#4a4f55" roughness={0.7} metalness={0.5} />
        </mesh>
      ))}
      {/* Taped-on detonator light */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshBasicMaterial ref={lightRef} color="#ffb020" />
      </mesh>
    </group>
  );
}

function BearTrap({ trap }: { trap: DeployedTrap }) {
  return (
    <group position={[trap.position.x, 0, trap.position.z]}>
      {/* Base plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 14]} />
        <meshStandardMaterial color="#4a4f55" roughness={0.6} metalness={0.6} />
      </mesh>
      {/* Open jaws — two arcs facing each other */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.12, side * 0.3]} rotation={[side * 0.5, 0, 0]}>
          <boxGeometry args={[0.7, 0.22, 0.06]} />
          <meshStandardMaterial color="#8b9198" roughness={0.4} metalness={0.75} />
        </mesh>
      ))}
      {/* Pressure plate in the middle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[0.16, 10]} />
        <meshStandardMaterial color="#2b2f34" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Traps({ roomId }: { roomId: string }) {
  const traps = useGameStore((s) => s.traps);
  const here = traps.filter((t) => t.roomId === roomId);
  return (
    <>
      {here.map((trap) =>
        TRAPS[trap.kind].holdMs > 0 ? (
          <BearTrap key={trap.id} trap={trap} />
        ) : (
          <PipeBomb key={trap.id} trap={trap} />
        )
      )}
    </>
  );
}
