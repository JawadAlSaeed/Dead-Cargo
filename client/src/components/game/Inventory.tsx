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
  
  // Check for inventory key press
  useEffect(() => {
    const checkInventoryToggle = () => {
      const { inventory } = getKeys();
      if (inventory) {
        setShowInventory(prev => !prev);
      }
    };
    
    // Set up interval to check key state
    const interval = setInterval(checkInventoryToggle, 100);
    return () => clearInterval(interval);
  }, [getKeys]);
  
  // If inventory is not shown, don't render anything
  if (!showInventory) return null;
  
  // Render inventory UI portal
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-3xl w-full">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-200">INVENTORY</h2>
          <div className="text-gray-300">
            <span>Health: {health}/{maxHealth}</span>
          </div>
        </div>
        
        {/* Character Equipment Section */}
        <div className="flex mb-4">
          <div className="w-1/4 pr-4">
            <div className="border border-gray-700 rounded p-2 h-40 flex items-center justify-center text-gray-500">
              Character
            </div>
          </div>
          
          <div className="w-3/4">
            <div className="grid grid-cols-2 gap-2 h-40">
              <div className={cn(
                "border border-gray-700 rounded p-2 flex items-center justify-center",
                "bg-gray-800 text-gray-400"
              )}>
                <span>Weapon</span>
              </div>
              <div className={cn(
                "border border-gray-700 rounded p-2 flex items-center justify-center",
                "bg-gray-800 text-gray-400"
              )}>
                <span>Heal</span>
              </div>
              <div className={cn(
                "border border-gray-700 rounded p-2 flex items-center justify-center",
                "bg-gray-800 text-gray-400"
              )}>
                <span>Key</span>
              </div>
              <div className={cn(
                "border border-gray-700 rounded p-2 flex items-center justify-center",
                "bg-gray-800 text-gray-400"
              )}>
                <span>Map</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Inventory Grid */}
        <InventoryGrid gridSize={gridSize} items={items} />
        
        {/* Instructions */}
        <div className="mt-4 text-sm text-gray-400">
          <p>Click and drag items to rearrange. Double-click to use or equip.</p>
          <p>Press I or TAB to close inventory.</p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Inventory;
