// Procedural ship generation. Produces the whole ship up front as plain data:
// rooms in their own local coordinate spaces, linked by door teleports.
// The Captain's Key is always placed in a searchable container in one of the
// mid-ship rooms, so every run can be finished.
//
// The ship has two decks. Each run, the six rooms are shuffled and split
// three-and-three across the two decks' hallways, which are linked by a
// stairwell — so both which rooms neighbor each other and which deck the
// start/escape rooms land on vary run to run.

import { Door, Room, RoomObject, RoomType, Ship, Wall, ZombieSpawn } from "./types";
import { isPointInRect } from "./collision";
import { ZOMBIE_KINDS, pickZombieKind } from "./zombieKinds";

const WALL_T = 1; // wall thickness
const DOOR_W = 3; // gap width in the wall for a door
const HALLWAY_LEN = 38;
const HALLWAY_DEPTH = 7;
// Each deck's hallway has 4 slots along its door wall: 3 for rooms, 1
// reserved for the stairwell connecting the two decks.
const ROOM_SLOT_X = [-13.5, -4.5, 4.5];
const STAIRS_SLOT_X = 13.5;

interface RoomSpec {
  id: string;
  type: RoomType;
  label: string;
  w: number;
  h: number;
  zombies: number;
  searchables: number;
  decor: number;
}

const ROOM_SPECS: RoomSpec[] = [
  { id: "bedroom", type: "bedroom", label: "Crew Bedroom", w: 14, h: 12, zombies: 0, searchables: 2, decor: 2 },
  { id: "kitchen", type: "kitchen", label: "Galley", w: 16, h: 12, zombies: 2, searchables: 3, decor: 3 },
  { id: "medical", type: "medical", label: "Medical Bay", w: 14, h: 12, zombies: 2, searchables: 3, decor: 2 },
  { id: "cargo", type: "cargo", label: "Cargo Hold", w: 18, h: 14, zombies: 3, searchables: 4, decor: 4 },
  { id: "engine", type: "engine", label: "Engine Room", w: 16, h: 14, zombies: 3, searchables: 3, decor: 3 },
  { id: "captain", type: "captainCabin", label: "Captain's Cabin", w: 12, h: 10, zombies: 1, searchables: 1, decor: 1 }
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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

function buildRoom(spec: RoomSpec, hallX: number, hallwayId: string, floor: number): Room {
  const { w, h } = spec;
  // Every room's door sits on its south wall, facing the hallway that runs
  // along the ship's spine just outside it.
  const doorZSign = 1;
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
      targetRoomId: hallwayId,
      targetPosition: { x: hallX, z: -1.0 },
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
    floor,
    size: { width: w, height: h },
    walls,
    doors,
    objects
  };
}

interface RoomAssignment {
  spec: RoomSpec;
  hallX: number;
}

function buildHallway(
  floor: number,
  hallwayId: string,
  roomAssignments: RoomAssignment[],
  stairsTarget: { hallwayId: string; hallX: number }
): Room {
  const w = HALLWAY_LEN;
  const h = HALLWAY_DEPTH;
  const roomGaps = roomAssignments.map((a) => a.hallX);
  const northGaps = [...roomGaps, STAIRS_SLOT_X];

  // South wall is the ship's hull: no doors, just windows onto open water.
  const hullWall: Wall[] = wallSegments(true, h / 2 - WALL_T / 2, -w / 2, w / 2, []).map(
    (wall) => ({ ...wall, isWindow: true })
  );

  const walls: Wall[] = [
    ...wallSegments(true, -h / 2 + WALL_T / 2, -w / 2, w / 2, northGaps),
    ...hullWall,
    ...wallSegments(false, -w / 2 + WALL_T / 2, -h / 2, h / 2, []),
    ...wallSegments(false, w / 2 - WALL_T / 2, -h / 2, h / 2, [])
  ];

  const roomDoors: Door[] = roomAssignments.map((a) => ({
    id: `hall-door-${a.spec.id}`,
    position: { x: a.hallX, z: -h / 2 + WALL_T / 2 },
    size: { width: DOOR_W, height: 1.6 },
    targetRoomId: a.spec.id,
    targetPosition: { x: 0, z: a.spec.h / 2 - 3 },
    locked: a.spec.type === "captainCabin",
    keyId: a.spec.type === "captainCabin" ? "captain" : undefined
  }));

  const stairsDoor: Door = {
    id: `${hallwayId}-stairs`,
    position: { x: STAIRS_SLOT_X, z: -h / 2 + WALL_T / 2 },
    size: { width: DOOR_W, height: 1.6 },
    targetRoomId: stairsTarget.hallwayId,
    targetPosition: { x: stairsTarget.hallX, z: -1.0 },
    locked: false,
    kind: "stairs"
  };

  const doors: Door[] = [...roomDoors, stairsDoor];

  // Emergency lights and grime along the corridor.
  const objects: RoomObject[] = [];
  for (let x = -w / 2 + 6; x < w / 2; x += 8) {
    objects.push({
      id: `hall-light-${floor}-${Math.round(x)}`,
      type: "light",
      position: { x, z: 0 },
      size: { width: 0.4, height: 0.4 },
      collidable: false,
      color: "#ffdf8a",
      interactable: false,
      containsItem: false
    });
  }
  for (let i = 0; i < 5; i++) {
    objects.push({
      id: `hall-stain-${floor}-${i}`,
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
    id: hallwayId,
    type: "hallway",
    label: floor === 0 ? "Lower Deck Corridor" : "Upper Deck Corridor",
    floor,
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
      const kind = pickZombieKind();
      const cfg = ZOMBIE_KINDS[kind];
      zombies.push({
        id: `z-${n++}`,
        roomId,
        kind,
        position: { x, z },
        speed: rand(cfg.speedMin, cfg.speedMax),
        hp: cfg.hp
      });
    }
  };
  for (const spec of ROOM_SPECS) addForRoom(spec.id, spec.zombies);
  addForRoom("hallway-0", 2);
  addForRoom("hallway-1", 2);
  return zombies;
}

export function generateShip(): Ship {
  const shuffled = shuffle(ROOM_SPECS);
  const floorSpecs = [shuffled.slice(0, 3), shuffled.slice(3, 6)];
  const floorAssignments: RoomAssignment[][] = floorSpecs.map((specs) =>
    specs.map((spec, i) => ({ spec, hallX: ROOM_SLOT_X[i] }))
  );

  const rooms: Record<string, Room> = {};
  const hallwayIds = ["hallway-0", "hallway-1"];
  for (let floor = 0; floor < 2; floor++) {
    for (const a of floorAssignments[floor]) {
      rooms[a.spec.id] = buildRoom(a.spec, a.hallX, hallwayIds[floor], floor);
    }
  }
  rooms["hallway-0"] = buildHallway(0, "hallway-0", floorAssignments[0], {
    hallwayId: "hallway-1",
    hallX: STAIRS_SLOT_X
  });
  rooms["hallway-1"] = buildHallway(1, "hallway-1", floorAssignments[1], {
    hallwayId: "hallway-0",
    hallX: STAIRS_SLOT_X
  });

  // Guarantee the Captain's Key in one searchable container in a mid-ship room,
  // and a Backpack upgrade somewhere in the cargo hold — both exist on whichever
  // deck they landed on this run.
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
