// Axis-separated movement with AABB collision response, shared by the player
// and zombies. Built on the salvaged collision utilities.

import { Collidable, checkCollision } from "./collision";
import { Room } from "./types";

/** Static colliders for a room: walls plus collidable objects. */
export function roomColliders(room: Room): Collidable[] {
  const colliders: Collidable[] = room.walls.map((w) => ({
    x: w.position.x,
    z: w.position.z,
    width: w.size.width,
    height: w.size.height
  }));
  for (const o of room.objects) {
    if (o.collidable) {
      colliders.push({ x: o.position.x, z: o.position.z, width: o.size.width, height: o.size.height });
    }
  }
  return colliders;
}

/**
 * Move an entity by (dx, dz), sliding along obstacles. Each axis is applied
 * and validated separately so walls can be slid along.
 */
export function moveWithCollision(
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  size: number,
  colliders: Collidable[]
): void {
  // Colliders we already overlap (bad spawn, shove) never block — otherwise
  // the entity would be permanently stuck inside them.
  const startBox: Collidable = { x: pos.x, z: pos.z, width: size, height: size };
  const blocking = colliders.filter((c) => !checkCollision(startBox, c));

  const box: Collidable = { x: pos.x + dx, z: pos.z, width: size, height: size };
  if (!blocking.some((c) => checkCollision(box, c))) {
    pos.x += dx;
  }
  box.x = pos.x;
  box.z = pos.z + dz;
  if (!blocking.some((c) => checkCollision(box, c))) {
    pos.z += dz;
  }
}
