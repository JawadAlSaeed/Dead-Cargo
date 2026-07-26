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
import { ZOMBIE_KINDS, ZOMBIE_SIZE, pickZombieKind } from "./zombieKinds";

const WALL_T = 1; // wall thickness
const DOOR_W = 3; // gap width in the wall for a door
const HALLWAY_LEN = 38;
const HALLWAY_DEPTH = 7;
// Each deck's hallway has 4 slots along its door wall: 3 for rooms, 1
// reserved for the stairwell connecting the two decks.
const ROOM_SLOT_X = [-13.5, -4.5, 4.5];
const STAIRS_SLOT_X = 13.5;
// Where you land in a corridor after coming through a door. The doorways are
// on the corridor's near wall (+z), so this sits just inside it.
const HALL_ENTRY_Z = HALLWAY_DEPTH / 2 - 2.5;

/**
 * One kind of furniture in a room. Sizes are the piece's real footprint in the
 * room's default orientation, long axis along x — a bed placed against a side
 * wall swaps them so it still lies along the wall rather than sticking out.
 */
interface FurnitureSpec {
  type: string;
  w: number;
  h: number;
  /** Fixed count, or an inclusive [min, max] range rolled per run. */
  count: number | [number, number];
  /** Searchable furniture is what holds loot. */
  searchable?: boolean;
  /** Beds, wardrobes and counters belong against a wall, not adrift mid-room. */
  againstWall?: boolean;
}

interface RoomSpec {
  id: string;
  type: RoomType;
  label: string;
  w: number;
  h: number;
  zombies: number;
  furniture: FurnitureSpec[];
}

/**
 * Rooms are furnished as the rooms they claim to be, rather than scattered with
 * interchangeable crates. What is searchable follows from what the room is: you
 * go through the nightstands in the bunkroom and the medicine cabinets in the
 * infirmary, so the ship reads as a place before it reads as a loot table.
 */
const ROOM_SPECS: RoomSpec[] = [
  {
    id: "bedroom",
    type: "bedroom",
    label: "Crew Bedroom",
    w: 14,
    h: 12,
    zombies: 0,
    furniture: [
      { type: "bunk", w: 2, h: 3, count: [2, 3], againstWall: true },
      { type: "nightstand", w: 1, h: 1, count: 2, searchable: true, againstWall: true },
      { type: "wardrobe", w: 2, h: 1, count: 1, searchable: true, againstWall: true },
      { type: "footlocker", w: 2, h: 1, count: 1, searchable: true },
      { type: "chair", w: 1, h: 1, count: 1 }
    ]
  },
  {
    id: "kitchen",
    type: "kitchen",
    label: "Galley",
    w: 16,
    h: 12,
    zombies: 2,
    furniture: [
      { type: "counter", w: 3, h: 1, count: 2, againstWall: true },
      { type: "stove", w: 2, h: 1, count: 1, againstWall: true },
      { type: "fridge", w: 1, h: 1, count: 1, searchable: true, againstWall: true },
      { type: "cabinet", w: 2, h: 1, count: 2, searchable: true, againstWall: true },
      { type: "diningTable", w: 3, h: 2, count: 1 },
      { type: "chair", w: 1, h: 1, count: [1, 2] }
    ]
  },
  {
    id: "medical",
    type: "medical",
    label: "Medical Bay",
    w: 14,
    h: 12,
    zombies: 2,
    furniture: [
      { type: "medBed", w: 2, h: 3, count: 2, againstWall: true },
      { type: "medCabinet", w: 1, h: 1, count: 2, searchable: true, againstWall: true },
      { type: "supplyShelf", w: 2, h: 1, count: 1, searchable: true, againstWall: true },
      { type: "deskSmall", w: 2, h: 1, count: 1 },
      { type: "chair", w: 1, h: 1, count: 1 }
    ]
  },
  {
    id: "cargo",
    type: "cargo",
    label: "Cargo Hold",
    w: 18,
    h: 14,
    zombies: 3,
    furniture: [
      { type: "crate", w: 2, h: 2, count: [3, 4], searchable: true },
      { type: "pallet", w: 3, h: 2, count: 2 },
      { type: "barrel", w: 1, h: 1, count: [2, 3] },
      { type: "shelving", w: 3, h: 1, count: 1, againstWall: true }
    ]
  },
  {
    id: "engine",
    type: "engine",
    label: "Engine Room",
    w: 16,
    h: 14,
    zombies: 3,
    furniture: [
      { type: "engineBlock", w: 4, h: 3, count: 1 },
      { type: "pipes", w: 1, h: 3, count: 2, againstWall: true },
      { type: "workbench", w: 3, h: 1, count: 1, againstWall: true },
      { type: "toolbox", w: 1, h: 1, count: 2, searchable: true },
      { type: "tallLocker", w: 1, h: 1, count: 1, searchable: true, againstWall: true },
      { type: "barrel", w: 1, h: 1, count: 2 }
    ]
  },
  {
    id: "captain",
    type: "captainCabin",
    label: "Captain's Cabin",
    w: 12,
    h: 10,
    zombies: 1,
    furniture: [
      { type: "bunk", w: 2, h: 3, count: 1, againstWall: true },
      { type: "wardrobe", w: 2, h: 1, count: 1, searchable: true, againstWall: true },
      { type: "bookshelf", w: 2, h: 1, count: 1, againstWall: true },
      { type: "chair", w: 1, h: 1, count: 1 }
    ]
  }
];

/** Per-type colour, so a galley reads differently from an engine room. */
const FURNITURE_COLORS: Record<string, string> = {
  bunk: "#4a4038",
  nightstand: "#6b4a2b",
  wardrobe: "#5a4230",
  footlocker: "#705a3a",
  chair: "#46423c",
  counter: "#585d63",
  stove: "#3a3d42",
  fridge: "#8d949c",
  cabinet: "#5d5f66",
  diningTable: "#6a5540",
  medBed: "#cfd6dc",
  medCabinet: "#e2e8ec",
  supplyShelf: "#9aa6ad",
  deskSmall: "#5a4632",
  crate: "#6b4a2b",
  pallet: "#7a6038",
  barrel: "#37424a",
  shelving: "#4d443a",
  engineBlock: "#3c4148",
  pipes: "#4a5158",
  workbench: "#55483a",
  toolbox: "#8a5a20",
  tallLocker: "#4a5b52",
  bookshelf: "#5b4534"
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

/**
 * Random object position inside the room that avoids walls, the door path and
 * other objects. Tries a generous spacing first, then a tighter one before
 * giving up — a crowded room (the captain's cabin, where the desk eats a chunk
 * of the floor) should still fill rather than pile objects on one spot.
 * Returns null when there is genuinely nowhere to put it; the caller skips the
 * object, which beats dropping it in the middle of the room.
 */
/**
 * Whether a piece of this footprint at (x, z) would stand in the doorway. The
 * door sits at x = 0 on the south wall, and the couple of metres in front of it
 * have to stay walkable or a run can be blocked in its own bedroom.
 */
function blocksDoorway(
  x: number,
  z: number,
  footprint: { width: number; height: number },
  roomH: number,
  doorZSign: number
): boolean {
  const nearDoorX = Math.abs(x) < 2.2 + footprint.width / 2;
  const inApproach = z * doorZSign + footprint.height / 2 > roomH / 2 - 3.0;
  return nearDoorX && inApproach;
}

function placeObject(
  w: number,
  h: number,
  footprint: { width: number; height: number },
  existing: RoomObject[],
  doorZSign: number
): { x: number; z: number } | null {
  // [spacing between objects, radius of the clear zone at room center]
  const passes = [
    [0.6, 2.4],
    [0.15, 1.8]
  ];
  // Bounds are the piece's own extent, not a fixed margin: furniture is up to
  // 4 units across now, and a fixed inset let the big pieces hang into walls.
  const limitX = w / 2 - WALL_T / 2 - footprint.width / 2 - 0.1;
  const limitZ = h / 2 - WALL_T / 2 - footprint.height / 2 - 0.1;
  if (limitX <= 0 || limitZ <= 0) return null;

  for (const [gap, centerClear] of passes) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = rand(-limitX, limitX);
      const z = rand(-limitZ, limitZ);
      // Keep the approach to the door walkable — again measured against the
      // piece's real width, so a dining table cannot straddle the entrance.
      if (blocksDoorway(x, z, footprint, h, doorZSign)) continue;
      // Keep the room center clear — it's the player start / a walk-through hub.
      if (Math.hypot(x, z) < centerClear) continue;
      const overlaps = existing.some(
        (o) =>
          Math.abs(o.position.x - x) < (o.size.width + footprint.width) / 2 + gap &&
          Math.abs(o.position.z - z) < (o.size.height + footprint.height) / 2 + gap
      );
      if (!overlaps) return { x, z };
    }
  }
  return null;
}

type WallSide = "north" | "south" | "east" | "west";

/**
 * Place a piece flush against a wall, the way furniture actually sits in a
 * room. Returns the position and the footprint it ended up with: against a side
 * wall the piece is turned a quarter so its long axis runs along the wall
 * instead of jutting into the floor.
 */
function placeAgainstWall(
  w: number,
  h: number,
  footprint: { width: number; height: number },
  existing: RoomObject[],
  doorZSign: number
): { x: number; z: number; size: { width: number; height: number } } | null {
  const sides: WallSide[] = shuffle(["north", "south", "east", "west"]);
  for (const gap of [0.5, 0.12]) {
    for (const side of sides) {
      const vertical = side === "east" || side === "west";
      // Turned a quarter against the side walls so the long edge follows the wall.
      const size = vertical
        ? { width: footprint.height, height: footprint.width }
        : { ...footprint };
      const inset = WALL_T / 2 + 0.08;
      for (let attempt = 0; attempt < 24; attempt++) {
        let x: number;
        let z: number;
        if (vertical) {
          x =
            side === "west"
              ? -w / 2 + inset + size.width / 2
              : w / 2 - inset - size.width / 2;
          z = rand(-h / 2 + inset + size.height / 2, h / 2 - inset - size.height / 2);
        } else {
          z =
            side === "north"
              ? -h / 2 + inset + size.height / 2
              : h / 2 - inset - size.height / 2;
          x = rand(-w / 2 + inset + size.width / 2, w / 2 - inset - size.width / 2);
        }
        // Never block the doorway.
        if (blocksDoorway(x, z, size, h, doorZSign)) continue;
        const overlaps = existing.some(
          (o) =>
            Math.abs(o.position.x - x) < (o.size.width + size.width) / 2 + gap &&
            Math.abs(o.position.z - z) < (o.size.height + size.height) / 2 + gap
        );
        if (!overlaps) return { x, z, size };
      }
    }
  }
  return null;
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
      targetPosition: { x: hallX, z: HALL_ENTRY_Z },
      locked: false
    }
  ];

  const objects: RoomObject[] = [];

  // Fixed furniture goes in before the random loot/decor, so the random
  // placement pass treats it as an obstacle instead of clipping through it.
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

  let objIndex = 0;
  const add = (piece: FurnitureSpec) => {
    const footprint = { width: piece.w, height: piece.h };
    const placed = piece.againstWall
      ? placeAgainstWall(w, h, footprint, objects, doorZSign)
      : (() => {
          const position = placeObject(w, h, footprint, objects, doorZSign);
          return position ? { ...position, size: footprint } : null;
        })();
    // A room that runs out of floor simply gets less furniture — better than
    // stacking two wardrobes on the same square.
    if (!placed) return;
    objects.push({
      id: `${spec.id}-obj-${objIndex++}`,
      type: piece.type,
      position: { x: placed.x, z: placed.z },
      size: placed.size,
      collidable: true,
      color: FURNITURE_COLORS[piece.type] ?? "#4a4a4a",
      interactable: !!piece.searchable,
      containsItem: !!piece.searchable
    });
  };

  // Bigger pieces first: they need the wall runs and the open floor, and a
  // nightstand can always tuck into what is left over.
  const pieces = [...spec.furniture].sort((a, b) => b.w * b.h - a.w * a.h);
  for (const piece of pieces) {
    const [min, max] = Array.isArray(piece.count) ? piece.count : [piece.count, piece.count];
    const n = min + Math.floor(Math.random() * (max - min + 1));
    for (let i = 0; i < n; i++) add(piece);
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
  const doorGaps = [...roomGaps, STAIRS_SLOT_X];

  // The hull is the FAR wall (-z): no doors, just windows onto open water.
  // It has to be the far one to be worth rendering at all — the camera sits
  // at player.z + 7.5 looking back toward -z, so anything past the near wall
  // is behind it. With the hull on the near side the ocean was 30-odd units
  // behind the camera and could never be seen.
  const hullWall: Wall[] = wallSegments(true, -h / 2 + WALL_T / 2, -w / 2, w / 2, []).map(
    (wall) => ({ ...wall, isWindow: true })
  );

  const walls: Wall[] = [
    ...hullWall,
    // Near wall carries the doorways into the rooms and the stairwell.
    ...wallSegments(true, h / 2 - WALL_T / 2, -w / 2, w / 2, doorGaps),
    ...wallSegments(false, -w / 2 + WALL_T / 2, -h / 2, h / 2, []),
    ...wallSegments(false, w / 2 - WALL_T / 2, -h / 2, h / 2, [])
  ];

  const roomDoors: Door[] = roomAssignments.map((a) => ({
    id: `hall-door-${a.spec.id}`,
    position: { x: a.hallX, z: h / 2 - WALL_T / 2 },
    size: { width: DOOR_W, height: 1.6 },
    targetRoomId: a.spec.id,
    targetPosition: { x: 0, z: a.spec.h / 2 - 3 },
    locked: a.spec.type === "captainCabin",
    keyId: a.spec.type === "captainCabin" ? "captain" : undefined
  }));

  const stairsDoor: Door = {
    id: `${hallwayId}-stairs`,
    position: { x: STAIRS_SLOT_X, z: h / 2 - WALL_T / 2 },
    size: { width: DOOR_W, height: 1.6 },
    targetRoomId: stairsTarget.hallwayId,
    targetPosition: { x: stairsTarget.hallX, z: HALL_ENTRY_Z },
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
        if (nearDoor) continue;
        // Not inside a crate or table — movement lets them walk back out, but
        // until they move they read as clipping through the furniture.
        const insideObject = room.objects.some(
          (o) =>
            o.collidable &&
            Math.abs(o.position.x - x) < (o.size.width + ZOMBIE_SIZE) / 2 &&
            Math.abs(o.position.z - z) < (o.size.height + ZOMBIE_SIZE) / 2
        );
        if (!insideObject) break;
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
  // Both placements go through free() rather than assuming a container exists:
  // placeObject can skip an object in a tight room, and a run with no key is
  // unwinnable, so preferred rooms fall back to anywhere on the ship.
  const free = (roomIds: string[]) =>
    roomIds
      .flatMap((id) => rooms[id]?.objects ?? [])
      .filter((o) => o.containsItem && !o.guaranteedItem);
  const anyRoom = Object.keys(rooms);

  const keyCandidates = free(["kitchen", "medical", "cargo", "engine"]);
  pick(keyCandidates.length ? keyCandidates : free(anyRoom)).guaranteedItem = "captainKey";

  const packCandidates = free(["cargo"]);
  pick(packCandidates.length ? packCandidates : free(anyRoom)).guaranteedItem = "backpack";

  return {
    rooms,
    startRoomId: "bedroom",
    zombies: spawnZombies(rooms)
  };
}
