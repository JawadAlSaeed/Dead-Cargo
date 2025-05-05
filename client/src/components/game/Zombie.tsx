import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";
import { checkCollision } from "../../lib/utils/collision";
import { useRooms } from "../../lib/stores/useRooms";

interface ZombieProps {
  zombieId: string;
  position: { x: number; y: number; z: number };
  health: number;
  speed: number;
}

const Zombie = ({ zombieId, position, health, speed }: ZombieProps) => {
  const zombieRef = useRef<THREE.Mesh>(null);
  const zombieModel = useRef<THREE.Group>(null);
  const player = usePlayer();
  const zombies = useZombies();
  const { walls, roomObjects } = useRooms();
  
  // Initialize zombie
  useEffect(() => {
    console.log(`Zombie ${zombieId} initialized at position:`, position);
  }, [zombieId, position]);
  
  // Zombie AI and movement
  useFrame((state, delta) => {
    if (zombieRef.current && zombieModel.current && health > 0) {
      // Path finding to player
      const directionX = player.position.x - position.x;
      const directionZ = player.position.z - position.z;
      
      // Calculate distance to player
      const distance = Math.sqrt(directionX * directionX + directionZ * directionZ);
      
      // Move towards player if within detection range
      if (distance < 8) {
        // Normalize direction
        const normalizedDirX = directionX / distance;
        const normalizedDirZ = directionZ / distance;
        
        // Calculate movement based on speed and delta time
        const moveSpeed = speed * delta;
        let newX = position.x + normalizedDirX * moveSpeed;
        let newZ = position.z + normalizedDirZ * moveSpeed;
        
        // Check wall collisions
        let canMove = true;
        if (walls) {
          for (const wall of walls) {
            if (checkCollision(
              { x: newX, z: newZ, width: 0.5, height: 0.5 },
              { x: wall.position.x, z: wall.position.z, width: wall.size.width, height: wall.size.height }
            )) {
              canMove = false;
              break;
            }
          }
        }
        
        // Check object collisions
        if (canMove && roomObjects) {
          for (const obj of roomObjects) {
            if (obj.collidable && checkCollision(
              { x: newX, z: newZ, width: 0.5, height: 0.5 },
              { x: obj.position.x, z: obj.position.z, width: obj.size.width, height: obj.size.height }
            )) {
              canMove = false;
              break;
            }
          }
        }
        
        // Update position if no collision
        if (canMove) {
          zombies.updateZombiePosition(zombieId, { x: newX, y: position.y, z: newZ });
          zombieRef.current.position.set(newX, 0.25, newZ);
          
          // Set rotation to face player
          const angle = Math.atan2(normalizedDirX, normalizedDirZ);
          zombieModel.current.rotation.y = angle;
        }
        
        // Update attack cooldown
        if (distance < 1.2) {
          zombies.decrementZombieAttackCooldown(zombieId, delta);
        }
      }
    }
    
    // Handle zombie death
    if (health <= 0 && zombieRef.current) {
      zombieRef.current.visible = false;
    }
  });
  
  // Update actual position in the component
  useEffect(() => {
    if (zombieRef.current) {
      zombieRef.current.position.x = position.x;
      zombieRef.current.position.z = position.z;
    }
  }, [position]);

  return (
    <group ref={zombieModel}>
      {/* ULTRA SIMPLIFIED ZOMBIE - just a large red box */}
      <mesh 
        ref={zombieRef}
        position={[0, 0.5, 0]}
      >
        <boxGeometry args={[1.5, 1, 1.5]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* Health indicator - simple bar */}
      <mesh 
        position={[0, 1.5, 0]}
        scale={[health/100, 0.2, 0.2]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ff5555" />
      </mesh>
    </group>
  );
};

export default Zombie;
