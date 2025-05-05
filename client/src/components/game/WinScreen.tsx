import { useEffect } from "react";
import { useGame } from "../../lib/stores/useGame";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useRooms } from "../../lib/stores/useRooms";
import { useZombies } from "../../lib/stores/useZombies";
import { useInventory } from "../../lib/stores/useInventory";
import { useAudio } from "../../lib/stores/useAudio";
import { cn } from "../../lib/utils";

const WinScreen = () => {
  const { restart } = useGame();
  const playerStore = usePlayer();
  const roomsStore = useRooms();
  const zombiesStore = useZombies();
  const inventoryStore = useInventory();
  const { playSuccess } = useAudio();
  
  // Play success sound when win screen appears
  useEffect(() => {
    playSuccess();
  }, [playSuccess]);
  
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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-green-500 mb-4">YOU ESCAPED!</h1>
        <p className="text-white text-xl mb-8">
          You made it to the Captain's Cabin and called for help!
        </p>
        
        <button
          className={cn(
            "px-8 py-3 bg-green-700 text-white rounded-md font-bold text-lg",
            "hover:bg-green-600 transition-colors duration-200"
          )}
          onClick={handleRestart}
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
};

export default WinScreen;
