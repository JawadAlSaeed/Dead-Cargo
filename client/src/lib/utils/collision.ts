// Interface for collidable objects
interface Collidable {
  x: number;
  z: number;
  width: number;
  height: number;
}

/**
 * Checks for collision between two axis-aligned bounding boxes
 * using AABB collision detection
 */
export function checkCollision(obj1: Collidable, obj2: Collidable): boolean {
  // Calculate the min and max bounds for each object
  const obj1MinX = obj1.x - obj1.width / 2;
  const obj1MaxX = obj1.x + obj1.width / 2;
  const obj1MinZ = obj1.z - obj1.height / 2;
  const obj1MaxZ = obj1.z + obj1.height / 2;
  
  const obj2MinX = obj2.x - obj2.width / 2;
  const obj2MaxX = obj2.x + obj2.width / 2;
  const obj2MinZ = obj2.z - obj2.height / 2;
  const obj2MaxZ = obj2.z + obj2.height / 2;
  
  // Check for overlap on both axes
  const overlapX = obj1MinX < obj2MaxX && obj1MaxX > obj2MinX;
  const overlapZ = obj1MinZ < obj2MaxZ && obj1MaxZ > obj2MinZ;
  
  // Collision occurred if both axes overlap
  return overlapX && overlapZ;
}

/**
 * Calculates the collision response (position adjustment) to resolve a collision
 */
export function resolveCollision(
  movingObj: Collidable,
  staticObj: Collidable,
  velocity: { x: number, z: number }
): { x: number, z: number } {
  // Calculate overlap distances
  const overlapLeft = (movingObj.x + movingObj.width / 2) - (staticObj.x - staticObj.width / 2);
  const overlapRight = (staticObj.x + staticObj.width / 2) - (movingObj.x - movingObj.width / 2);
  const overlapTop = (movingObj.z + movingObj.height / 2) - (staticObj.z - staticObj.height / 2);
  const overlapBottom = (staticObj.z + staticObj.height / 2) - (movingObj.z - movingObj.height / 2);
  
  // Find the minimum overlap
  const minOverlapX = Math.min(overlapLeft, overlapRight);
  const minOverlapZ = Math.min(overlapTop, overlapBottom);
  
  // Determine which axis has the smaller overlap
  if (minOverlapX < minOverlapZ) {
    // Adjust X position based on direction of movement
    return {
      x: velocity.x > 0 ? movingObj.x - minOverlapX : movingObj.x + minOverlapX,
      z: movingObj.z
    };
  } else {
    // Adjust Z position based on direction of movement
    return {
      x: movingObj.x,
      z: velocity.z > 0 ? movingObj.z - minOverlapZ : movingObj.z + minOverlapZ
    };
  }
}

/**
 * Checks if a point is inside a rectangular area
 */
export function isPointInRect(
  pointX: number,
  pointZ: number,
  rectX: number,
  rectZ: number,
  rectWidth: number,
  rectHeight: number
): boolean {
  const rectMinX = rectX - rectWidth / 2;
  const rectMaxX = rectX + rectWidth / 2;
  const rectMinZ = rectZ - rectHeight / 2;
  const rectMaxZ = rectZ + rectHeight / 2;
  
  return (
    pointX >= rectMinX &&
    pointX <= rectMaxX &&
    pointZ >= rectMinZ &&
    pointZ <= rectMaxZ
  );
}

/**
 * Calculates the distance between two points
 */
export function getDistance(
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dz * dz);
}
