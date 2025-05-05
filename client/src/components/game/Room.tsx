import { useEffect, useRef } from "react";
import { useRooms } from "../../lib/stores/useRooms";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

interface RoomProps {
  roomId: string;
  roomType: string;
  isActive: boolean;
}

const Room = ({ roomId, roomType, isActive }: RoomProps) => {
  const roomRef = useRef<THREE.Group>(null);
  const { getCurrentRoomData } = useRooms();
  const roomData = getCurrentRoomData();
  
  // Load textures
  const floorTexture = useTexture("/textures/wood.jpg");
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(5, 5);
  
  const wallTexture = useTexture("/textures/wood.jpg");
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(2, 1);
  
  useEffect(() => {
    if (isActive) {
      console.log(`Room ${roomId} (${roomType}) activated`);
    }
  }, [roomId, roomType, isActive]);
  
  // Only render the room if it's active
  if (!isActive || !roomData) return null;
  
  return (
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
          />
        </mesh>
      ))}
      
      {/* Room Objects (furniture, items, etc.) */}
      {roomData.objects.map((object, index) => (
        <mesh
          key={`object-${index}`}
          position={[object.position.x, 0.25, object.position.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[object.size.width, 0.5, object.size.height]} />
          <meshStandardMaterial color={object.color || "#A0522D"} />
        </mesh>
      ))}
      
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
  );
};

export default Room;
