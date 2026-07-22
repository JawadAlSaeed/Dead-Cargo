// Procedural ship generation. Produces the whole ship up front as plain data:
// rooms in their own local coordinate spaces, linked by door teleports.
// The Captain's Key is always placed in a searchable container in one of the
// mid-ship rooms, so every run can be finished.

import { Door, Room, RoomObject, RoomType, Ship, Wall, ZombieSpawn } from "./types";
import { isPointInRect } from "./collision";

const WALL_T = 1; // wall thickness
const DOOR_W = 3; // gap width in the wall for a door
const HALLWAY_LEN = 56;
const HALLWAY_DEPTH = 8;

interface RoomSpec {
  id: string;
  type: RoomType;
  label: string;
  w: number;
  h: number;
  hallX: number; // where along the hallway its door sits
  topSide: boolean; // attached to hallway's top (-z) wall
  zombies: number;
  searchables: number;
  decor: number;
}

const ROOM_SPECS: RoomSpec[] = [
  { id: "bedroom", type: "bedroom", label: "Crew Bedroom", w: 14, h: 12, hallX: -22.5, topSide: true, zombies: 0, searchables: 2, decor: 2 },
  { id: "kitchen", type: "kitchen", label: "Galley", w: 16, h: 12, hallX: -13.5, topSide: false, zombies: 2, searchables: 3, decor: 3 },
  { id: "medical", type: "medical", label: "Medical Bay", w: 14, h: 12, hallX: -4.5, topSide: true, zombies: 2, searchables: 3, decor: 2 },
  { id: "cargo", type: "cargo", label: "Cargo Hold", w: 18, h: 14, hallX: 4.5, topSide: false, zombies: 3, searchables: 4, decor: 4 },
  { id: "engine", type: "engine", label: "Engine Room", w: 16, h: 14, hallX: 13.5, topSide: true, zombies: 3, searchables: 3, decor: 3 },
  { id: "captain", type: "captainCabin", label: "Captain's Cabin", w: 12, h: 10, hallX: 22.5, topSide: false, zombies: 1, searchables: 1, decor: 1 }
];

const OBJECT_STYLES: Record<string, { types: string[]; colors: string[] }> = {
  searchable: {
    types: ["crate", "cabinet", "locker", "footlocker"],
    colors: ["#6b4a2b", "#5d5f66", "#4a5b52", "#705a3a"]
  },
  decor: {
    types: ["table", "chair", "barrel", "shelf"],
    colors: ["#3d3a35", "#46423c", "#37424a", "#4d443a"]
  }
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build wall segments along one wall, leaving gaps at the given centers. */
function wallSegments(
  horizontal: boolean,
  fixedCoord: number,
  from: number,
  to: number,
  gapCenters: number[]
): Wall[] {
  const walls: Wall[] = [];
  const edges = [from, ...gapCenters.flatMap((c) => [c - DOOR_W / 2, c + DOOR_W / 2]), to];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i];
    const b = edges[i + 1];
    if (b - a < 0.1) continue;
    const center = (a + b) / 2;
    const len = b - a;
    walls.push(
      horizontal
        ? { position: { x: center, z: fixedCoord }, size: { width: len, height: WALL_T } }
        : { position: { x: fixedCoord, z: center }, size: { width: WALL_T, height: len } }
    );
  }
  return walls;
}

/** Random object position inside the room that avoids walls, the door path and other objects. */
function placeObject(
  w: number,
  h: number,
  size: { width: number; height: number },
  existing: RoomObject[],
  doorZSign: number
): { x: number; z: number } {
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = rand(-w / 2 + 2.2, w / 2 - 2.2);
    const z = rand(-h / 2 + 2.2, h / 2 - 2.2);
    // Keep the strip in front of the door clear so loot can't block the entrance.
    if (Math.abs(x) < 2.2 && z * doorZSign > 0) continue;
    // Keep the room center clear — it's the player start / a walk-through hub.
    if (Math.hypot(x, z) < 2.4) continue;
    const overlaps = existing.some(
      (o) =>
        Math.abs(o.position.x - x) < (o.size.width + size.width) / 2 + 0.6 &&
        Math.abs(o.position.z - z) < (o.size.height + size.height) / 2 + 0.6
    );
    if (!overlaps) return { x, z };
  }
  return { x: 0, z: 0 };
}

function buildRoom(spec: RoomSpec): Room {
  const { w, h } = spec;
  // The room's door back to the hallway sits centered on the wall that faces it:
  // top-attached rooms return through their bottom wall, and vice versa.
  const doorZSign = spec.topSide ? 1 : -1;
  const doorWallZ = doorZSign * (h / 2 - WALL_T / 2);

  const walls: Wall[] = [
    // Wall containing the door gap
    ...wallSegments(true, doorWallZ, -w / 2, w / 2, [0]),
    // Opposite solid wall
    ...wallSegments(true, -doorWallZ, -w / 2, w / 2, []),
    // Side walls
    ...wallSegments(false, -w / 2 + WALL_T / 2, -h / 2, h / 2, []),
    ...wallSegments(false, w / 2 - WALL_T / 2, -h / 2, h / 2, [])
  ];

  const doors: Door[] = [
    {
      id: `${spec.id}-door-hall`,
      position: { x: 0, z: doorWallZ },
      size: { width: DOOR_W, height: 1.6 },
      targetRoomId: "hallway",
      targetPosition: { x: spec.hallX, z: spec.topSide ? -1.0 : 1.0 },
      locked: false
    }
  ];

  const objects: RoomObject[] = [];
  let objIndex = 0;
  const add = (kind: "searchable" | "decor") => {
    const style = OBJECT_STYLES[kind];
    const size = { width: rand(1, 1.8), height: rand(1, 1.8) };
    const position = placeObject(w, h, size, objects, doorZSign);
    objects.push({
      id: `${spec.id}-obj-${objIndex++}`,
      type: pick(style.types),
      position,
      size,
      collidable: true,
      color: pick(style.colors),
      interactable: kind === "searchable",
      containsItem: kind === "searchable"
    });
  };
  for (let i = 0; i < spec.searchables; i++) add("searchable");
  for (let i = 0; i < spec.decor; i++) add("decor");

  if (spec.type === "captainCabin") {
    // The radio on the captain's desk is the escape objective.
    objects.push({
      id: `${spec.id}-desk`,
      type: "desk",
      position: { x: 0, z: -doorZSign * (h / 2 - 2.5) },
      size: { width: 3, height: 1.4 },
      collidable: true,
      color: "#5a4632",
      interactable: false,
      containsItem: false
    });
    objects.push({
      id: `${spec.id}-radio`,
      type: "radio",
      position: { x: 0, z: -doorZSign * (h / 2 - 1.6) },
      size: { width: 1, height: 0.6 },
      collidable: false,
      color: "#101418",
      interactable: true,
      containsItem: false
    });
  }

  return {
    id: spec.id,
    type: spec.type,
    label: spec.label,
    size: { width: w, height: h },
    walls,
    doors,
    objects
  };
}

function buildHallway(): Room {
  const w = HALLWAY_LEN;
  const h = HALLWAY_DEPTH;
  const topGaps = ROOM_SPECS.filter((s) => s.topSide).map((s) => s.hallX);
  const bottomGaps = ROOM_SPECS.filter((s) => !s.topSide).map((s) => s.hallX);

  const walls: Wall[] = [
    ...wallSegments(true, -h / 2 + WALL_T / 2, -w / 2, w / 2, topGaps),
    ...wallSegments(true, h / 2 - WALL_T / 2, -w / 2, w / 2, bottomGaps),
    ...wallSegments(false, -w / 2 + WALL_T / 2, -h / 2, h / 2, []),
    ...wallSegments(false, w / 2 - WALL_T / 2, -h / 2, h / 2, [])
  ];

  const doors: Door[] = ROOM_SPECS.map((s) => ({
    id: `hall-door-${s.id}`,
    position: { x: s.hallX, z: s.topSide ? -h / 2 + WALL_T / 2 : h / 2 - WALL_T / 2 },
    size: { width: DOOR_W, height: 1.6 },
    targetRoomId: s.id,
    targetPosition: { x: 0, z: s.topSide ? s.h / 2 - 3 : -s.h / 2 + 3 },
    locked: s.type === "captainCabin",
    keyId: s.type === "captainCabin" ? "captain" : undefined
  }));

  // Emergency lights and grime along the corridor.
  const objects: RoomObject[] = [];
  for (let x = -w / 2 + 6; x < w / 2; x += 8) {
    objects.push({
      id: `hall-light-${Math.round(x)}`,
      type: "light",
      position: { x, z: 0 },
      size: { width: 0.4, height: 0.4 },
      collidable: false,
      color: "#ffdf8a",
      interactable: false,
      containsItem: false
    });
  }
  for (let i = 0; i < 6; i++) {
    objects.push({
      id: `hall-stain-${i}`,
      type: "bloodstain",
      position: { x: rand(-w / 2 + 3, w / 2 - 3), z: rand(-h / 2 + 1.8, h / 2 - 1.8) },
      size: { width: rand(0.6, 1.6), height: rand(0.6, 1.6) },
      collidable: false,
      color: "#5c1210",
      interactable: false,
      containsItem: false
    });
  }

  return {
    id: "hallway",
    type: "hallway",
    label: "Main Corridor",
    size: { width: w, height: h },
    walls,
    doors,
    objects
  };
}

function spawnZombies(rooms: Record<string, Room>): ZombieSpawn[] {
  const zombies: ZombieSpawn[] = [];
  let n = 0;
  const addForRoom = (roomId: string, count: number) => {
    const room = rooms[roomId];
    for (let i = 0; i < count; i++) {
      let x = 0;
      let z = 0;
      for (let attempt = 0; attempt < 30; attempt++) {
        x = rand(-room.size.width / 2 + 2, room.size.width / 2 - 2);
        z = rand(-room.size.height / 2 + 2, room.size.height / 2 - 2);
        // Not right on top of a door spawn point
        const nearDoor = room.doors.some((d) =>
          isPointInRect(x, z, d.targetPosition.x, d.targetPosition.z, 6, 6)
        );
        if (!nearDoor) break;
      }
      zombies.push({
        id: `z-${n++}`,
        roomId,
        position: { x, z },
        speed: rand(1.2, 2.0),
        hp: 50
      });
    }
  };
  for (const spec of ROOM_SPECS) addForRoom(spec.id, spec.zombies);
  addForRoom("hallway", 3);
  return zombies;
}

export function generateShip(): Ship {
  const rooms: Record<string, Room> = {};
  for (const spec of ROOM_SPECS) {
    rooms[spec.id] = buildRoom(spec);
  }
  rooms["hallway"] = buildHallway();

  // Guarantee the Captain's Key in one searchable container in a mid-ship room,
  // and a Backpack upgrade somewhere in the cargo hold.
  const keyRoomId = pick(["kitchen", "medical", "cargo", "engine"]);
  const candidates = rooms[keyRoomId].objects.filter((o) => o.containsItem);
  pick(candidates).guaranteedItem = "captainKey";
  const cargoCandidates = rooms["cargo"].objects.filter(
    (o) => o.containsItem && !o.guaranteedItem
  );
  pick(cargoCandidates).guaranteedItem = "backpack";

  return {
    rooms,
    startRoomId: "bedroom",
    zombies: spawnZombies(rooms)
  };
}
