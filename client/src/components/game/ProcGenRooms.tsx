import { useEffect } from "react";
import { useRooms } from "../../lib/stores/useRooms";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";

// This component handles the procedural generation of rooms
const ProcGenRooms = () => {
  const { generateRoom, currentRoom, rooms, setCurrentRoom } = useRooms();
  const { setPosition } = usePlayer();
  const { spawnZombies } = useZombies();
  
  // Initialize room generation and player position
  useEffect(() => {
    if (!rooms || Object.keys(rooms).length === 0) {
      console.log("Generating initial ship layout...");
      
      // Generate the starting room
      const startingRoomId = generateRoom("standard", {
        width: 12,
        height: 12
      });
      
      // Set the current room and position the player in it
      setCurrentRoom(startingRoomId);
      
      // Position player in the center of the room (significantly offset to see better)
      setPosition({ x: 3, y: 0.25, z: 3 });
      
      // Spawn initial zombies - fewer at start for easier beginning
      spawnZombies(startingRoomId, 1);
      
      // Generate connected rooms
      for (let i = 0; i < 3; i++) {
        const roomId = generateRoom("standard", {
          width: 10 + Math.random() * 6,
          height: 10 + Math.random() * 6
        });
        
        // Spawn zombies in generated rooms
        spawnZombies(roomId, Math.floor(Math.random() * 3) + 2);
      }
      
      // Generate the captain's cabin at a distant location
      const captainCabinId = generateRoom("captainCabin", {
        width: 14,
        height: 14
      });
      
      // Spawn a few tough zombies in captain's cabin
      spawnZombies(captainCabinId, Math.floor(Math.random() * 2) + 3, true);
      
      console.log("Initial ship layout generated.");
    }
  }, [generateRoom, setCurrentRoom, setPosition, spawnZombies, rooms]);
  
  // When the current room changes, we may need to generate new connected rooms
  useEffect(() => {
    if (currentRoom && rooms[currentRoom]) {
      const roomData = rooms[currentRoom];
      
      // Check if we need to generate more rooms
      if (roomData.connectedRooms.length < 2 && Math.random() > 0.3) {
        const newRoomId = generateRoom("standard", {
          width: 10 + Math.random() * 6,
          height: 10 + Math.random() * 6
        });
        
        // Spawn zombies in the new room
        spawnZombies(newRoomId, Math.floor(Math.random() * 3) + 1);
        
        console.log(`Generated new connected room: ${newRoomId}`);
      }
    }
  }, [currentRoom, rooms, generateRoom, spawnZombies]);
  
  return null; // This is a logic component, no rendering needed
};

export default ProcGenRooms;
