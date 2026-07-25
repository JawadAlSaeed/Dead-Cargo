// Renders the current room: textured floor, walls, door markers, furniture.
// All static per room — nothing here updates per frame.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Door, Room, RoomObject, Wall } from "../game/types";
import { useGameStore } from "../state/useGameStore";

const WALL_HEIGHT = 2.4;
const OCEAN_DEPTH = 70;

const OBJECT_HEIGHTS: Record<string, number> = {
  crate: 1.0,
  cabinet: 1.6,
  locker: 1.8,
  footlocker: 0.7,
  table: 0.85,
  desk: 0.9,
  chair: 0.9,
  barrel: 1.1,
  shelf: 1.7,
  radio: 0.4
};

function Floor({ room }: { room: Room }) {
  const textureUrl = room.type === "hallway" ? "/textures/asphalt.png" : "/textures/wood.jpg";
  const texture = useTexture(textureUrl);
  const configured = useMemo(() => {
    const t = texture.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(room.size.width / 4, room.size.height / 4);
    t.needsUpdate = true;
    return t;
  }, [texture, room.id]);

  // Aim tracking is handled by a raycast in Player.tsx, so the floor needs no
  // pointer-event catcher mesh.
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[room.size.width, room.size.height]} />
      <meshStandardMaterial map={configured} color="#7d7d85" />
    </mesh>
  );
}

function ObjectMesh({ obj, searched }: { obj: RoomObject; searched: boolean }) {
  const height = OBJECT_HEIGHTS[obj.type] ?? 1;

  if (obj.type === "light") {
    return (
      <mesh position={[obj.position.x, WALL_HEIGHT - 0.4, obj.position.z]}>
        <boxGeometry args={[obj.size.width, 0.2, obj.size.height]} />
        <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={1.5} />
      </mesh>
    );
  }

  if (obj.type === "bloodstain") {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[obj.position.x, 0.01, obj.position.z]}>
        <circleGeometry args={[obj.size.width / 2, 12]} />
        <meshStandardMaterial color={obj.color} transparent opacity={0.75} />
      </mesh>
    );
  }

  if (obj.type === "radio") {
    return (
      <group position={[obj.position.x, 0.95, obj.position.z]}>
        <mesh>
          <boxGeometry args={[obj.size.width, 0.35, obj.size.height]} />
          <meshStandardMaterial color={obj.color} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0.3, 0.12, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#2eff6a" emissive="#2eff6a" emissiveIntensity={2} />
        </mesh>
      </group>
    );
  }

  const searchGlow = obj.containsItem && !searched;
  return (
    <mesh position={[obj.position.x, height / 2, obj.position.z]} castShadow>
      <boxGeometry args={[obj.size.width, height, obj.size.height]} />
      <meshStandardMaterial
        color={searched ? "#2e2b28" : obj.color}
        emissive={searchGlow ? "#8a6a20" : "#000000"}
        emissiveIntensity={searchGlow ? 0.25 : 0}
      />
    </mesh>
  );
}

/** The hallway's hull wall: tinted glass with a few frame mullions. */
function WindowWall({ wall }: { wall: Wall }) {
  const mullionCount = Math.max(1, Math.floor(wall.size.width / 5));
  return (
    <group position={[wall.position.x, WALL_HEIGHT / 2, wall.position.z]}>
      <mesh>
        <boxGeometry args={[wall.size.width, WALL_HEIGHT, wall.size.height]} />
        <meshStandardMaterial
          color="#284a56"
          transparent
          opacity={0.32}
          roughness={0.15}
          metalness={0.3}
        />
      </mesh>
      {/* Frame: one waist-high rail plus evenly spaced mullions */}
      <mesh position={[0, WALL_HEIGHT * 0.1, 0]}>
        <boxGeometry args={[wall.size.width, 0.12, wall.size.height + 0.02]} />
        <meshStandardMaterial color="#1c2226" roughness={0.8} />
      </mesh>
      {Array.from({ length: mullionCount + 1 }, (_, i) => {
        const x = -wall.size.width / 2 + (i * wall.size.width) / mullionCount;
        return (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[0.1, WALL_HEIGHT, wall.size.height + 0.02]} />
            <meshStandardMaterial color="#1c2226" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Dark water visible through the hallway's windows, fading into the fog. */
function OceanBackdrop({ wall }: { wall: Wall }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.07 + Math.sin(performance.now() / 1400) * 0.03;
    }
  });
  const outerZ = wall.position.z + wall.size.height / 2;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[wall.position.x, -1.1, outerZ + OCEAN_DEPTH / 2]}
    >
      <planeGeometry args={[wall.size.width + 30, OCEAN_DEPTH]} />
      <meshStandardMaterial
        ref={matRef}
        color="#0b2e3a"
        emissive="#0b2e3a"
        emissiveIntensity={0.07}
        roughness={0.25}
        metalness={0.4}
      />
    </mesh>
  );
}

/** Stairwell connector: a short flight of steps descending through the gap. */
function StairsDoor({ door }: { door: Door }) {
  const stepCount = 6;
  const stepDepth = 0.55;
  const stepRise = 0.32;
  return (
    <group position={[door.position.x, 0, door.position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[door.size.width, 1.4]} />
        <meshStandardMaterial
          color="#8a6a2a"
          emissive="#8a6a2a"
          emissiveIntensity={0.4}
          transparent
          opacity={0.55}
        />
      </mesh>
      {Array.from({ length: stepCount }, (_, i) => {
        const z = 1.0 + i * stepDepth;
        const y = -0.1 - i * stepRise;
        return (
          <mesh key={i} position={[0, y, z]} castShadow>
            <boxGeometry args={[door.size.width - 0.4, 0.18, stepDepth]} />
            <meshStandardMaterial color="#4a4238" roughness={0.85} />
          </mesh>
        );
      })}
      <mesh position={[0, 1.4, 3.2]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#8a6a2a" emissive="#8a6a2a" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

export function RoomView({ room }: { room: Room }) {
  const searched = useGameStore((s) => s.searched);
  const unlockedDoors = useGameStore((s) => s.unlockedDoors);

  return (
    <group>
      <Floor room={room} />

      {room.walls.map((wall, i) =>
        wall.isWindow ? (
          <group key={`${room.id}-wall-${i}`}>
            <OceanBackdrop wall={wall} />
            <WindowWall wall={wall} />
          </group>
        ) : (
          <mesh
            key={`${room.id}-wall-${i}`}
            position={[wall.position.x, WALL_HEIGHT / 2, wall.position.z]}
            castShadow
          >
            <boxGeometry args={[wall.size.width, WALL_HEIGHT, wall.size.height]} />
            <meshStandardMaterial color="#3a4048" roughness={0.9} />
          </mesh>
        )
      )}

      {room.doors.map((door) => {
        if (door.kind === "stairs") {
          return <StairsDoor key={door.id} door={door} />;
        }
        const isLocked = door.locked && !unlockedDoors[door.id];
        return (
          <group key={door.id}>
            {/* Floor marker showing the doorway */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[door.position.x, 0.02, door.position.z]}
            >
              <planeGeometry args={[door.size.width, 1.4]} />
              <meshStandardMaterial
                color={isLocked ? "#7a1f1f" : "#1f7a3a"}
                emissive={isLocked ? "#7a1f1f" : "#1f7a3a"}
                emissiveIntensity={0.5}
                transparent
                opacity={0.55}
              />
            </mesh>
            {/* Locked doors get a visible solid slab in the wall gap */}
            {isLocked && (
              <mesh position={[door.position.x, WALL_HEIGHT / 2, door.position.z]}>
                <boxGeometry args={[door.size.width, WALL_HEIGHT, 0.6]} />
                <meshStandardMaterial color="#552222" roughness={0.7} />
              </mesh>
            )}
          </group>
        );
      })}

      {room.objects.map((obj) => (
        <ObjectMesh key={obj.id} obj={obj} searched={!!searched[obj.id]} />
      ))}
    </group>
  );
}
