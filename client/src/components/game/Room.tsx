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
  
  // Get the appropriate colors for each room type
  const getRoomStyle = () => {
    switch (roomType) {
      case "hallway":
        return {
          floor: "#444444",
          outline: "#555555",
          corners: "#666666",
          walls: "#777777"
        };
      case "bedroom":
        return {
          floor: "#335577",
          outline: "#4477aa",
          corners: "#5599cc",
          walls: "#446688"
        };
      case "kitchen":
        return {
          floor: "#557755",
          outline: "#668866",
          corners: "#77aa77",
          walls: "#445544"
        };
      case "cargo":
        return {
          floor: "#775533",
          outline: "#886644",
          corners: "#aa8855",
          walls: "#664422"
        };
      case "medical":
        return {
          floor: "#777788",
          outline: "#8888aa",
          corners: "#9999bb",
          walls: "#666699"
        };
      case "engine":
        return {
          floor: "#775544",
          outline: "#886655",
          corners: "#997766",
          walls: "#664433"
        };
      case "captainCabin":
        return {
          floor: "#886633",
          outline: "#aa8844",
          corners: "#cc9955",
          walls: "#775522"
        };
      default:
        return {
          floor: "#335577",
          outline: "#4477aa",
          corners: "#ffaa00",
          walls: "#8B4513"
        };
    }
  };
  
  const roomStyle = getRoomStyle();
  
  return (
    <>
      <group ref={roomRef}>
        {/* Floor with room type specific color */}
        <mesh 
          position={[0, 0, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[roomData.size.width, roomData.size.height]} />
          <meshBasicMaterial color={roomStyle.floor} />
        </mesh>
        
        {/* Room outline */}
        <mesh
          position={[0, 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[roomData.size.width, roomData.size.height]} />
          <meshBasicMaterial color={roomStyle.outline} wireframe={true} />
        </mesh>
        
        {/* Special floor pattern for hallway */}
        {roomType === "hallway" && (
          <>
            {/* Floor pattern */}
            <mesh
              position={[0, 0.02, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[roomData.size.width, roomData.size.height]} />
              <meshBasicMaterial color="#333333" wireframe={true} />
            </mesh>
            
            {/* Center line */}
            <mesh
              position={[0, 0.03, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[roomData.size.width * 0.9, 0.5, 1]}
            >
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#555555" />
            </mesh>
          </>
        )}
        
        {/* Room type indicator in text or symbol */}
        <mesh
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[roomData.size.width * 0.3, roomData.size.height * 0.3, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial 
            color={roomType === "captainCabin" ? "#FFD700" : "#00000000"} 
            transparent={true} 
            opacity={roomType === "captainCabin" ? 0.7 : 0.2}
          />
        </mesh>
        
        {/* Four corner markers with room-specific style */}
        {[
          { x: roomData.size.width/2 - 0.5, z: roomData.size.height/2 - 0.5 },
          { x: roomData.size.width/2 - 0.5, z: -roomData.size.height/2 + 0.5 },
          { x: -roomData.size.width/2 + 0.5, z: roomData.size.height/2 - 0.5 }, 
          { x: -roomData.size.width/2 + 0.5, z: -roomData.size.height/2 + 0.5 }
        ].map((pos, idx) => (
          <mesh key={`corner-${idx}`} position={[pos.x, 0.1, pos.z]}>
            <boxGeometry args={[1, 0.2, 1]} />
            <meshBasicMaterial color={roomStyle.corners} />
          </mesh>
        ))}
        
        {/* Walls with room-specific style */}
        {roomData.walls.map((wall, index) => (
          <mesh
            key={`wall-${index}`}
            position={[wall.position.x, 0.25, wall.position.z]}
          >
            <boxGeometry args={[wall.size.width, 0.5, wall.size.height]} />
            <meshBasicMaterial color={roomStyle.walls} />
          </mesh>
        ))}
        
        {/* Objects with differentiation by type */}
        {roomData.objects.map((object, index) => {
          const isNearby = interactiveObjectNearby?.index === index;
          
          // Get appropriate color based on object type
          let objectColor;
          if (isNearby) {
            objectColor = "#ffff00"; // Highlighted when nearby
          } else if (object.interactable) {
            if (object.type === "light") {
              objectColor = "#FFFF99"; // Lights
            } else if (object.type === "debris" || object.type === "bloodstain") {
              objectColor = object.color || "#990000"; // Debris/blood
            } else if (object.type === "radio") {
              objectColor = "#00FFFF"; // Radio (special item)
            } else {
              objectColor = "#cc9966"; // Default interactable
            }
          } else {
            objectColor = object.color || "#A0522D"; // Default object color
          }
          
          // Determine object height based on type
          const objectHeight = 
            object.type === "table" ? 0.4 :
            object.type === "bed" ? 0.3 :
            object.type === "cabinet" ? 0.6 :
            object.type === "crate" ? 0.4 :
            object.type === "chair" ? 0.5 :
            object.type === "desk" ? 0.5 :
            object.type === "light" ? 0.1 :
            0.3; // Default
          
          return (
            <mesh 
              key={`object-${index}`}
              position={[object.position.x, objectHeight/2, object.position.z]}
            >
              <boxGeometry args={[object.size.width, objectHeight, object.size.height]} />
              <meshBasicMaterial color={objectColor} />
              
              {/* Add light for light objects */}
              {object.type === "light" && (
                <pointLight 
                  position={[0, 0.1, 0]} 
                  color="#FFFFCC" 
                  intensity={0.5} 
                  distance={3}
                  decay={2}
                />
              )}
            </mesh>
          );
        })}
        
        {/* Doors with better indication */}
        {roomData.doors.map((door, index) => (
          <group key={`door-${index}`}>
            {/* Door frame */}
            <mesh
              position={[door.position.x, 0.5, door.position.z]}
            >
              <boxGeometry args={[door.size.width + 0.4, 1, door.size.height + 0.4]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            
            {/* Door itself */}
            <mesh
              position={[door.position.x, 0.5, door.position.z]}
            >
              <boxGeometry args={[door.size.width, 1, door.size.height]} />
              <meshBasicMaterial color={door.locked ? "#cc0000" : "#00cc00"} />
            </mesh>
            
            {/* Lock indicator for locked doors */}
            {door.locked && (
              <mesh
                position={[door.position.x, 0.7, door.position.z]}
                scale={[0.3, 0.3, 0.3]}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#ffcc00" />
              </mesh>
            )}
          </group>
        ))}
        
        {/* Captain's cabin special indicator */}
        {roomType === "captainCabin" && (
          <group>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[3, 0.2, 3]} />
              <meshBasicMaterial color="#FFD700" />
            </mesh>
            
            {/* Add a star-shaped arrangement of small cubes */}
            {[0, 1, 2, 3, 4].map(i => {
              const angle = (i / 5) * Math.PI * 2;
              const dist = 1.2;
              return (
                <mesh 
                  key={`star-${i}`}
                  position={[
                    Math.cos(angle) * dist, 
                    0.15, 
                    Math.sin(angle) * dist
                  ]}
                  scale={[0.3, 0.1, 0.3]}
                >
                  <boxGeometry args={[1, 1, 1]} />
                  <meshBasicMaterial color="#FFDD33" />
                </mesh>
              );
            })}
            
            {/* Add a point light for dramatic effect */}
            <pointLight
              position={[0, 1, 0]}
              color="#FFDD33"
              intensity={0.8}
              distance={5}
              decay={2}
            />
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
