import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Interface for zombie data
export interface Zombie {
  id: string;
  roomId: string;
  position: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  speed: number;
  attackCooldown: number;
  attackRange: number;
  damage: number;
  isTough: boolean;
}

// Interface for the zombies state
interface ZombiesState {
  zombies: Zombie[];
  
  // Zombie management actions
  addZombie: (zombie: Omit<Zombie, "id">) => string;
  removeZombie: (zombieId: string) => void;
  updateZombiePosition: (zombieId: string, position: { x: number; y: number; z: number }) => void;
  damageZombie: (zombieId: string, amount: number) => void;
  decrementZombieAttackCooldown: (zombieId: string, amount: number) => void;
  resetZombieAttackCooldown: (zombieId: string) => void;
  spawnZombies: (roomId: string, count: number, tough?: boolean) => void;
  reset: () => void;
}

// Initial zombies state
const initialState = {
  zombies: []
};

export const useZombies = create<ZombiesState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    addZombie: (zombie) => {
      const id = `zombie-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      set((state) => ({
        zombies: [...state.zombies, { ...zombie, id }]
      }));
      return id;
    },
    
    removeZombie: (zombieId) => {
      set((state) => ({
        zombies: state.zombies.filter(zombie => zombie.id !== zombieId)
      }));
    },
    
    updateZombiePosition: (zombieId, position) => {
      set((state) => ({
        zombies: state.zombies.map(zombie => 
          zombie.id === zombieId 
            ? { ...zombie, position } 
            : zombie
        )
      }));
    },
    
    damageZombie: (zombieId, amount) => {
      set((state) => ({
        zombies: state.zombies.map(zombie => {
          if (zombie.id === zombieId) {
            const newHealth = Math.max(0, zombie.health - amount);
            
            // If zombie health drops to 0, mark for removal
            if (newHealth <= 0) {
              console.log(`Zombie ${zombieId} killed`);
              // Remove zombie after a short delay
              setTimeout(() => {
                get().removeZombie(zombieId);
              }, 1000);
            }
            
            return { ...zombie, health: newHealth };
          }
          return zombie;
        })
      }));
    },
    
    decrementZombieAttackCooldown: (zombieId, amount) => {
      set((state) => ({
        zombies: state.zombies.map(zombie => 
          zombie.id === zombieId 
            ? { ...zombie, attackCooldown: Math.max(0, zombie.attackCooldown - amount) } 
            : zombie
        )
      }));
    },
    
    resetZombieAttackCooldown: (zombieId) => {
      set((state) => ({
        zombies: state.zombies.map(zombie => 
          zombie.id === zombieId 
            ? { ...zombie, attackCooldown: 1.5 } // 1.5 seconds cooldown
            : zombie
        )
      }));
    },
    
    spawnZombies: (roomId, count, tough = false) => {
      const newZombies: Omit<Zombie, "id">[] = [];
      
      for (let i = 0; i < count; i++) {
        // Create random position in the room
        const x = (Math.random() - 0.5) * 8;
        const z = (Math.random() - 0.5) * 8;
        
        // Determine zombie type
        const isTough = tough || Math.random() < 0.2; // 20% chance of tough zombie
        
        // Create zombie
        newZombies.push({
          roomId,
          position: { x, y: 0.25, z },
          health: isTough ? 100 : 50,
          maxHealth: isTough ? 100 : 50,
          speed: isTough ? 1.0 : 1.5,
          attackCooldown: 0,
          attackRange: 1.2,
          damage: isTough ? 20 : 10,
          isTough
        });
      }
      
      // Add all zombies to the state
      set((state) => ({
        zombies: [
          ...state.zombies,
          ...newZombies.map(zombie => ({
            ...zombie,
            id: `zombie-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          }))
        ]
      }));
    },
    
    reset: () => set(initialState)
  }))
);
