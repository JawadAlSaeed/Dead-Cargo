import { useEffect, useState } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { useInventory } from "../../lib/stores/useInventory";
import { usePlayer } from "../../lib/stores/usePlayer";
import InventoryGrid from "./InventoryGrid";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

const Inventory = () => {
  const [, getKeys] = useKeyboardControls();
  const [showInventory, setShowInventory] = useState(false);
  const { items, gridSize } = useInventory();
  const { health, maxHealth } = usePlayer();
  
  // Check for inventory key press (Tab key only)
  useEffect(() => {
    const checkInventoryToggle = () => {
      const { inventory } = getKeys();
      if (inventory) {
        setShowInventory(prev => !prev);
      }
    };
    
    // Set up interval to check key state
    const interval = setInterval(checkInventoryToggle, 100);
    
    // Set up event listener for Tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent default Tab behavior
        setShowInventory(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [getKeys]);
  
  // If inventory is not shown, don't render anything
  if (!showInventory) return null;
  
  // Render inventory UI portal with player status
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-4xl w-full">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-200">INVENTORY</h2>
          <button 
            className="text-gray-400 hover:text-white"
            onClick={() => setShowInventory(false)}
          >
            Close [TAB]
          </button>
        </div>
        
        {/* Player Status Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-1 bg-gray-800 rounded-lg p-3">
            <h3 className="font-bold text-gray-300 mb-2">PLAYER STATUS</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Health */}
              <div className="bg-gray-900 rounded p-2">
                <div className="text-sm text-gray-400">Health</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-600 h-full rounded-full"
                      style={{ width: `${(health / maxHealth) * 100}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-white font-medium">{Math.floor(health)}</span>
                </div>
              </div>
              
              {/* Hunger */}
              <div className="bg-gray-900 rounded p-2">
                <div className="text-sm text-gray-400">Hunger</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-yellow-600 h-full rounded-full"
                      style={{ width: '75%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-white font-medium">75</span>
                </div>
              </div>
              
              {/* Stamina */}
              <div className="bg-gray-900 rounded p-2">
                <div className="text-sm text-gray-400">Stamina</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: '90%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-white font-medium">90</span>
                </div>
              </div>
              
              {/* Thirst */}
              <div className="bg-gray-900 rounded p-2">
                <div className="text-sm text-gray-400">Thirst</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-400 h-full rounded-full"
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-white font-medium">60</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Character Equipment Section */}
          <div className="col-span-1 bg-gray-800 rounded-lg p-3">
            <h3 className="font-bold text-gray-300 mb-2">EQUIPMENT</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className={cn(
                "border border-gray-700 rounded p-2 flex items-center justify-center",
                "bg-gray-900 text-gray-400 h-16"
              )}>
                <span>Weapon</span>
              </div>
              <div className={cn(
                "border border-gray-700 rounded p-2 flex items-center justify-center",
                "bg-gray-900 text-gray-400 h-16"
              )}>
                <span>Heal</span>
              </div>
              <div className={cn(
                "border border-gray-700 rounded p-2 flex items-center justify-center",
                "bg-gray-900 text-gray-400 h-16"
              )}>
                <span>Key</span>
              </div>
              <div className={cn(
                "border border-gray-700 rounded p-2 flex items-center justify-center",
                "bg-gray-900 text-gray-400 h-16"
              )}>
                <span>Map</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Inventory Grid */}
        <div className="bg-gray-800 rounded-lg p-3">
          <h3 className="font-bold text-gray-300 mb-2">BACKPACK</h3>
          <InventoryGrid gridSize={gridSize} items={items} />
        </div>
        
        {/* Instructions */}
        <div className="mt-4 text-sm text-gray-400">
          <p>Click and drag items to rearrange. Double-click to use or equip.</p>
          <p>Press TAB to close inventory.</p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Inventory;
