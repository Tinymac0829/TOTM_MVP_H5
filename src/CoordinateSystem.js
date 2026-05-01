export const WORLD_UNITS_PER_TILE = 0.12;
export const WORLD_UNITS_PER_HALF_TILE = WORLD_UNITS_PER_TILE / 2;
export const RUN_SPEED_WORLD_UNITS_PER_SECOND = 5.0;
export const DERIVED_RUN_SPEED_TILES_PER_SECOND =
  RUN_SPEED_WORLD_UNITS_PER_SECOND / WORLD_UNITS_PER_TILE;

export function tileToWorldOrigin(tileCoordinate) {
  return tileCoordinate * WORLD_UNITS_PER_TILE;
}

export function tileToWorldCenter(tileCoordinate) {
  return tileToWorldOrigin(tileCoordinate) + WORLD_UNITS_PER_HALF_TILE;
}

export function tileToWorld(tileCoordinate) {
  return tileToWorldOrigin(tileCoordinate);
}

export function worldToTile(worldCoordinate) {
  return worldCoordinate / WORLD_UNITS_PER_TILE;
}

export function tileDistanceToWorld(tileDistance) {
  return tileDistance * WORLD_UNITS_PER_TILE;
}

export function worldDistanceToTiles(worldDistance) {
  return worldDistance / WORLD_UNITS_PER_TILE;
}

export function tileToScreen(tileCoordinate, pixelsPerTile, cameraOffset = 0) {
  return tileCoordinate * pixelsPerTile - cameraOffset;
}

export function worldToScreen(worldCoordinate, pixelsPerTile, cameraOffset = 0) {
  return tileToScreen(worldToTile(worldCoordinate), pixelsPerTile, cameraOffset);
}
