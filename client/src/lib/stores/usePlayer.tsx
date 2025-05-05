import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface PlayerState {
  position: { x: number; y: number; z: number };
  rotation: number;
  health: number;
  maxHealth: number;
  inventory: string[]; // IDs of equipped items
  
  // Actions
  move: (newPosition: { x: number; y: number; z: number }) => void;
  setPosition: (newPosition: { x: number; y: number; z: number }) => void;
  setRotation: (angle: number) => void;
  damage: (amount: number) => void;
  heal: (amount: number) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  reset: () => void;
}

const initialState = {
  position: { x: 0, y: 0.25, z: 0 },
  rotation: 0,
  health: 100,
  maxHealth: 100,
  inventory: []
};

export const usePlayer = create<PlayerState>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    
    move: (newPosition) => set({ position: newPosition }),
    
    setPosition: (newPosition) => set({ position: newPosition }),
    
    setRotation: (angle) => set({ rotation: angle }),
    
    damage: (amount) => set((state) => ({ 
      health: Math.max(0, state.health - amount) 
    })),
    
    heal: (amount) => set((state) => ({ 
      health: Math.min(state.maxHealth, state.health + amount) 
    })),
    
    equipItem: (itemId) => set((state) => ({ 
      inventory: [...state.inventory, itemId] 
    })),
    
    unequipItem: (itemId) => set((state) => ({ 
      inventory: state.inventory.filter(id => id !== itemId) 
    })),
    
    reset: () => set(initialState)
  }))
);
