import { useEffect } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useZombies } from "../../lib/stores/useZombies";
import { useRooms } from "../../lib/stores/useRooms";
import { checkCollision } from "../../lib/utils/collision";

// This component manages collision detection in the game
const CollisionSystem = () => {
  const { position, setPosition } = usePlayer();
  const { zombies } = useZombies();
  const { currentRoom, rooms } = useRooms();
  
  // Check collisions on every position change
  useEffect(() => {
    if (!currentRoom || !rooms[currentRoom]) return;
    
    const room = rooms[currentRoom];
    
    // Check wall collisions
    for (const wall of room.walls) {
      if (checkCollision(
        { x: position.x, z: position.z, width: 0.5, height: 0.5 },
        { x: wall.position.x, z: wall.position.z, width: wall.size.width, height: wall.size.height }
      )) {
        // Handle collision by adjusting position
        console.log("Wall collision detected");
        // Implement collision response here
      }
    }
    
    // Check object collisions
    for (const object of room.objects) {
      if (object.collidable && checkCollision(
        { x: position.x, z: position.z, width: 0.5, height: 0.5 },
        { x: object.position.x, z: object.position.z, width: object.size.width, height: object.size.height }
      )) {
        // Handle collision by adjusting position
        console.log("Object collision detected");
        // Implement collision response here
      }
    }
    
    // Check zombie collisions
    zombies.forEach(zombie => {
      if (zombie.roomId === currentRoom && checkCollision(
        { x: position.x, z: position.z, width: 0.5, height: 0.5 },
        { x: zombie.position.x, z: zombie.position.z, width: 0.5, height: 0.5 }
      )) {
        // Handle zombie collision
        console.log("Zombie collision detected");
        // Implement collision response here
      }
    });
    
  }, [position, currentRoom, rooms, zombies]);
  
  return null; // This is a pure logic component, no rendering
};

export default CollisionSystem;
