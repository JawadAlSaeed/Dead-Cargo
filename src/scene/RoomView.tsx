// Renders the current room: textured floor, walls, door markers, furniture.
// All static per room — nothing here updates per frame.

import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { Room, RoomObject } from "../game/types";
import { useGameStore } from "../state/useGameStore";
import { world } from "../game/world";

const WALL_HEIGHT = 2.4;

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

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[room.size.width, room.size.height]} />
        <meshStandardMaterial map={configured} color="#7d7d85" />
      </mesh>
      {/* Oversized invisible plane so mouse aim keeps tracking beyond the floor edge */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onPointerMove={(e) => {
          world.aim.x = e.point.x;
          world.aim.z = e.point.z;
        }}
        visible={false}
      >
        <planeGeometry args={[room.size.width + 20, room.size.height + 20]} />
        <meshBasicMaterial />
      </mesh>
    </>
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

export function RoomView({ room }: { room: Room }) {
  const searched = useGameStore((s) => s.searched);
  const unlockedDoors = useGameStore((s) => s.unlockedDoors);

  return (
    <group>
      <Floor room={room} />

      {room.walls.map((wall, i) => (
        <mesh
          key={`${room.id}-wall-${i}`}
          position={[wall.position.x, WALL_HEIGHT / 2, wall.position.z]}
          castShadow
        >
          <boxGeometry args={[wall.size.width, WALL_HEIGHT, wall.size.height]} />
          <meshStandardMaterial color="#3a4048" roughness={0.9} />
        </mesh>
      ))}

      {room.doors.map((door) => {
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
