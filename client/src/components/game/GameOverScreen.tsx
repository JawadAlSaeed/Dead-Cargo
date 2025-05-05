import { useEffect } from "react";
import { useGame } from "../../lib/stores/useGame";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useRooms } from "../../lib/stores/useRooms";
import { useZombies } from "../../lib/stores/useZombies";
import { useInventory } from "../../lib/stores/useInventory";
import { cn } from "../../lib/utils";

const GameOverScreen = () => {
  const { restart } = useGame();
  const playerStore = usePlayer();
  const roomsStore = useRooms();
  const zombiesStore = useZombies();
  const inventoryStore = useInventory();
  
  // Reset all game state when restarting
  const handleRestart = () => {
    // Reset player
    playerStore.reset();
    
    // Reset rooms
    roomsStore.reset();
    
    // Reset zombies
    zombiesStore.reset();
    
    // Reset inventory
    inventoryStore.reset();
    
    // Restart game
    restart();
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">GAME OVER</h1>
        <p className="text-white text-xl mb-8">
          You have succumbed to the zombie infestation...
        </p>
        
        <button
          className={cn(
            "px-8 py-3 bg-red-700 text-white rounded-md font-bold text-lg",
            "hover:bg-red-600 transition-colors duration-200"
          )}
          onClick={handleRestart}
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
