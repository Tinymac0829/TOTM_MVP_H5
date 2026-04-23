// Centralize frozen tile semantics so loader, collision, and renderer
// all read from the same runtime truth source.
export const TileType = Object.freeze({
  Empty: 0,
  Wall: 1,
  Enter: 2,
  Exit: 3,
  Dot: 4,
  Coin: 5,
  Star: 6,
  Spikes: 7,
});

export const TileNames = Object.freeze(
  Object.fromEntries(Object.entries(TileType).map(([name, value]) => [value, name])),
);

export const ValidTileValues = Object.freeze(Object.values(TileType));

export const CollectibleTileValues = Object.freeze([
  TileType.Dot,
  TileType.Coin,
  TileType.Star,
]);

export const PassableTileValues = Object.freeze(
  ValidTileValues.filter((value) => value !== TileType.Wall),
);

export const SlidingStopTileValues = Object.freeze([
  TileType.Exit,
  TileType.Spikes,
]);

export function isValidTileType(value) {
  return ValidTileValues.includes(value);
}

export function isCollectibleTile(value) {
  return CollectibleTileValues.includes(value);
}

export function isPassableTile(value) {
  return PassableTileValues.includes(value);
}

export function doesTileStopSlidingOnEntry(value) {
  return SlidingStopTileValues.includes(value);
}

export function getTileName(value) {
  return TileNames[value] ?? `Unknown(${value})`;
}

export default TileType;
