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
        {/* Floor */}
        <mesh 
          position={[0, 0, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[roomData.size.width, roomData.size.height]} />
          <meshStandardMaterial 
            map={floorTexture}
            roughness={0.8}
            emissive="#555555"
            emissiveIntensity={0.1}
          />
        </mesh>
        
        {/* Floor grid for better visibility */}
        <mesh 
          position={[0, 0.01, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[roomData.size.width, roomData.size.height]} />
          <meshBasicMaterial 
            color="#333333"
            wireframe={true}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
        
        {/* Walls */}
        {roomData.walls.map((wall, index) => (
          <mesh
            key={`wall-${index}`}
            position={[wall.position.x, 0.5, wall.position.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[wall.size.width, 1, wall.size.height]} />
            <meshStandardMaterial 
              map={wallTexture}
              color="#8B4513"
              emissive="#553311"
              emissiveIntensity={0.2}
            />
          </mesh>
        ))}
        
        {/* Room Objects (furniture, items, etc.) */}
        {roomData.objects.map((object, index) => {
          // Check if this is the interactive object nearby
          const isNearby = interactiveObjectNearby?.index === index;
          
          return (
            <group key={`object-${index}`}>
              <mesh
                position={[object.position.x, 0.25, object.position.z]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[object.size.width, 0.5, object.size.height]} />
                <meshStandardMaterial 
                  color={object.color || "#A0522D"} 
                  // Highlight interactive objects when nearby
                  emissive={object.interactable && isNearby ? "#ffff00" : "#000000"}
                  emissiveIntensity={0.5}
                />
              </mesh>
              
              {/* Interaction indicator */}
              {object.interactable && isNearby && (
                <mesh
                  position={[object.position.x, 1, object.position.z]}
                  rotation={[0, 0, 0]}
                >
                  <sphereGeometry args={[0.2, 8, 8]} />
                  <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                </mesh>
              )}
            </group>
          );
        })}
        
        {/* Doors */}
        {roomData.doors.map((door, index) => (
          <mesh
            key={`door-${index}`}
            position={[door.position.x, 0.5, door.position.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[door.size.width, 1, door.size.height]} />
            <meshStandardMaterial color={door.locked ? "#8B0000" : "#2E8B57"} />
          </mesh>
        ))}
        
        {/* Captain's Cabin marker if applicable */}
        {roomType === "captainCabin" && (
          <mesh
            position={[0, 1, 0]}
            rotation={[0, 0, 0]}
          >
            <boxGeometry args={[1, 0.1, 1]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
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
