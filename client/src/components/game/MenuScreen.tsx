import { useEffect, useState } from "react";
import { useGame } from "../../lib/stores/useGame";
import { useAudio } from "../../lib/stores/useAudio";
import { cn } from "../../lib/utils";

const MenuScreen = () => {
  const { start } = useGame();
  const { toggleMute, isMuted } = useAudio();
  const [instructions, setInstructions] = useState(false);
  
  const handleStartGame = () => {
    start();
  };
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50">
      <div className="max-w-md w-full text-center px-4">
        <h1 className="text-6xl font-bold text-red-600 mb-2">DEAD CARGO</h1>
        <p className="text-white text-xl mb-8">Survive the Zombie Cruise Ship</p>
        
        {instructions ? (
          <div className="bg-gray-900 rounded-lg p-4 mb-8 text-left">
            <h2 className="text-xl font-bold text-white mb-2">Instructions:</h2>
            <ul className="text-gray-300 space-y-2 mb-4">
              <li><span className="font-bold">Movement:</span> WASD or Arrow Keys</li>
              <li><span className="font-bold">Attack:</span> Space Bar</li>
              <li><span className="font-bold">Interact:</span> E key</li>
              <li><span className="font-bold">Inventory:</span> I or Tab key</li>
              <li><span className="font-bold">Reload:</span> R key</li>
            </ul>
            <p className="text-white mb-4">
              Explore the cruise ship, collect weapons and supplies, 
              manage your inventory carefully, and find your way to the 
              Captain's Cabin to call for help!
            </p>
            <button 
              className="text-blue-400 hover:text-blue-300"
              onClick={() => setInstructions(false)}
            >
              Back to Menu
            </button>
          </div>
        ) : (
          <>
            <button
              className={cn(
                "w-full py-3 bg-red-700 text-white rounded-md font-bold text-lg mb-4",
                "hover:bg-red-600 transition-colors duration-200"
              )}
              onClick={handleStartGame}
            >
              START GAME
            </button>
            
            <button
              className={cn(
                "w-full py-3 bg-gray-700 text-white rounded-md font-bold text-lg mb-4",
                "hover:bg-gray-600 transition-colors duration-200"
              )}
              onClick={() => setInstructions(true)}
            >
              INSTRUCTIONS
            </button>
            
            <button
              className={cn(
                "px-4 py-2 bg-gray-800 text-white rounded-md",
                "hover:bg-gray-700 transition-colors duration-200"
              )}
              onClick={toggleMute}
            >
              {isMuted ? "SOUND: OFF" : "SOUND: ON"}
            </button>
          </>
        )}
      </div>
      
      <div className="absolute bottom-4 text-gray-500 text-sm">
        Dead Cargo - A roguelike survival game
      </div>
    </div>
  );
};

export default MenuScreen;
