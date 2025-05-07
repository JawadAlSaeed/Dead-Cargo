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

// Room types enum
export type RoomType = "hallway" | "standard" | "captainCabin" | "bedroom" | "kitchen" | "cargo" | "medical" | "engine";

// Interface for the rooms state
interface RoomsState {
  rooms: Record<string, Room>;
  currentRoom: string;
  captainCabin: { position: { x: number; z: number }; size: { width: number; height: number } } | null;
  hallwayId: string | null;
  
  // Room management actions
  generateRoom: (type: RoomType, size: { width: number; height: number }) => string;
  generateHallway: (length: number, width: number) => string;
  generateShip: () => void;
  connectRooms: (roomId1: string, roomId2: string, position?: { x: number; z: number }) => void;
  connectRoomToHallway: (roomId: string, position: number) => void;
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
  hallwayId: null,
  walls: null,
  doors: null,
  roomObjects: null
};

export const useRooms = create<RoomsState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    generateRoom: (type, size) => {
      const roomId = `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Generate walls around perimeter with gaps for doors
      // We'll create multiple wall segments instead of full walls to allow for doors later
      const doorWidth = 3; // Space we'll reserve for doors
      const wallSegments: Wall[] = [];
      
      // Top wall (in two segments with space for a door in the middle)
      const topSegmentWidth = (size.width - doorWidth) / 2;
      wallSegments.push(
        { position: { x: -size.width/4 - doorWidth/4, z: -size.height/2 + 0.5 }, size: { width: topSegmentWidth, height: 1 } },
        { position: { x: size.width/4 + doorWidth/4, z: -size.height/2 + 0.5 }, size: { width: topSegmentWidth, height: 1 } }
      );
      
      // Bottom wall (in two segments with space for a door in the middle)
      wallSegments.push(
        { position: { x: -size.width/4 - doorWidth/4, z: size.height/2 - 0.5 }, size: { width: topSegmentWidth, height: 1 } },
        { position: { x: size.width/4 + doorWidth/4, z: size.height/2 - 0.5 }, size: { width: topSegmentWidth, height: 1 } }
      );
      
      // Left wall (full)
      wallSegments.push(
        { position: { x: -size.width/2 + 0.5, z: 0 }, size: { width: 1, height: size.height } }
      );
      
      // Right wall (full)
      wallSegments.push(
        { position: { x: size.width/2 - 0.5, z: 0 }, size: { width: 1, height: size.height } }
      );
      
      const walls: Wall[] = wallSegments;
      
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
    
// This code has been replaced by the enhanced connectRooms method below
    
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
    
    generateHallway: (length, width) => {
      const hallwayId = `hallway-${Date.now()}`;
      
      // Create a long hallway
      const hallwayWidth = width;
      const hallwayLength = length;
      
      // Generate walls along the length of the hallway with gaps for doors
      const walls: Wall[] = [];
      const doorGapSize = 4;
      const wallSegmentLength = 10;
      
      // Create segments along the top wall
      for (let x = -hallwayLength/2 + wallSegmentLength/2; x < hallwayLength/2; x += wallSegmentLength + doorGapSize) {
        walls.push({
          position: { x, z: -hallwayWidth/2 + 0.5 },
          size: { width: wallSegmentLength, height: 1 }
        });
      }
      
      // Create segments along the bottom wall
      for (let x = -hallwayLength/2 + wallSegmentLength/2; x < hallwayLength/2; x += wallSegmentLength + doorGapSize) {
        walls.push({
          position: { x, z: hallwayWidth/2 - 0.5 },
          size: { width: wallSegmentLength, height: 1 }
        });
      }
      
      // Generate doors (initially none, will be added when connecting rooms)
      const doors: Door[] = [];
      
      // Generate some decor objects in the hallway
      const objects: RoomObject[] = [];
      
      // Add wall lights every 5 units
      for (let x = -hallwayLength/2 + 5; x < hallwayLength/2; x += 5) {
        objects.push({
          type: "light",
          position: { x, z: -hallwayWidth/2 + 0.7 },
          size: { width: 0.5, height: 0.2 },
          collidable: false,
          color: "#FFFF99",
          interactable: false
        });
        
        objects.push({
          type: "light",
          position: { x, z: hallwayWidth/2 - 0.7 },
          size: { width: 0.5, height: 0.2 },
          collidable: false,
          color: "#FFFF99",
          interactable: false
        });
      }
      
      // Add occasional debris or objects
      for (let i = 0; i < Math.floor(length / 10); i++) {
        const x = (Math.random() - 0.5) * (hallwayLength - 4);
        const z = (Math.random() - 0.5) * (hallwayWidth - 2);
        
        objects.push({
          type: Math.random() > 0.5 ? "debris" : "bloodstain",
          position: { x, z },
          size: { width: 0.5 + Math.random(), height: 0.5 + Math.random() },
          collidable: false,
          color: Math.random() > 0.5 ? "#A52A2A" : "#8B0000",
          interactable: false
        });
      }
      
      // Create the hallway room
      const hallway: Room = {
        id: hallwayId,
        type: "hallway",
        size: { width: hallwayLength, height: hallwayWidth },
        walls,
        doors,
        objects,
        connectedRooms: [],
        visited: false
      };
      
      // Add the hallway to the state
      set((state) => ({
        rooms: {
          ...state.rooms,
          [hallwayId]: hallway
        },
        hallwayId
      }));
      
      return hallwayId;
    },
    
    connectRoomToHallway: (roomId, position) => {
      const { rooms, hallwayId } = get();
      
      if (!hallwayId || !rooms[hallwayId] || !rooms[roomId]) {
        console.error("Cannot connect room to hallway: missing hallway or room");
        return;
      }
      
      const hallway = rooms[hallwayId];
      const room = rooms[roomId];
      
      // Check if already connected
      if (room.connectedRooms.includes(hallwayId)) {
        return;
      }
      
      // Determine door positions
      const doorWidth = 2;
      const doorHeight = 1;
      const hallwayLength = hallway.size.width;
      const hallwayWidth = hallway.size.height;
      
      // Calculate the position along the hallway (clamped to hallway length)
      const hallwayX = Math.max(-hallwayLength/2 + 5, Math.min(hallwayLength/2 - 5, position));
      
      // Randomly choose top or bottom wall of hallway for the door
      const isTopWall = Math.random() > 0.5;
      const hallwayZ = isTopWall ? -hallwayWidth/2 + 0.5 : hallwayWidth/2 - 0.5;
      
      // Hallway door position and target
      const hallwayDoorPosition = { x: hallwayX, z: hallwayZ };
      const hallwayDoorTarget = { 
        x: 0, 
        z: isTopWall ? -room.size.height/2 + 3 : room.size.height/2 - 3 
      };
      
      // Room door position (centered on the corresponding wall)
      const roomDoorPosition = { 
        x: 0, 
        z: isTopWall ? room.size.height/2 - 0.5 : -room.size.height/2 + 0.5 
      };
      const roomDoorTarget = { x: hallwayX, z: 0 };
      
      // Create door objects
      const hallwayDoor: Door = {
        position: hallwayDoorPosition,
        size: { width: doorWidth, height: doorHeight },
        targetRoomId: roomId,
        targetPosition: hallwayDoorTarget,
        locked: Math.random() < 0.1 // 10% chance of locked door
      };
      
      const roomDoor: Door = {
        position: roomDoorPosition,
        size: { width: doorWidth, height: doorHeight },
        targetRoomId: hallwayId,
        targetPosition: roomDoorTarget,
        locked: hallwayDoor.locked // Match locked state
      };
      
      // Update both rooms with doors and connections
      set((state) => ({
        rooms: {
          ...state.rooms,
          [hallwayId]: {
            ...state.rooms[hallwayId],
            doors: [...state.rooms[hallwayId].doors, hallwayDoor],
            connectedRooms: [...state.rooms[hallwayId].connectedRooms, roomId]
          },
          [roomId]: {
            ...state.rooms[roomId],
            doors: [...state.rooms[roomId].doors, roomDoor],
            connectedRooms: [...state.rooms[roomId].connectedRooms, hallwayId]
          }
        }
      }));
    },
    
    // Default room connection method updated to support positioning
    connectRooms: (roomId1, roomId2, position) => {
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
            x: position?.x || (Math.random() - 0.5) * (room1.size.width - doorWidth - 2),
            z: -room1.size.height/2 + 0.5 
          };
          door1TargetPosition = { x: door1Position.x, z: -3 };
          break;
        case 1: // Bottom wall
          door1Position = { 
            x: position?.x || (Math.random() - 0.5) * (room1.size.width - doorWidth - 2),
            z: room1.size.height/2 - 0.5 
          };
          door1TargetPosition = { x: door1Position.x, z: 3 };
          break;
        case 2: // Left wall
          door1Position = { 
            x: -room1.size.width/2 + 0.5,
            z: position?.z || (Math.random() - 0.5) * (room1.size.height - doorHeight - 2)
          };
          door1TargetPosition = { x: -3, z: door1Position.z };
          break;
        case 3: // Right wall
          door1Position = { 
            x: room1.size.width/2 - 0.5,
            z: position?.z || (Math.random() - 0.5) * (room1.size.height - doorHeight - 2)
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
    
    reset: () => set(initialState)
  }))
);
