import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Interface for wall data
export interface Wall {
  position: { x: number; z: number };
  size: { width: number; height: number };
}

// Interface for door data
export interface Door {
  position: { x: number; z: number };
  size: { width: number; height: number };
  targetRoomId: string;
  targetPosition: { x: number; z: number };
  locked: boolean;
}

// Interface for room object data
export interface RoomObject {
  type: string;
  position: { x: number; z: number };
  size: { width: number; height: number };
  collidable: boolean;
  color?: string;
  interactable: boolean;
  containsItem?: boolean;
}

// Interface for room data
export interface Room {
  id: string;
  type: string;
  size: { width: number; height: number };
  walls: Wall[];
  doors: Door[];
  objects: RoomObject[];
  connectedRooms: string[];
  visited: boolean;
}

// Interface for the rooms state
interface RoomsState {
  rooms: Record<string, Room>;
  currentRoom: string;
  captainCabin: { position: { x: number; z: number }; size: { width: number; height: number } } | null;
  
  // Room management actions
  generateRoom: (type: string, size: { width: number; height: number }) => string;
  generateShip: () => void;
  connectRooms: (roomId1: string, roomId2: string) => void;
  setCurrentRoom: (roomId: string) => void;
  getCurrentRoomData: () => Room | null;
  markRoomVisited: (roomId: string) => void;
  reset: () => void;
  
  // Accessors for current room's properties (for convenience)
  walls: Wall[] | null;
  doors: Door[] | null;
  roomObjects: RoomObject[] | null;
}

// Initial rooms state
const initialState = {
  rooms: {},
  currentRoom: "",
  captainCabin: null,
  walls: null,
  doors: null,
  roomObjects: null
};

export const useRooms = create<RoomsState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    generateRoom: (type, size) => {
      const roomId = `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Generate walls around perimeter
      const walls: Wall[] = [
        // Top wall
        { position: { x: 0, z: -size.height/2 + 0.5 }, size: { width: size.width, height: 1 } },
        // Bottom wall
        { position: { x: 0, z: size.height/2 - 0.5 }, size: { width: size.width, height: 1 } },
        // Left wall
        { position: { x: -size.width/2 + 0.5, z: 0 }, size: { width: 1, height: size.height } },
        // Right wall
        { position: { x: size.width/2 - 0.5, z: 0 }, size: { width: 1, height: size.height } }
      ];
      
      // Generate doors (initially none, will be added when connecting rooms)
      const doors: Door[] = [];
      
      // Generate some random objects in the room
      const objects: RoomObject[] = [];
      const objectCount = Math.floor(Math.random() * 5) + 2;
      
      for (let i = 0; i < objectCount; i++) {
        // Random position within the room, away from walls
        const x = (Math.random() - 0.5) * (size.width - 4) + (Math.random() > 0.5 ? 1 : -1);
        const z = (Math.random() - 0.5) * (size.height - 4) + (Math.random() > 0.5 ? 1 : -1);
        
        // Random size
        const width = 0.5 + Math.random() * 1.5;
        const height = 0.5 + Math.random() * 1.5;
        
        // Random object type
        const objectTypes = ["table", "cabinet", "bed", "chair", "crate"];
        const objectType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
        
        // Random color
        const colors = ["#8B4513", "#A0522D", "#CD853F", "#D2B48C", "#5F9EA0", "#4682B4"];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Decide if object is collidable and interactable
        const collidable = Math.random() < 0.7;
        const interactable = Math.random() < 0.3;
        const containsItem = interactable && Math.random() < 0.5;
        
        objects.push({
          type: objectType,
          position: { x, z },
          size: { width, height },
          collidable,
          color,
          interactable,
          containsItem
        });
      }
      
      // Special handling for captain's cabin
      if (type === "captainCabin") {
        // Add special objects for captain's cabin
        objects.push({
          type: "desk",
          position: { x: 0, z: -2 },
          size: { width: 3, height: 1.5 },
          collidable: true,
          color: "#5F5F5F",
          interactable: true
        });
        
        objects.push({
          type: "radio",
          position: { x: 0, z: -2 },
          size: { width: 1, height: 0.5 },
          collidable: false,
          color: "#000000",
          interactable: true
        });
        
        set({ captainCabin: { 
          position: { x: 0, z: -2 }, 
          size: { width: 1, height: 0.5 } 
        }});
      }
      
      // Create the room
      const room: Room = {
        id: roomId,
        type,
        size,
        walls,
        doors,
        objects,
        connectedRooms: [],
        visited: false
      };
      
      // Add the room to the state
      set((state) => ({
        rooms: {
          ...state.rooms,
          [roomId]: room
        }
      }));
      
      return roomId;
    },
    
    generateShip: () => {
      console.log("Generating ship layout...");
      // This is a placeholder function - actual ship generation
      // is handled by the ProcGenRooms component
    },
    
    connectRooms: (roomId1, roomId2) => {
      const { rooms } = get();
      
      // Ensure both rooms exist
      if (!rooms[roomId1] || !rooms[roomId2]) {
        console.error("Cannot connect nonexistent rooms:", roomId1, roomId2);
        return;
      }
      
      // Check if rooms are already connected
      if (rooms[roomId1].connectedRooms.includes(roomId2)) {
        return; // Already connected
      }
      
      // Create door positions
      const room1 = rooms[roomId1];
      const room2 = rooms[roomId2];
      
      // Determine door positions (simplified for demo)
      const doorWidth = 2;
      const doorHeight = 1;
      
      // Place door on a random wall of room1
      const wallIndex = Math.floor(Math.random() * 4);
      let door1Position, door1TargetPosition;
      
      switch (wallIndex) {
        case 0: // Top wall
          door1Position = { 
            x: (Math.random() - 0.5) * (room1.size.width - doorWidth - 2),
            z: -room1.size.height/2 + 0.5 
          };
          door1TargetPosition = { x: door1Position.x, z: -3 };
          break;
        case 1: // Bottom wall
          door1Position = { 
            x: (Math.random() - 0.5) * (room1.size.width - doorWidth - 2),
            z: room1.size.height/2 - 0.5 
          };
          door1TargetPosition = { x: door1Position.x, z: 3 };
          break;
        case 2: // Left wall
          door1Position = { 
            x: -room1.size.width/2 + 0.5,
            z: (Math.random() - 0.5) * (room1.size.height - doorHeight - 2)
          };
          door1TargetPosition = { x: -3, z: door1Position.z };
          break;
        case 3: // Right wall
          door1Position = { 
            x: room1.size.width/2 - 0.5,
            z: (Math.random() - 0.5) * (room1.size.height - doorHeight - 2)
          };
          door1TargetPosition = { x: 3, z: door1Position.z };
          break;
        default:
          door1Position = { x: 0, z: 0 };
          door1TargetPosition = { x: 0, z: 0 };
      }
      
      // Create corresponding door in room2 (opposite side)
      const door2Position = { 
        x: -door1TargetPosition.x, 
        z: -door1TargetPosition.z 
      };
      const door2TargetPosition = { 
        x: -door1Position.x, 
        z: -door1Position.z 
      };
      
      // Create the door objects
      const door1: Door = {
        position: door1Position,
        size: { width: doorWidth, height: doorHeight },
        targetRoomId: roomId2,
        targetPosition: door1TargetPosition,
        locked: Math.random() < 0.2 // 20% chance of door being locked
      };
      
      const door2: Door = {
        position: door2Position,
        size: { width: doorWidth, height: doorHeight },
        targetRoomId: roomId1,
        targetPosition: door2TargetPosition,
        locked: door1.locked // Matching locked state
      };
      
      // Update the rooms with the new doors and connections
      set((state) => ({
        rooms: {
          ...state.rooms,
          [roomId1]: {
            ...state.rooms[roomId1],
            doors: [...state.rooms[roomId1].doors, door1],
            connectedRooms: [...state.rooms[roomId1].connectedRooms, roomId2]
          },
          [roomId2]: {
            ...state.rooms[roomId2],
            doors: [...state.rooms[roomId2].doors, door2],
            connectedRooms: [...state.rooms[roomId2].connectedRooms, roomId1]
          }
        }
      }));
    },
    
    setCurrentRoom: (roomId) => {
      const { rooms } = get();
      
      if (!rooms[roomId]) {
        console.error("Cannot set current room to nonexistent room:", roomId);
        return;
      }
      
      // Update current room and its properties for easy access
      set((state) => ({
        currentRoom: roomId,
        walls: rooms[roomId].walls,
        doors: rooms[roomId].doors,
        roomObjects: rooms[roomId].objects
      }));
      
      // Mark the room as visited
      get().markRoomVisited(roomId);
    },
    
    getCurrentRoomData: () => {
      const { currentRoom, rooms } = get();
      
      if (!currentRoom || !rooms[currentRoom]) {
        return null;
      }
      
      return rooms[currentRoom];
    },
    
    markRoomVisited: (roomId) => {
      const { rooms } = get();
      
      if (!rooms[roomId]) {
        return;
      }
      
      set((state) => ({
        rooms: {
          ...state.rooms,
          [roomId]: {
            ...state.rooms[roomId],
            visited: true
          }
        }
      }));
    },
    
    reset: () => set(initialState)
  }))
);
