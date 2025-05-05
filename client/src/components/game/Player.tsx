import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";
import { useAudio } from "../../lib/stores/useAudio";
import { checkCollision, getDistance } from "../../lib/utils/collision";
import { useRooms } from "../../lib/stores/useRooms";
import { useGame } from "../../lib/stores/useGame";

const Player = () => {
  const playerRef = useRef<THREE.Mesh>(null);
  const playerModel = useRef<THREE.Group>(null);
  const { position, health, damage, heal, move, setPosition, setRotation, rotation } = usePlayer();
  const { zombies } = useZombies();
  const { playHit } = useAudio();
  const { currentRoom, walls, doors, roomObjects, captainCabin } = useRooms();
  const { end } = useGame();
  const { camera, gl } = useThree();
  
  // Get keyboard controls
  const [, getKeys] = useKeyboardControls();

  // Mouse position for aiming
  const [mousePos, setMousePos] = useState({ x: 0, z: 0 });
  
  // Setup mouse controls for aiming
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Get mouse position in normalized device coordinates (-1 to +1)
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Create ray from camera
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      
      // Find intersection with the ground plane
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, target);
      
      setMousePos({ x: target.x, z: target.z });
    };
    
    // Add mouse move listener
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera]);
  
  // Initialize player
  useEffect(() => {
    console.log("Player initialized with mouse aiming");
    // Lock pointer for FPS-style mouse control
    const canvas = gl.domElement;
    canvas.onclick = () => {
      canvas.requestPointerLock();
    };
  }, [gl]);
  
  // Player game logic
  useFrame((state, delta) => {
    if (playerRef.current && playerModel.current) {
      const { forward, backward, leftward, rightward, attack } = getKeys();
      
      // Movement speed
      const speed = 3 * delta;
      let moveX = 0;
      let moveZ = 0;
      
      // Calculate movement direction relative to rotation
      if (forward) {
        moveX += Math.sin(rotation) * speed;
        moveZ += Math.cos(rotation) * speed;
      }
      if (backward) {
        moveX -= Math.sin(rotation) * speed;
        moveZ -= Math.cos(rotation) * speed;
      }
      if (leftward) {
        moveX -= Math.cos(rotation) * speed;
        moveZ += Math.sin(rotation) * speed;
      }
      if (rightward) {
        moveX += Math.cos(rotation) * speed;
        moveZ -= Math.sin(rotation) * speed;
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
      }
      
      // Calculate angle to mouse position for aiming
      const dx = mousePos.x - position.x;
      const dz = mousePos.z - position.z;
      const angleToMouse = Math.atan2(dx, dz);
      
      // Set player rotation to face mouse position
      playerModel.current.rotation.y = angleToMouse;
      setRotation(angleToMouse);
      
      // Handle attack input
      if (attack) {
        console.log("Player attacking in direction:", angleToMouse);
        // Check for zombies in attack range and within field of view
        zombies.forEach(zombie => {
          const distance = getDistance(
            position.x, position.z,
            zombie.position.x, zombie.position.z
          );
          
          // Calculate angle to zombie
          const zombieDx = zombie.position.x - position.x;
          const zombieDz = zombie.position.z - position.z;
          const angleToZombie = Math.atan2(zombieDx, zombieDz);
          
          // Calculate angle difference
          let angleDiff = Math.abs(angleToMouse - angleToZombie);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          
          // Check if zombie is in field of view (within 35% of full circle = ~126 degrees)
          const fieldOfViewAngle = Math.PI * 0.7; // 126 degrees in radians
          const inFieldOfView = angleDiff <= fieldOfViewAngle / 2;
          
          if (distance < 1.5 && inFieldOfView) {
            // Hit zombie
            playHit();
            const zombieStore = useZombies.getState();
            zombieStore.damageZombie(zombie.id, 25);
          }
        });
      }
      
      // Check for zombie collisions (taking damage)
      zombies.forEach(zombie => {
        const distance = getDistance(
          position.x, position.z,
          zombie.position.x, zombie.position.z
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
      {/* Player body */}
      <mesh 
        ref={playerRef}
        position={[position.x, 0.25, position.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#3498db" emissive="#3498db" emissiveIntensity={0.2} />
      </mesh>
      
      {/* Player head */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#2980b9" />
      </mesh>
      
      {/* Player weapon/arm */}
      <mesh position={[0.3, 0.25, -0.2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.1]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Field of view indicator */}
      <group position={[0, 0.1, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 32, Math.PI * 0.65, Math.PI * 0.7]} />
          <meshBasicMaterial color="#3498db" side={THREE.DoubleSide} transparent opacity={0.1} />
        </mesh>
      </group>
    </group>
  );
};

export default Player;
