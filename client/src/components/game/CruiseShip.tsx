import { useEffect } from "react";
import Player from "./Player";
import Zombie from "./Zombie";
import Room from "./Room";
import { PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";
import { useRooms } from "../../lib/stores/useRooms";
import ProcGenRooms from "./ProcGenRooms";

const CruiseShip = () => {
  const { position } = usePlayer();
  const { zombies } = useZombies();
  const { currentRoom, generateShip } = useRooms();
  
  // Initialize the cruise ship on component mount
  useEffect(() => {
    console.log("Initializing cruise ship...");
    generateShip();
  }, [generateShip]);
  
  return (
    <>
      {/* Top-down orthographic camera that follows the player */}
      <OrthographicCamera
        makeDefault
        position={[position.x, 10, position.z]}
        zoom={40}
        near={1}
        far={100}
      />
      
      {/* Procedurally generate rooms */}
      <ProcGenRooms />
      
      {/* Current Room */}
      <Room 
        roomId={currentRoom} 
        roomType={useRooms.getState().rooms[currentRoom]?.type || "standard"} 
        isActive={true} 
      />
      
      {/* Player */}
      <Player />
      
      {/* Zombies in current room */}
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
        ))
      }
    </>
  );
};

export default CruiseShip;
