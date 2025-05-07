import { useRef, useEffect, useState } from "react";
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
  
  // State for visual effects
  const [isHit, setIsHit] = useState(false);
  const [lastHealth, setLastHealth] = useState(health);
  const [showBloodSplatter, setShowBloodSplatter] = useState(false);
  const hitEffectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bloodSplatterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize zombie and clean up timeouts on unmount
  useEffect(() => {
    console.log(`Zombie ${zombieId} initialized at position:`, position);
    
    // Clean up function
    return () => {
      if (hitEffectTimeoutRef.current) {
        clearTimeout(hitEffectTimeoutRef.current);
      }
      if (bloodSplatterTimeoutRef.current) {
        clearTimeout(bloodSplatterTimeoutRef.current);
      }
    };
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
  
  // Detect when the zombie takes damage and show hit effect
  useEffect(() => {
    if (health < lastHealth) {
      console.log(`Zombie ${zombieId} took damage. Health: ${health}`);
      
      // Show hit flash effect
      setIsHit(true);
      
      // Clear any existing hit effect timeout
      if (hitEffectTimeoutRef.current) {
        clearTimeout(hitEffectTimeoutRef.current);
      }
      
      // Hide hit effect after a short time
      hitEffectTimeoutRef.current = setTimeout(() => {
        setIsHit(false);
      }, 150); // Flash duration: 150ms
      
      // Show blood splatter effect
      setShowBloodSplatter(true);
      
      // Clear any existing blood splatter timeout
      if (bloodSplatterTimeoutRef.current) {
        clearTimeout(bloodSplatterTimeoutRef.current);
      }
      
      // Hide blood splatter after a longer time
      bloodSplatterTimeoutRef.current = setTimeout(() => {
        setShowBloodSplatter(false);
      }, 300); // Blood splatter duration: 300ms
    }
    
    // Update last health value
    setLastHealth(health);
  }, [health, lastHealth, zombieId]);

  return (
    <group ref={zombieModel}>
      {/* ULTRA SIMPLIFIED ZOMBIE - just a large red box */}
      <mesh 
        ref={zombieRef}
        position={[0, 0.5, 0]}
      >
        <boxGeometry args={[1.5, 1, 1.5]} />
        <meshBasicMaterial color={isHit ? "#ffffff" : "#ff0000"} />
      </mesh>
      
      {/* Health indicator - simple bar */}
      <mesh 
        position={[0, 1.5, 0]}
        scale={[health/100, 0.2, 0.2]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={isHit ? "#ffffff" : "#ff5555"} />
      </mesh>
      
      {/* Blood splatter effect - only shown when hit */}
      {showBloodSplatter && (
        <group>
          {/* Central splatter */}
          <mesh position={[0, 0.7, 0]} rotation={[0, 0, 0]}>
            <sphereGeometry args={[0.8, 8, 8]} />
            <meshBasicMaterial color="#880000" transparent opacity={0.8} />
          </mesh>
          
          {/* Droplets */}
          <mesh position={[0.7, 0.5, 0.3]} scale={[0.3, 0.3, 0.3]}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color="#AA0000" transparent opacity={0.7} />
          </mesh>
          
          <mesh position={[-0.5, 0.6, -0.4]} scale={[0.2, 0.2, 0.2]}>
            <sphereGeometry args={[0.6, 8, 8]} />
            <meshBasicMaterial color="#AA0000" transparent opacity={0.7} />
          </mesh>
          
          <mesh position={[0.3, 0.4, -0.6]} scale={[0.25, 0.25, 0.25]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial color="#AA0000" transparent opacity={0.7} />
          </mesh>
        </group>
      )}
      
      {/* Damage number indicator */}
      {isHit && (
        <group position={[0, 2, 0]}>
          {/* Simple damage indicator using shapes instead of text */}
          <mesh position={[0, 0, 0]} scale={[0.08, 0.3, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffff00" />
          </mesh>
          <mesh position={[0.15, 0, 0]} scale={[0.08, 0.3, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffff00" />
          </mesh>
          <mesh position={[0.3, 0, 0]} scale={[0.08, 0.3, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffff00" />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default Zombie;
