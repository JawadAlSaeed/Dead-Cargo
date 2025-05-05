import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";
import { useAudio } from "../../lib/stores/useAudio";
import { checkCollision } from "../../lib/utils/collision";
import { useRooms } from "../../lib/stores/useRooms";
import { useGame } from "../../lib/stores/useGame";

const Player = () => {
  const playerRef = useRef<THREE.Mesh>(null);
  const playerModel = useRef<THREE.Group>(null);
  const { position, health, damage, heal, move, setPosition, setRotation } = usePlayer();
  const { zombies } = useZombies();
  const { playHit } = useAudio();
  const { currentRoom, walls, doors, roomObjects, captainCabin } = useRooms();
  const { end } = useGame();
  
  // Get keyboard controls
  const [, getKeys] = useKeyboardControls();
  
  // Initialize player
  useEffect(() => {
    console.log("Player initialized");
  }, []);
  
  // Player game logic
  useFrame((state, delta) => {
    if (playerRef.current && playerModel.current) {
      const { forward, backward, leftward, rightward, attack } = getKeys();
      
      // Movement speed
      const speed = 3 * delta;
      let moveX = 0;
      let moveZ = 0;
      
      // Calculate movement direction
      if (forward) moveZ -= speed;
      if (backward) moveZ += speed;
      if (leftward) moveX -= speed;
      if (rightward) moveX += speed;
      
      // Normalize diagonal movement
      if (moveX !== 0 && moveZ !== 0) {
        moveX /= Math.sqrt(2);
        moveZ /= Math.sqrt(2);
      }
      
      // Calculate new position
      let newX = position.x + moveX;
      let newZ = position.z + moveZ;

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
      
      // Check door collisions and transitions
      if (doors) {
        for (const door of doors) {
          if (checkCollision(
            { x: newX, z: newZ, width: 0.5, height: 0.5 },
            { x: door.position.x, z: door.position.z, width: door.size.width, height: door.size.height }
          )) {
            if (door.locked) {
              canMove = false;
            } else {
              // Transition to next room
              setPosition({ 
                x: door.targetPosition.x, 
                y: position.y, 
                z: door.targetPosition.z 
              });
              return;
            }
            break;
          }
        }
      }
      
      // Check if reached captain cabin
      if (captainCabin && checkCollision(
        { x: newX, z: newZ, width: 0.5, height: 0.5 },
        { x: captainCabin.position.x, z: captainCabin.position.z, width: captainCabin.size.width, height: captainCabin.size.height }
      )) {
        console.log("Reached captain cabin! You win!");
        end();
        return;
      }
      
      // Apply movement if no collision
      if (canMove) {
        move({ x: newX, y: position.y, z: newZ });
        
        // Set player position in the 3D scene
        playerRef.current.position.set(newX, 0.25, newZ);
        
        // Set rotation based on movement direction
        if (moveX !== 0 || moveZ !== 0) {
          const angle = Math.atan2(moveX, moveZ);
          playerModel.current.rotation.y = angle;
          setRotation(angle);
        }
      }
      
      // Handle attack input
      if (attack) {
        console.log("Player attacking");
        // Check for zombies in attack range
        zombies.forEach(zombie => {
          const distance = Math.sqrt(
            Math.pow(position.x - zombie.position.x, 2) + 
            Math.pow(position.z - zombie.position.z, 2)
          );
          
          if (distance < 1.5) {
            // Hit zombie
            playHit();
            const zombieStore = useZombies.getState();
            zombieStore.damageZombie(zombie.id, 25);
          }
        });
      }
      
      // Check for zombie collisions (taking damage)
      zombies.forEach(zombie => {
        const distance = Math.sqrt(
          Math.pow(position.x - zombie.position.x, 2) + 
          Math.pow(position.z - zombie.position.z, 2)
        );
        
        if (distance < 0.8 && zombie.attackCooldown <= 0) {
          // Take damage from zombie
          damage(10);
          playHit();
          const zombieStore = useZombies.getState();
          zombieStore.resetZombieAttackCooldown(zombie.id);
          
          // Check if player is dead
          if (health - 10 <= 0) {
            console.log("Player died");
            end();
          }
        }
      });
    }
  });
  
  return (
    <group ref={playerModel}>
      <mesh 
        ref={playerRef}
        position={[position.x, 0.25, position.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>
    </group>
  );
};

export default Player;
