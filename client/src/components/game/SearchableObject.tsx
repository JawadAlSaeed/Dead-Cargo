import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useInventory } from "../../lib/stores/useInventory";
import { generateRandomItem } from "../../lib/utils/items";
import { cn } from "../../lib/utils";

interface SearchableObjectProps {
  objectType: string;
  onClose: () => void;
}

const SearchableObject = ({ objectType, onClose }: SearchableObjectProps) => {
  const [searchProgress, setSearchProgress] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [searchComplete, setSearchComplete] = useState(false);
  const { addItem } = useInventory();

  // Generate random loot based on object type
  useEffect(() => {
    // Different containers have different potential loot
    const lootCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const newItems = [];
    
    for (let i = 0; i < lootCount; i++) {
      let itemType;
      
      // Different containers have different loot probabilities
      switch (objectType) {
        case "cabinet":
          itemType = Math.random() < 0.7 ? "healing" : "ammo";
          break;
        case "desk":
          itemType = Math.random() < 0.5 ? "key" : "ammo";
          break;
        case "crate":
          itemType = Math.random() < 0.6 ? "weapon" : "ammo";
          break;
        default:
          itemType = undefined; // random item
      }
      
      newItems.push(generateRandomItem(itemType));
    }
    
    setItems(newItems);
  }, [objectType]);

  // Handle search progress
  useEffect(() => {
    if (isSearching && searchProgress < 100) {
      const interval = setInterval(() => {
        setSearchProgress(prev => {
          const newProgress = prev + 2; // 2% increase per 100ms = 5 seconds total
          if (newProgress >= 100) {
            setIsSearching(false);
            setSearchComplete(true);
            clearInterval(interval);
          }
          return newProgress;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isSearching, searchProgress]);

  // Start searching
  const handleStartSearch = () => {
    setIsSearching(true);
  };

  // Take an item
  const handleTakeItem = (index: number) => {
    const item = items[index];
    const result = addItem(item);
    
    if (result) {
      // Remove the item from the container
      setItems(prev => prev.filter((_, i) => i !== index));
    } else {
      alert("Not enough space in inventory!");
    }
  };

  // Take all items
  const handleTakeAll = () => {
    const remainingItems = [...items];
    
    // Try to add each item to inventory
    for (let i = remainingItems.length - 1; i >= 0; i--) {
      const result = addItem(remainingItems[i]);
      if (result) {
        remainingItems.splice(i, 1);
      }
    }
    
    setItems(remainingItems);
    
    if (remainingItems.length > 0) {
      alert("Could not take all items. Not enough space in inventory!");
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-md w-full">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-200">
            {objectType.charAt(0).toUpperCase() + objectType.slice(1)}
          </h2>
          <button 
            className="text-gray-400 hover:text-white"
            onClick={onClose}
          >
            Close [ESC]
          </button>
        </div>
        
        {!searchComplete ? (
          <div className="mb-4">
            <p className="text-gray-300 mb-2">
              {isSearching 
                ? "Searching..." 
                : "Press button to search the container"}
            </p>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-100"
                style={{ width: `${searchProgress}%` }}
              ></div>
            </div>
            
            {!isSearching && (
              <button
                className="w-full py-2 bg-blue-700 text-white rounded-md hover:bg-blue-600 transition-colors"
                onClick={handleStartSearch}
              >
                Search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Container contents */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold text-gray-300">Contents</h3>
                {items.length > 0 && (
                  <button 
                    className="text-blue-400 text-sm hover:text-blue-300"
                    onClick={handleTakeAll}
                  >
                    Take All
                  </button>
                )}
              </div>
              
              {items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between bg-gray-800 p-2 rounded"
                    >
                      <div>
                        <div className="text-white font-medium">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.type}</div>
                      </div>
                      <button
                        className="px-2 py-1 bg-blue-700 text-sm text-white rounded hover:bg-blue-600"
                        onClick={() => handleTakeItem(index)}
                      >
                        Take
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic text-center p-6">
                  Container is empty
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SearchableObject;