// Renders the current room: textured floor, walls, door markers, furniture.
// All static per room — nothing here updates per frame.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { Door, Room, RoomObject, Wall as WallData } from "../game/types";
import { useGameStore } from "../state/useGameStore";

const WALL_HEIGHT = 2.4;
const OCEAN_DEPTH = 70;

const OBJECT_HEIGHTS: Record<string, number> = {
  // Sleeping
  bunk: 0.5,
  medBed: 0.5,
  nightstand: 0.6,
  // Storage — the tall ones read as a silhouette even unlit
  wardrobe: 2.0,
  tallLocker: 1.9,
  fridge: 1.9,
  cabinet: 1.5,
  medCabinet: 1.5,
  bookshelf: 1.8,
  shelving: 1.8,
  supplyShelf: 1.7,
  footlocker: 0.5,
  toolbox: 0.45,
  crate: 1.0,
  // Surfaces
  counter: 0.95,
  workbench: 0.95,
  stove: 0.9,
  diningTable: 0.8,
  deskSmall: 0.78,
  desk: 0.9,
  chair: 0.9,
  // Bulk
  engineBlock: 1.6,
  pipes: 2.0,
  barrel: 1.1,
  pallet: 0.22,
  radio: 0.4
};

/** Storage units get a seam down the front so they read as doors, not blocks. */
const DOORED = new Set(["wardrobe", "tallLocker", "fridge", "cabinet", "medCabinet"]);

/**
 * A bed: frame, mattress, pillow at one end. Worth the extra meshes because a
 * bed is the single clearest signal that a room is a room — a bare box the same
 * size reads as another crate.
 */
function BedMesh({ obj, height }: { obj: RoomObject; height: number }) {
  const { width, height: depth } = obj.size;
  const alongZ = depth >= width;
  const sheet = obj.type === "medBed" ? "#e8edf1" : "#8a8478";
  const pillow = obj.type === "medBed" ? "#ffffff" : "#c9c2b2";
  const pad = 0.16;
  const pillowLen = 0.55;
  return (
    <group position={[obj.position.x, 0, obj.position.z]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={obj.color} roughness={0.9} />
      </mesh>
      <mesh position={[0, height + 0.08, 0]}>
        <boxGeometry args={[width - pad, 0.16, depth - pad]} />
        <meshStandardMaterial color={sheet} roughness={0.95} />
      </mesh>
      <mesh
        position={[
          alongZ ? 0 : -(width / 2 - pillowLen / 2 - pad / 2),
          height + 0.2,
          alongZ ? -(depth / 2 - pillowLen / 2 - pad / 2) : 0
        ]}
      >
        <boxGeometry
          args={[
            alongZ ? width - pad * 2.2 : pillowLen,
            0.12,
            alongZ ? pillowLen : depth - pad * 2.2
          ]}
        />
        <meshStandardMaterial color={pillow} roughness={0.9} />
      </mesh>
    </group>
  );
}

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
      <group position={[obj.position.x, WALL_HEIGHT - 0.4, obj.position.z]}>
        <mesh>
          <boxGeometry args={[obj.size.width, 0.2, obj.size.height]} />
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={1.5} />
        </mesh>
        {/* The fixture used to be emissive only, so the corridor it is meant to
            light stayed pitch black. Short range, so it pools under each lamp
            and leaves dark stretches between them. */}
        <pointLight intensity={9} distance={9} decay={2} color={obj.color} />
      </group>
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

  if (obj.type === "bunk" || obj.type === "medBed") {
    return <BedMesh obj={obj} height={height} />;
  }

  const searchGlow = obj.containsItem && !searched;
  const body = (
    <mesh position={[0, height / 2, 0]} castShadow>
      <boxGeometry args={[obj.size.width, height, obj.size.height]} />
      <meshStandardMaterial
        color={searched ? "#2e2b28" : obj.color}
        emissive={searchGlow ? "#8a6a20" : "#000000"}
        emissiveIntensity={searchGlow ? 0.25 : 0}
      />
    </mesh>
  );

  return (
    <group position={[obj.position.x, 0, obj.position.z]}>
      {body}

      {/* Four burners, so a stove is not just a grey box. */}
      {obj.type === "stove" &&
        [-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`${sx}${sz}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[(sx * obj.size.width) / 5, height + 0.01, (sz * obj.size.height) / 5]}
            >
              <circleGeometry args={[Math.min(obj.size.width, obj.size.height) / 6, 10]} />
              <meshStandardMaterial color="#15171a" roughness={0.7} />
            </mesh>
          ))
        )}

      {/* Seam down the front face of storage units, reading as a pair of doors. */}
      {DOORED.has(obj.type) && (
        <mesh position={[0, height / 2, obj.size.height / 2 + 0.01]}>
          <boxGeometry args={[0.05, height * 0.8, 0.02]} />
          <meshStandardMaterial color="#1b1e22" />
        </mesh>
      )}

      {/* Slats, so a pallet reads as a pallet from above. */}
      {obj.type === "pallet" &&
        [-1, 0, 1].map((i) => (
          <mesh key={i} position={[0, height + 0.02, (i * obj.size.height) / 3.2]}>
            <boxGeometry args={[obj.size.width * 0.94, 0.06, obj.size.height / 7]} />
            <meshStandardMaterial color="#5f4b2c" roughness={0.95} />
          </mesh>
        ))}
    </group>
  );
}

/**
 * A solid wall. The camera always looks from +z, so a full-height wall on the
 * near side of the room stands directly between the camera and the player and
 * hides the floor in front of them — worst in the corridors, which are only 7
 * deep. Near-side walls are drawn as a knee-high sill instead, the usual
 * cutaway you get in a fixed top-down view: the boundary still reads, but you
 * can see what you are walking into.
 */
function Wall({ wall }: { wall: WallData }) {
  const runsAlongX = wall.size.width > wall.size.height;
  const isNearSide = runsAlongX && wall.position.z > 0;
  const height = isNearSide ? 0.55 : WALL_HEIGHT;
  return (
    <mesh position={[wall.position.x, height / 2, wall.position.z]} castShadow>
      <boxGeometry args={[wall.size.width, height, wall.size.height]} />
      <meshStandardMaterial color="#3a4048" roughness={0.9} />
    </mesh>
  );
}

/** The hallway's hull wall: tinted glass with a few frame mullions. */
function WindowWall({ wall }: { wall: WallData }) {
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
function OceanBackdrop({ wall }: { wall: WallData }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.14 + Math.sin(performance.now() / 1400) * 0.04;
    }
  });
  // Extend away from the ship, whichever side of the corridor the hull is on.
  const outward = Math.sign(wall.position.z) || -1;
  const outerZ = wall.position.z + (outward * wall.size.height) / 2;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[wall.position.x, -1.1, outerZ + (outward * OCEAN_DEPTH) / 2]}
    >
      <planeGeometry args={[wall.size.width + 30, OCEAN_DEPTH]} />
      {/* Just bright enough to separate from the night sky, and no brighter —
          the lit corridor has to stay the brightest thing on screen or the eye
          goes straight to the window instead of to what is chasing you. */}
      <meshStandardMaterial
        ref={matRef}
        color="#08222c"
        emissive="#0d3646"
        emissiveIntensity={0.14}
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
          <Wall key={`${room.id}-wall-${i}`} wall={wall} />
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
