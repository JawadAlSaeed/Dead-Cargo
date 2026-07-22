// Everything inside the Canvas: lighting, follow camera, the current room,
// the player and its zombies.

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../state/useGameStore";
import { world } from "../game/world";
import { RoomView } from "./RoomView";
import { Player } from "./Player";
import { Zombies } from "./Zombies";

function FollowCamera() {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const { player } = world;
    target.current.set(player.x, 13, player.z + 7.5);
    camera.position.lerp(target.current, Math.min(1, delta * 5));
    camera.lookAt(player.x, 0, player.z);
  });
  return null;
}

export function GameScene() {
  const ship = useGameStore((s) => s.ship);
  const currentRoomId = useGameStore((s) => s.currentRoomId);
  const room = ship?.rooms[currentRoomId];
  if (!room) return null;

  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 18, 40]} />
      <ambientLight intensity={0.25} color="#8090b0" />
      <directionalLight position={[6, 12, 4]} intensity={0.35} color="#aab6cc" />

      <FollowCamera />
      {/* key on room id so per-room state (textures, memos) resets cleanly */}
      <group key={room.id}>
        <RoomView room={room} />
        <Zombies room={room} />
        <Player room={room} />
      </group>
    </>
  );
}
