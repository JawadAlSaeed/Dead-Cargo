import { useEffect, useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import Player from "./Player";
import Zombie from "./Zombie";
import Room from "./Room";
import { PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";
import { useRooms } from "../../lib/stores/useRooms";
import ProcGenRooms from "./ProcGenRooms";
import * as THREE from "three";

const CruiseShip = () => {
  const { position, rotation } = usePlayer();
  const { zombies } = useZombies();
  const { currentRoom, generateShip, rooms } = useRooms();
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  
  // Track which zombies are visible (in field of view)
  const [visibleZombies, setVisibleZombies] = useState<string[]>([]);
  
  // Initialize the cruise ship on component mount
  useEffect(() => {
    console.log("Initializing cruise ship...");
    generateShip();
  }, [generateShip]);
  
  // Update camera position to follow player
  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.position.x = position.x;
      cameraRef.current.position.z = position.z;
      
      // Calculate which zombies are in the player's field of view
      const zombiesInRoom = zombies.filter(zombie => zombie.roomId === currentRoom);
      const visible = zombiesInRoom.filter(zombie => {
        // Calculate angle to zombie
        const dx = zombie.position.x - position.x;
        const dz = zombie.position.z - position.z;
        const angleToZombie = Math.atan2(dx, dz);
        
        // Calculate difference between player's facing angle and zombie angle
        let angleDiff = Math.abs(rotation - angleToZombie);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        // Field of view is 35% of a full circle (126 degrees)
        const fieldOfViewAngle = Math.PI * 0.7; // 126 degrees in radians
        return angleDiff <= fieldOfViewAngle / 2;
      }).map(zombie => zombie.id);
      
      setVisibleZombies(visible);
    }
  });
  
  // Current room data
  const currentRoomData = currentRoom && rooms[currentRoom] 
    ? rooms[currentRoom] 
    : null;
  
  return (
    <>
      {/* Top-down orthographic camera that follows the player */}
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        position={[position.x, 10, position.z]}
        zoom={40}
        near={1}
        far={100}
      />
      
      {/* Procedurally generate rooms */}
      <ProcGenRooms />
      
      {/* Current Room */}
      <Room 
        roomId={currentRoom} 
        roomType={currentRoomData?.type || "standard"} 
        isActive={true} 
      />
      
      {/* Player */}
      <Player />
      
      {/* Zombies in current room - only render visible ones */}
      {zombies
        .filter(zombie => 
          zombie.roomId === currentRoom && 
          (visibleZombies.includes(zombie.id) || zombie.attackCooldown > 0)
        )
        .map(zombie => (
          <Zombie 
            key={zombie.id} 
            zombieId={zombie.id} 
            position={zombie.position} 
            health={zombie.health}
            speed={zombie.speed}
          />
        ))
      }
    </>
  );
};

export default CruiseShip;
