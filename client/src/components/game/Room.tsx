import { useEffect, useRef, useState } from "react";
import { useRooms } from "../../lib/stores/useRooms";
import { usePlayer } from "../../lib/stores/usePlayer";
import { getDistance, isPointInRect } from "../../lib/utils/collision";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import SearchableObject from "./SearchableObject";

interface RoomProps {
  roomId: string;
  roomType: string;
  isActive: boolean;
}

const Room = ({ roomId, roomType, isActive }: RoomProps) => {
  const roomRef = useRef<THREE.Group>(null);
  const { getCurrentRoomData } = useRooms();
  const roomData = getCurrentRoomData();
  const { position } = usePlayer();
  const [, getKeys] = useKeyboardControls();
  
  // State for interactive objects
  const [interactiveObjectNearby, setInteractiveObjectNearby] = useState<{
    type: string;
    index: number;
  } | null>(null);
  
  // State for searchable object UI
  const [searchingObject, setSearchingObject] = useState<string | null>(null);
  
  // Load textures
  const floorTexture = useTexture("/textures/wood.jpg");
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(5, 5);
  floorTexture.minFilter = THREE.LinearFilter;
  floorTexture.magFilter = THREE.LinearFilter;
  floorTexture.needsUpdate = true;
  
  const wallTexture = useTexture("/textures/wood.jpg");
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(2, 1);
  wallTexture.minFilter = THREE.LinearFilter;
  wallTexture.magFilter = THREE.LinearFilter;
  wallTexture.needsUpdate = true;
  
  // Check if player is near interactive objects
  useEffect(() => {
    if (!isActive || !roomData) return;
    
    const checkInteractiveObjects = () => {
      // Check distance to each interactive object
      const interactiveObjects = roomData.objects.filter(obj => obj.interactable);
      
      // Find the closest interactive object within range
      let closestObject = null;
      let closestDistance = 2; // Max interaction distance
      
      interactiveObjects.forEach((obj, index) => {
        const distance = getDistance(
          position.x, position.z,
          obj.position.x, obj.position.z
        );
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestObject = { type: obj.type, index };
        }
      });
      
      setInteractiveObjectNearby(closestObject);
    };
    
    // Check for nearby objects periodically
    const interval = setInterval(checkInteractiveObjects, 200);
    
    // Check for interact key when near objects
    const checkInteract = () => {
      const { interact } = getKeys();
      
      if (interact && interactiveObjectNearby) {
        console.log(`Interacting with ${interactiveObjectNearby.type}`);
        setSearchingObject(interactiveObjectNearby.type);
      }
    };
    
    // Check for interaction key press
    const interactInterval = setInterval(checkInteract, 100);
    
    return () => {
      clearInterval(interval);
      clearInterval(interactInterval);
    };
  }, [isActive, roomData, position, interactiveObjectNearby, getKeys]);
  
  // Set up escape key listener to close search UI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchingObject) {
        setSearchingObject(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchingObject]);
  
  useEffect(() => {
    if (isActive) {
      console.log(`Room ${roomId} (${roomType}) activated`);
    }
  }, [roomId, roomType, isActive]);
  
  // Only render the room if it's active
  if (!isActive || !roomData) return null;
  
  return (
    <>
      <group ref={roomRef}>
        {/* Floor - large bright platform */}
        <mesh 
          position={[0, -0.1, 0]} 
          receiveShadow
        >
          <boxGeometry args={[roomData.size.width, 0.2, roomData.size.height]} />
          <meshStandardMaterial 
            color="#335577"
            roughness={0.5}
          />
        </mesh>
        
        {/* Floor grid */}
        <gridHelper 
          args={[roomData.size.width, 10, "#ffffff", "#444444"]} 
          position={[0, 0.01, 0]}
          rotation={[Math.PI/2, 0, 0]}
        />
        
        {/* Room border - bright outline */}
        <mesh
          position={[0, 0, 0]}
        >
          <boxGeometry args={[roomData.size.width, 0.1, roomData.size.height]} />
          <meshStandardMaterial 
            color="#3399ff" 
            wireframe={true} 
            emissive="#3399ff"
            emissiveIntensity={0.5}
          />
        </mesh>
        
        {/* Corner markers */}
        <mesh position={[roomData.size.width/2, 0, roomData.size.height/2]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#ffaa00" />
        </mesh>
        <mesh position={[roomData.size.width/2, 0, -roomData.size.height/2]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#ffaa00" />
        </mesh>
        <mesh position={[-roomData.size.width/2, 0, roomData.size.height/2]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#ffaa00" />
        </mesh>
        <mesh position={[-roomData.size.width/2, 0, -roomData.size.height/2]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#ffaa00" />
        </mesh>
        
        {/* Walls - 3D walls with bright colors */}
        {roomData.walls.map((wall, index) => (
          <group key={`wall-${index}`}>
            {/* Main wall - tall and visible */}
            <mesh
              position={[wall.position.x, 1.5, wall.position.z]}
            >
              <boxGeometry args={[wall.size.width, 3, wall.size.height]} />
              <meshStandardMaterial 
                color="#8B4513" 
                emissive="#6d432a"
                emissiveIntensity={0.3}
              />
            </mesh>
            
            {/* Wall top highlight */}
            <mesh
              position={[wall.position.x, 3.1, wall.position.z]}
            >
              <boxGeometry args={[wall.size.width, 0.2, wall.size.height]} />
              <meshStandardMaterial color="#ffaa66" />
            </mesh>
            
            {/* Wall glow outline */}
            <mesh
              position={[wall.position.x, 1.5, wall.position.z]}
            >
              <boxGeometry args={[wall.size.width + 0.1, 3.1, wall.size.height + 0.1]} />
              <meshStandardMaterial 
                color="#aa6633" 
                wireframe={true}
              />
            </mesh>
          </group>
        ))}
        
        {/* Room Objects (furniture, items, etc.) - top-down visible as colored areas */}
        {roomData.objects.map((object, index) => {
          // Check if this is the interactive object nearby
          const isNearby = interactiveObjectNearby?.index === index;
          const baseColor = object.color || (object.interactable ? "#cc9966" : "#A0522D");
          
          return (
            <group key={`object-${index}`}>
              {/* Object base */}
              <mesh
                position={[object.position.x, 0.08, object.position.z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[object.size.width, object.size.height]} />
                <meshBasicMaterial color={baseColor} />
              </mesh>
              
              {/* Object pattern */}
              <mesh
                position={[object.position.x, 0.09, object.position.z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[object.size.width - 0.05, object.size.height - 0.05]} />
                <meshBasicMaterial 
                  color={object.interactable ? "#ddaa77" : "#b05e2c"}
                  wireframe={true}
                />
              </mesh>
              
              {/* Icon for interactable objects */}
              {object.interactable && (
                <mesh
                  position={[object.position.x, 0.1, object.position.z]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <circleGeometry args={[0.2, 8]} />
                  <meshBasicMaterial 
                    color={isNearby ? "#ffff00" : "#ffffff"} 
                    opacity={isNearby ? 0.9 : 0.6}
                    transparent
                  />
                </mesh>
              )}
              
              {/* Interaction indicator when nearby */}
              {object.interactable && isNearby && (
                <group>
                  <mesh
                    position={[object.position.x, 0.15, object.position.z]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <ringGeometry args={[0.3, 0.35, 16]} />
                    <meshBasicMaterial color="#ffff00" />
                  </mesh>
                  
                  <mesh
                    position={[object.position.x, 0.2, object.position.z]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <planeGeometry args={[0.8, 0.3]} />
                    <meshBasicMaterial 
                      color="#222222" 
                      opacity={0.8} 
                      transparent
                    />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}
        
        {/* Doors - much more visible in top-down view */}
        {roomData.doors.map((door, index) => (
          <group key={`door-${index}`}>
            {/* Door base */}
            <mesh
              position={[door.position.x, 0.07, door.position.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[door.size.width, door.size.height]} />
              <meshBasicMaterial color={door.locked ? "#550000" : "#005500"} />
            </mesh>
            
            {/* Door indicator for direction */}
            <mesh
              position={[
                door.position.x, 
                0.08, 
                door.position.z
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[door.size.width * 0.7, door.size.height * 0.7]} />
              <meshBasicMaterial color={door.locked ? "#990000" : "#00aa00"} />
            </mesh>
            
            {/* Door icon */}
            <mesh
              position={[door.position.x, 0.09, door.position.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[0.3, 16]} />
              <meshBasicMaterial color={door.locked ? "#ff0000" : "#00ff00"} transparent opacity={0.7} />
            </mesh>
          </group>
        ))}
        
        {/* Captain's Cabin marker if applicable - designed for top-down view */}
        {roomType === "captainCabin" && (
          <group>
            {/* Captain marker - gold star pattern */}
            <mesh
              position={[0, 0.15, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[1.5, 1.8, 8, 1]} />
              <meshBasicMaterial color="#FFD700" />
            </mesh>
            
            {/* Inner marker */}
            <mesh
              position={[0, 0.14, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.8, 1.0, 16, 1]} />
              <meshBasicMaterial color="#FFD700" />
            </mesh>
            
            {/* Center circle */}
            <mesh
              position={[0, 0.16, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[0.6, 32]} />
              <meshBasicMaterial color="#FFD700" opacity={0.5} transparent />
            </mesh>
            
            {/* "Captain" text placeholder */}
            <mesh
              position={[0, 0.18, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[1.2, 0.4]} />
              <meshBasicMaterial color="#222222" />
            </mesh>
          </group>
        )}
      </group>
      
      {/* Interaction prompt if near interactive object */}
      {interactiveObjectNearby && !searchingObject && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-80 text-white px-4 py-2 rounded">
          Press E to search {interactiveObjectNearby.type}
        </div>
      )}
      
      {/* Searchable Object UI */}
      {searchingObject && (
        <SearchableObject 
          objectType={searchingObject} 
          onClose={() => setSearchingObject(null)} 
        />
      )}
    </>
  );
};

export default Room;
