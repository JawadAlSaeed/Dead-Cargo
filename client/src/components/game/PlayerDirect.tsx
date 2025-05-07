import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";
import { useAudio } from "../../lib/stores/useAudio";
import { checkCollision, getDistance, isPointInRect } from "../../lib/utils/collision";
import { useRooms } from "../../lib/stores/useRooms";
import { useGame } from "../../lib/stores/useGame";

const PlayerDirect = () => {
  const playerRef = useRef<THREE.Mesh>(null);
  const playerModel = useRef<THREE.Group>(null);
  const { position, health, damage, heal, move, setPosition, setRotation, rotation } = usePlayer();
  const { zombies } = useZombies();
  const { playHit } = useAudio();
  const { currentRoom, walls, doors, roomObjects, captainCabin } = useRooms();
  const { end } = useGame();
  const { camera, gl } = useThree();
  
  // Direct keyboard controls
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    leftward: false,
    rightward: false,
    interact: false,
    inventory: false,
    attack: false,
    reload: false
  });
  
  // Mouse position for aiming and shooting
  const [mousePos, setMousePos] = useState({ x: 0, z: 0 });
  const [isAiming, setIsAiming] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [showMuzzleFlash, setShowMuzzleFlash] = useState(false);
  const muzzleFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Setup keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys(prev => ({ ...prev, forward: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, backward: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, leftward: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, rightward: true }));
          break;
        case 'KeyE':
          setKeys(prev => ({ ...prev, interact: true }));
          break;
        case 'Tab':
          event.preventDefault(); // Prevent tab from changing focus
          setKeys(prev => ({ ...prev, inventory: true }));
          break;
        case 'Space':
          setKeys(prev => ({ ...prev, attack: true }));
          break;
        case 'KeyR':
          setKeys(prev => ({ ...prev, reload: true }));
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys(prev => ({ ...prev, forward: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, backward: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, leftward: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, rightward: false }));
          break;
        case 'KeyE':
          setKeys(prev => ({ ...prev, interact: false }));
          break;
        case 'Tab':
          setKeys(prev => ({ ...prev, inventory: false }));
          break;
        case 'Space':
          setKeys(prev => ({ ...prev, attack: false }));
          break;
        case 'KeyR':
          setKeys(prev => ({ ...prev, reload: false }));
          break;
      }
    };

    // Add event listeners for keyboard
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
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
  
  // Initialize player and clean up muzzle flash timeout on unmount
  useEffect(() => {
    console.log("Player initialized with direct keyboard/mouse controls");
    
    // Clean up function
    return () => {
      if (muzzleFlashTimeoutRef.current) {
        clearTimeout(muzzleFlashTimeoutRef.current);
      }
    };
  }, []);
  
  // Update actual model position whenever player position changes
  useEffect(() => {
    if (playerModel.current) {
      playerModel.current.position.x = position.x;
      playerModel.current.position.y = position.y;
      playerModel.current.position.z = position.z;
    }
  }, [position]);
  
  // Player game logic
  useFrame((state, delta) => {
    if (playerRef.current && playerModel.current) {
      // Log the keyboard state
      console.log("Key states:", JSON.stringify(keys));
      
      // Movement speed
      const speed = 10 * delta; // Fast movement for good responsiveness
      let moveX = 0;
      let moveZ = 0;
      
      // WASD moves player independently of facing direction
      if (keys.forward) {
        moveZ -= speed; // Forward is -Z in world space
      }
      if (keys.backward) {
        moveZ += speed; // Backward is +Z in world space
      }
      if (keys.leftward) {
        moveX -= speed; // Left is -X in world space
      }
      if (keys.rightward) {
        moveX += speed; // Right is +X in world space
      }
      
      // Calculate new position
      let newX = position.x + moveX;
      let newZ = position.z + moveZ;

      // Get current room data for collision detection
      const roomsState = useRooms.getState();
      const currentRoom = roomsState.getCurrentRoomData();
      
      // Check collision with walls
      let collisionDetected = false;
      
      if (currentRoom) {
        // Player bounding box (simplified as a circle for collision)
        const playerRadius = 1.0; // Player collision radius
        
        // Check collision with walls
        for (const wall of currentRoom.walls) {
          // Use AABB collision detection with minimum distance
          const isColliding = isPointInRect(
            newX, newZ,
            wall.position.x, 
            wall.position.z,
            wall.size.width + playerRadius * 2, 
            wall.size.height + playerRadius * 2
          );
          
          if (isColliding) {
            collisionDetected = true;
            console.log("Wall collision detected");
            break;
          }
        }
        
        // Check collision with objects that are collidable
        for (const object of currentRoom.objects) {
          if (object.collidable) {
            const isColliding = isPointInRect(
              newX, newZ,
              object.position.x, 
              object.position.z,
              object.size.width + playerRadius * 2, 
              object.size.height + playerRadius * 2
            );
            
            if (isColliding) {
              collisionDetected = true;
              console.log("Object collision detected");
              break;
            }
          }
        }
      }
      
      // Apply movement only if no collision
      if ((moveX !== 0 || moveZ !== 0) && !collisionDetected) {
        move({ x: newX, y: position.y, z: newZ });
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
        console.log("Player shooting");
        
        // Show muzzle flash effect
        setShowMuzzleFlash(true);
        
        // Clear any existing timeout to avoid multiple timers
        if (muzzleFlashTimeoutRef.current) {
          clearTimeout(muzzleFlashTimeoutRef.current);
        }
        
        // Hide the muzzle flash after a short time
        muzzleFlashTimeoutRef.current = setTimeout(() => {
          setShowMuzzleFlash(false);
        }, 100); // Muzzle flash duration: 100ms
        
        // Check for zombies in attack range
        zombies.forEach(zombie => {
          const distance = getDistance(
            position.x, position.z,
            zombie.position.x, zombie.position.z
          );
          
          if (distance < 5.0) {
            // Hit zombie
            playHit();
            const zombieStore = useZombies.getState();
            zombieStore.damageZombie(zombie.id, 25);
          }
        });
      }
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
          
          {/* Muzzle flash effect */}
          {showMuzzleFlash && (
            <group position={[0, 0.5, 2.5]}>
              {/* Central flash */}
              <mesh scale={[1.5, 1.5, 0.1]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color="#ffff00" />
              </mesh>
              
              {/* Outer glow */}
              <mesh scale={[2, 2, 0.05]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color="#ff9900" transparent opacity={0.6} />
              </mesh>
              
              {/* Light effect */}
              <pointLight color="#ffff00" intensity={5} distance={5} decay={2} />
            </group>
          )}
        </group>
      )}
    </group>
  );
};

export default PlayerDirect;