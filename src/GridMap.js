import TileType from "./TileType.js";

export default class GridMap {
  constructor(stageData) {
    this.id = stageData.id;
    this.width = stageData.width;
    this.height = stageData.height;
    this.tiles = stageData.tiles;
    this.enter = stageData.enter;
    this.exit = stageData.exit;
    this.meta = stageData.meta ?? {};
  }

  getTile(x, z) {
    if (!this.inBounds(x, z)) {
      return TileType.Wall;
    }

    return this.tiles[z][x];
  }

  setTile(x, z, type) {
    if (!this.inBounds(x, z)) {
      return;
    }

    this.tiles[z][x] = type;
  }

  inBounds(x, z) {
    return x >= 0 && x < this.width && z >= 0 && z < this.height;
  }

  isPassable(x, z) {
    return this.getTile(x, z) !== TileType.Wall;
  }
}
