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

  // Mouse position for aiming and shooting
  const [mousePos, setMousePos] = useState({ x: 0, z: 0 });
  const [isAiming, setIsAiming] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  
  // Setup mouse controls for aiming and shooting
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
    
    // Handle mouse down for aiming (right click) and shooting (left click)
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 2) { // Right click
        event.preventDefault();
        setIsAiming(true);
        console.log("Right mouse down - Aiming");
      } else if (event.button === 0) { // Left click
        setIsShooting(true);
        console.log("Left mouse down - Shooting");
      }
    };
    
    // Handle mouse up to stop aiming or shooting
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 2) { // Right click
        setIsAiming(false);
        console.log("Right mouse up - Stopped aiming");
      } else if (event.button === 0) { // Left click
        setIsShooting(false);
        console.log("Left mouse up - Stopped shooting");
      }
    };
    
    // Handle context menu to prevent it from appearing on right-click
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    
    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
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
  
  // Update actual model position whenever player position changes
  useEffect(() => {
    if (playerModel.current) {
      playerModel.current.position.x = position.x;
      playerModel.current.position.z = position.z;
    }
  }, [position]);
  
  // Player game logic
  useFrame((state, delta) => {
    if (playerRef.current && playerModel.current) {
      const { forward, backward, leftward, rightward, attack } = getKeys();
      
      // Movement speed
      const speed = 3 * delta;
      let moveX = 0;
      let moveZ = 0;
      
      // WASD moves player independently of facing direction
      // Forward is always forward in world space, not relative to player rotation
      if (forward) {
        moveZ -= speed; // Forward is -Z in world space
      }
      if (backward) {
        moveZ += speed; // Backward is +Z in world space
      }
      if (leftward) {
        moveX -= speed; // Left is -X in world space
      }
      if (rightward) {
        moveX += speed; // Right is +X in world space
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
        
        // We'll let the useEffect handle position updates
        // playerRef.current.position is updated in useEffect
      }
      
      // Calculate angle to mouse position for aiming
      const dx = mousePos.x - position.x;
      const dz = mousePos.z - position.z;
      const angleToMouse = Math.atan2(dx, dz);
      
      // Set player rotation to face mouse position
      playerModel.current.rotation.y = angleToMouse;
      setRotation(angleToMouse);
      
      // Handle shooting (left mouse button)
      if (isShooting && isAiming) {
        console.log("Player shooting in direction:", angleToMouse);
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
          
          if (distance < 5.0 && inFieldOfView) { // Increased range for shooting
            // Hit zombie
            playHit();
            const zombieStore = useZombies.getState();
            zombieStore.damageZombie(zombie.id, 25);
          }
        });
      }
      
      // Handle aiming visual indicator
      if (isAiming) {
        // Visual changes when aiming could be added here
        // Like changing the player model or showing a targeting reticle
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
      {/* ULTRA SIMPLIFIED PLAYER - just a large colored box */}
      <mesh 
        ref={playerRef}
        position={[0, 0.5, 0]}
      >
        <boxGeometry args={[2, 1, 2]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      
      {/* Direction arrow - clear indicator */}
      <mesh 
        position={[0, 0.5, 1.5]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#0088ff" />
      </mesh>
      
      {/* Player head/marker */}
      <mesh 
        position={[0, 1.5, 0]}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>
      
      {/* Aiming indicator - only shown when right-clicking to aim */}
      {isAiming && (
        <group>
          {/* Aiming laser line */}
          <mesh 
            position={[0, 0.5, 4]} 
            scale={[0.2, 0.2, 8]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.6} />
          </mesh>
          
          {/* Aiming circle at end of laser */}
          <mesh 
            position={[0, 0.5, 8]} 
            rotation={[Math.PI/2, 0, 0]}
          >
            <circleGeometry args={[0.5, 16]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default Player;
