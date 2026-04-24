import TileType from "./TileType.js";

const DIRECTION_VECTORS = Object.freeze({
  up: Object.freeze({ dx: 0, dz: -1 }),
  down: Object.freeze({ dx: 0, dz: 1 }),
  left: Object.freeze({ dx: -1, dz: 0 }),
  right: Object.freeze({ dx: 1, dz: 0 }),
});

function clonePath(path) {
  return path.map((step) => ({ x: step.x, z: step.z }));
}

export default class CollisionSystem {
  constructor({ gridMap, maxPathLength = 100 } = {}) {
    this.gridMap = gridMap ?? null;
    this.maxPathLength = maxPathLength;
  }

  setGridMap(gridMap) {
    this.gridMap = gridMap ?? null;
  }

  checkPath(startX, startZ, direction) {
    if (!this.gridMap) {
      throw new Error("[CollisionSystem] gridMap is required before checking a path.");
    }

    const vector = DIRECTION_VECTORS[direction];
    if (!vector) {
      throw new Error(`[CollisionSystem] Unsupported direction: ${direction}`);
    }

    const path = [];
    let x = startX;
    let z = startZ;

    for (let steps = 0; steps < this.maxPathLength; steps += 1) {
      x += vector.dx;
      z += vector.dz;

      const tile = this.gridMap.getTile(x, z);

      if (tile === TileType.Wall) {
        const lastStep = path[path.length - 1];
        return {
          canMove: path.length > 0,
          targetX: lastStep?.x ?? startX,
          targetZ: lastStep?.z ?? startZ,
          path: clonePath(path),
          stopReason: "wall",
          stopTile: TileType.Wall,
        };
      }

      path.push({ x, z });

      if (tile === TileType.Spikes) {
        return {
          canMove: true,
          targetX: x,
          targetZ: z,
          path: clonePath(path),
          stopReason: "spikes",
          stopTile: TileType.Spikes,
        };
      }

      if (tile === TileType.Exit) {
        return {
          canMove: true,
          targetX: x,
          targetZ: z,
          path: clonePath(path),
          stopReason: "exit",
          stopTile: TileType.Exit,
        };
      }
    }

    throw new Error(`[CollisionSystem] Path scan exceeded maxPathLength=${this.maxPathLength}.`);
  }
}
