import React, { useEffect } from 'react';
import Player from './Player';
import Zombie from './Zombie';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useRooms } from '../../lib/stores/useRooms';
import { useZombies } from '../../lib/stores/useZombies';
import * as THREE from 'three';

// Super simplified room - just a colored floor with walls
function SimpleRoom({ 
  roomId, 
  size, 
  position, 
  visible, 
  walls, 
  doors, 
  objects,
  isCapitanCabin
}: { 
  roomId: string;
  size: { width: number; height: number };
  position: { x: number; z: number };
  visible: boolean;
  walls: Array<{ position: { x: number; z: number }; size: { width: number; height: number } }>;
  doors: Array<{ position: { x: number; z: number }; size: { width: number; height: number }; locked: boolean }>;
  objects: Array<{ position: { x: number; z: number }; size: { width: number; height: number }; interactable: boolean }>;
  isCapitanCabin: boolean;
}) {
  if (!visible) return null;

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size.width, size.height]} />
        <meshStandardMaterial color={isCapitanCabin ? "#446688" : "#335577"} />
      </mesh>
      
      {/* Grid for better visibility */}
      <gridHelper 
        args={[Math.max(size.width, size.height), 10]} 
        position={[0, 0.05, 0]} 
      />
      
      {/* Room border */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size.width, size.height]} />
        <meshBasicMaterial color="#4477aa" wireframe={true} />
      </mesh>
      
      {/* Walls */}
      {walls.map((wall, index) => (
        <mesh key={`wall-${index}`} position={[wall.position.x, 0.5, wall.position.z]}>
          <boxGeometry args={[wall.size.width, 1, wall.size.height]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      ))}
      
      {/* Doors */}
      {doors.map((door, index) => (
        <mesh key={`door-${index}`} position={[door.position.x, 0.5, door.position.z]}>
          <boxGeometry args={[door.size.width, 1, door.size.height]} />
          <meshStandardMaterial color={door.locked ? "#ff0000" : "#00ff00"} />
        </mesh>
      ))}
      
      {/* Objects */}
      {objects.map((object, index) => (
        <mesh 
          key={`object-${index}`} 
          position={[object.position.x, 0.5, object.position.z]}
        >
          <boxGeometry args={[object.size.width, 1, object.size.height]} />
          <meshStandardMaterial color={object.interactable ? "#cc9966" : "#A0522D"} />
        </mesh>
      ))}
      
      {/* Captain's cabin marker */}
      {isCapitanCabin && (
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[4, 0.2, 4]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
      )}
    </group>
  );
}

// Main component for the cruise ship
const CruiseShipNew: React.FC = () => {
  // Get game state from stores
  const { position } = usePlayer();
  const { rooms, currentRoom } = useRooms();
  const { zombies } = useZombies();
  
  if (!currentRoom || !rooms[currentRoom]) {
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }
  
  return (
    <group>
      {/* Render all rooms */}
      {Object.entries(rooms).map(([roomId, roomData]) => (
        <SimpleRoom 
          key={roomId}
          roomId={roomId}
          size={roomData.size}
          position={{ x: 0, z: 0 }} // All at origin for simplicity
          visible={roomId === currentRoom}
          walls={roomData.walls}
          doors={roomData.doors}
          objects={roomData.objects}
          isCapitanCabin={roomData.type === "captainCabin"}
        />
      ))}
      
      {/* Player */}
      <Player />
      
      {/* Zombies - only render zombies in current room */}
      {zombies
        .filter(zombie => zombie.roomId === currentRoom)
        .map(zombie => (
          <Zombie 
            key={zombie.id}
            zombieId={zombie.id}
            position={zombie.position}
            health={zombie.health}
            speed={zombie.speed}
          />
        ))}
      
      {/* Debug info */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="purple" />
      </mesh>
    </group>
  );
};

export default CruiseShipNew;