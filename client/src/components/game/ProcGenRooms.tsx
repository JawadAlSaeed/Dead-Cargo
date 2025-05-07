import { useEffect } from "react";
import { useRooms, RoomType } from "../../lib/stores/useRooms";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";

// Map of room types to their styles and properties
const ROOM_TYPES: Record<string, { 
  minWidth: number, 
  maxWidth: number, 
  minHeight: number, 
  maxHeight: number,
  minZombies: number,
  maxZombies: number,
  description: string
}> = {
  bedroom: {
    minWidth: 8,
    maxWidth: 12,
    minHeight: 8,
    maxHeight: 12,
    minZombies: 1,
    maxZombies: 2,
    description: "A small passenger cabin"
  },
  kitchen: {
    minWidth: 10,
    maxWidth: 14,
    minHeight: 8,
    maxHeight: 12,
    minZombies: 2,
    maxZombies: 4,
    description: "Ship's kitchen area"
  },
  cargo: {
    minWidth: 14,
    maxWidth: 20,
    minHeight: 14,
    maxHeight: 20,
    minZombies: 3,
    maxZombies: 6,
    description: "Large cargo storage area"
  },
  medical: {
    minWidth: 10,
    maxWidth: 12,
    minHeight: 10,
    maxHeight: 12,
    minZombies: 1,
    maxZombies: 3,
    description: "Ship's medical bay"
  },
  engine: {
    minWidth: 12,
    maxWidth: 16,
    minHeight: 12,
    maxHeight: 14,
    minZombies: 2,
    maxZombies: 4,
    description: "Engine room with lots of machinery"
  },
  captainCabin: {
    minWidth: 14,
    maxWidth: 14,
    minHeight: 14,
    maxHeight: 14,
    minZombies: 3,
    maxZombies: 5,
    description: "Captain's private quarters"
  }
};

// This component handles the procedural generation of rooms
const ProcGenRooms = () => {
  const { 
    generateRoom, 
    generateHallway,
    connectRoomToHallway,
    connectRooms,
    currentRoom, 
    rooms, 
    setCurrentRoom,
    hallwayId
  } = useRooms();
  
  const { setPosition } = usePlayer();
  const { spawnZombies } = useZombies();
  
  // Initialize room generation and player position
  useEffect(() => {
    if (!rooms || Object.keys(rooms).length === 0) {
      console.log("Generating initial ship layout with central hallway...");
      
      // First, generate a long hallway as the central corridor
      const mainHallwayId = generateHallway(60, 6);
      console.log(`Generated main hallway: ${mainHallwayId}`);
      
      // Generate the starting room (a bedroom)
      const startingRoomId = generateRoom("bedroom", {
        width: 10,
        height: 10
      });
      
      // Connect the starting room to the hallway at a specific position
      connectRoomToHallway(startingRoomId, -25); // Near the beginning of the hallway
      
      // Set the starting room as current and position the player there
      setCurrentRoom(startingRoomId);
      setPosition({ x: 0, y: 0.5, z: 0 });
      
      // Spawn initial zombie - just one for an easy start
      spawnZombies(startingRoomId, 1);
      
      // Generate a variety of room types along the hallway
      const roomTypesToGenerate: RoomType[] = ["kitchen", "bedroom", "medical", "cargo", "engine", "bedroom"];
      
      // Distribute rooms along the hallway with varying spacing
      let position = -20;
      for (const roomType of roomTypesToGenerate) {
        // Get room type properties
        const typeConfig = ROOM_TYPES[roomType];
        
        // Generate room with size within the appropriate range
        const width = typeConfig.minWidth + Math.random() * (typeConfig.maxWidth - typeConfig.minWidth);
        const height = typeConfig.minHeight + Math.random() * (typeConfig.maxHeight - typeConfig.minHeight);
        
        const roomId = generateRoom(roomType as RoomType, { width, height });
        
        // Connect to hallway at calculated position
        connectRoomToHallway(roomId, position);
        
        // Spawn appropriate number of zombies based on room type
        const zombieCount = Math.floor(typeConfig.minZombies + 
                                       Math.random() * (typeConfig.maxZombies - typeConfig.minZombies));
        spawnZombies(roomId, zombieCount);
        
        // Increment position for next room
        position += 8 + Math.random() * 7; // 8-15 units between room entrances
        
        console.log(`Generated ${roomType} at position ${position} with ${zombieCount} zombies`);
      }
      
      // Finally, place the captain's cabin at the far end of the hallway
      const captainCabinId = generateRoom("captainCabin", {
        width: ROOM_TYPES.captainCabin.maxWidth,
        height: ROOM_TYPES.captainCabin.maxHeight
      });
      
      // Connect to the very end of the hallway
      connectRoomToHallway(captainCabinId, 25);
      
      // Spawn tough zombies in captain's cabin
      spawnZombies(captainCabinId, 4, true);
      
      console.log("Ship layout with central hallway generated successfully!");
    }
  }, [
    generateRoom, 
    generateHallway,
    connectRoomToHallway,
    setCurrentRoom, 
    setPosition, 
    spawnZombies, 
    rooms
  ]);
  
  // When the current room changes, we check for exploration progress
  useEffect(() => {
    if (currentRoom && rooms[currentRoom]) {
      // If we've entered the hallway for the first time, log a message
      if (currentRoom === hallwayId && !rooms[hallwayId].visited) {
        console.log("Player has discovered the main hallway!");
      }
      
      // If we've entered the captain's cabin, log a special message
      if (rooms[currentRoom].type === "captainCabin" && !rooms[currentRoom].visited) {
        console.log("Player has reached the Captain's Cabin! Potential escape point found.");
      }
    }
  }, [currentRoom, rooms, hallwayId]);
  
  return null; // This is a logic component, no rendering needed
};

export default ProcGenRooms;
