import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { generateItemId } from "../utils/items";
import { usePlayer } from "./usePlayer";

// Define item types
export type ItemType = "weapon" | "healing" | "ammo" | "key" | "misc";

// Interface for inventory items
export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  size: { width: number; height: number };
  position: { x: number; y: number };
  rotated: boolean;
  image: string;
  properties: {
    damage?: number;
    healAmount?: number;
    ammoCount?: number;
    keyId?: string;
  };
}

// Interface for the inventory state
interface InventoryState {
  gridSize: { width: number; height: number };
  items: InventoryItem[];
  
  // Item management actions
  addItem: (item: Omit<InventoryItem, "id" | "position" | "rotated">) => boolean;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, x: number, y: number) => void;
  rotateItem: (itemId: string) => void;
  useItem: (itemId: string) => void;
  findFreePosition: (width: number, height: number) => { x: number; y: number } | null;
  reset: () => void;
}

// Initial inventory state
const initialState = {
  gridSize: { width: 6, height: 8 }, // Resident Evil 4 style grid
  items: [
    {
      id: "pistol-001",
      name: "Pistol",
      type: "weapon" as ItemType,
      size: { width: 2, height: 1 },
      position: { x: 0, y: 0 },
      rotated: false,
      image: "pistol.png",
      properties: { damage: 25 }
    },
    {
      id: "medkit-001",
      name: "First Aid",
      type: "healing" as ItemType,
      size: { width: 1, height: 1 },
      position: { x: 3, y: 0 },
      rotated: false,
      image: "medkit.png",
      properties: { healAmount: 50 }
    }
  ]
};

export const useInventory = create<InventoryState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    addItem: (item) => {
      const { items, gridSize, findFreePosition } = get();
      
      // Find a free position for the item
      const freePosition = findFreePosition(item.size.width, item.size.height);
      
      if (!freePosition) {
        console.log("No free space in inventory for item:", item.name);
        return false;
      }
      
      // Create new item with ID and position
      const newItem: InventoryItem = {
        ...item,
        id: generateItemId(item.type),
        position: freePosition,
        rotated: false
      };
      
      // Add item to inventory
      set({ items: [...items, newItem] });
      return true;
    },
    
    removeItem: (itemId) => {
      set((state) => ({
        items: state.items.filter(item => item.id !== itemId)
      }));
    },
    
    moveItem: (itemId, x, y) => {
      set((state) => ({
        items: state.items.map(item => 
          item.id === itemId 
            ? { ...item, position: { x, y } } 
            : item
        )
      }));
    },
    
    rotateItem: (itemId) => {
      set((state) => ({
        items: state.items.map(item => {
          if (item.id === itemId) {
            // Check if rotation is possible at current position
            const rotated = !item.rotated;
            const newWidth = rotated ? item.size.height : item.size.width;
            const newHeight = rotated ? item.size.width : item.size.height;
            
            // Check if rotation would exceed grid bounds
            if (item.position.x + newWidth > state.gridSize.width ||
                item.position.y + newHeight > state.gridSize.height) {
              return item; // Can't rotate at current position
            }
            
            // Check for collision with other items
            for (const otherItem of state.items) {
              if (otherItem.id === itemId) continue;
              
              const otherWidth = otherItem.rotated ? otherItem.size.height : otherItem.size.width;
              const otherHeight = otherItem.rotated ? otherItem.size.width : otherItem.size.height;
              
              // Check for overlap
              const overlap = !(
                item.position.x + newWidth <= otherItem.position.x ||
                item.position.y + newHeight <= otherItem.position.y ||
                item.position.x >= otherItem.position.x + otherWidth ||
                item.position.y >= otherItem.position.y + otherHeight
              );
              
              if (overlap) return item; // Can't rotate due to collision
            }
            
            // Rotation is possible
            return { ...item, rotated };
          }
          return item;
        })
      }));
    },
    
    useItem: (itemId) => {
      const item = get().items.find(i => i.id === itemId);
      if (!item) return;
      
      // Handle different item types
      switch (item.type) {
        case "healing":
          if (item.properties.healAmount) {
            // Heal the player
            usePlayer.getState().heal(item.properties.healAmount);
            get().removeItem(itemId);
            console.log(`Used ${item.name} to heal for ${item.properties.healAmount} points`);
          }
          break;
          
        case "weapon":
          // Equip weapon
          usePlayer.getState().equipItem(itemId);
          console.log(`Equipped ${item.name}`);
          break;
          
        case "ammo":
          // Handle ammo usage
          console.log(`Used ${item.name}`);
          break;
          
        case "key":
          // Handle key usage
          console.log(`Selected ${item.name}`);
          break;
          
        default:
          console.log(`Used ${item.name}`);
      }
    },
    
    findFreePosition: (width, height) => {
      const { items, gridSize } = get();
      
      // Try each position in the grid
      for (let y = 0; y < gridSize.height - height + 1; y++) {
        for (let x = 0; x < gridSize.width - width + 1; x++) {
          let positionFree = true;
          
          // Check if this position overlaps with any existing item
          for (const item of items) {
            const itemWidth = item.rotated ? item.size.height : item.size.width;
            const itemHeight = item.rotated ? item.size.width : item.size.height;
            
            // Check for overlap
            const overlap = !(
              x + width <= item.position.x ||
              y + height <= item.position.y ||
              x >= item.position.x + itemWidth ||
              y >= item.position.y + itemHeight
            );
            
            if (overlap) {
              positionFree = false;
              break;
            }
          }
          
          if (positionFree) {
            return { x, y };
          }
        }
      }
      
      return null; // No free position found
    },
    
    reset: () => set(initialState)
  }))
);
