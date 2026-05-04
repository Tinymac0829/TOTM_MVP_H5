import {
  worldToScreen,
  worldToTile,
} from "./CoordinateSystem.js";
import TileType from "./TileType.js";

const TILE_COLORS = Object.freeze({
  [TileType.Wall]: "#4a4a4a",
  [TileType.Enter]: "#00cc44",
  [TileType.Exit]: "#0088ff",
  [TileType.Dot]: "#ffffff",
  [TileType.Coin]: "#ffcc00",
  [TileType.Star]: "#ffff00",
  [TileType.Spikes]: "#cc0000",
});

const STORY_TARGET_VISIBLE_COLUMNS = 12.75;
const STORY_TARGET_VISIBLE_ROWS = 25.5;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(current, target, alpha) {
  return current + (target - current) * alpha;
}

function resolveViewportSize(canvas) {
  return {
    width: canvas.clientWidth || canvas.width,
    height: canvas.clientHeight || canvas.height,
  };
}

function normalizeViewport(canvas, viewport = null) {
  if (viewport && Number.isFinite(viewport.width) && Number.isFinite(viewport.height)) {
    return {
      width: viewport.width,
      height: viewport.height,
    };
  }

  return resolveViewportSize(canvas);
}

function resolveStoryTileSize(viewport, fallbackTileSize) {
  const candidates = [];

  if (Number.isFinite(viewport.width) && viewport.width > 0) {
    candidates.push(viewport.width / STORY_TARGET_VISIBLE_COLUMNS);
  }

  if (Number.isFinite(viewport.height) && viewport.height > 0) {
    candidates.push(viewport.height / STORY_TARGET_VISIBLE_ROWS);
  }

  const tileSize = candidates.length > 0
    ? Math.min(...candidates)
    : fallbackTileSize;

  return Number.isFinite(tileSize) && tileSize > 0
    ? tileSize
    : fallbackTileSize;
}

export default class Renderer {
  constructor({
    canvas,
    context = canvas?.getContext("2d"),
    tileSize = 60,
    visiblePaddingTiles = 1,
    backgroundColor = "#18232d",
  } = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("[Renderer] A valid canvas is required.");
    }

    if (!context) {
      throw new Error("[Renderer] Canvas2D context is not available.");
    }

    this.canvas = canvas;
    this.context = context;
    this.baseTileSize = tileSize;
    this.tileSize = tileSize;
    this.visiblePaddingTiles = visiblePaddingTiles;
    this.backgroundColor = backgroundColor;

    this.gridMap = null;
    this.player = null;
    this.focusTarget = null;
    this.focusPoint = null;
    this.cameraOffsetX = 0;
    this.cameraOffsetZ = 0;
  }

  setGridMap(gridMap) {
    this.gridMap = gridMap;
    this.focusPoint = gridMap?.enter ? { x: gridMap.enter.x, z: gridMap.enter.z } : null;
    this.snapCameraToFocus();
  }

  setPlayer(player) {
    this.player = player ?? null;
  }

  setFocusTarget(target) {
    this.focusTarget = target;
  }

  setFocusPoint(x, z) {
    this.focusPoint = { x, z };
  }

  render(dt = 0, viewportOverride = null) {
    const viewport = normalizeViewport(this.canvas, viewportOverride);

    this.updateTileSize(viewport);
    this.clear(viewport.width, viewport.height);

    if (!this.gridMap) {
      return;
    }

    this.updateCamera(dt, viewport.width, viewport.height);
    this.renderMap(viewport.width, viewport.height);
    this.renderPlayer();
  }

  clear(width, height) {
    this.context.clearRect(0, 0, width, height);
    this.context.fillStyle = this.backgroundColor;
    this.context.fillRect(0, 0, width, height);
  }

  updateCamera(dt, viewportWidth, viewportHeight) {
    const focus = this.resolveFocusPoint();
    const targetOffsetX = this.resolveCameraOffset(focus.x, viewportWidth);
    const targetOffsetZ = this.resolveCameraOffset(focus.z, viewportHeight);

    const lerpAlpha = clamp(Math.max(dt, 0) * 10, 0, 1);

    this.cameraOffsetX = lerp(this.cameraOffsetX, targetOffsetX, lerpAlpha);
    this.cameraOffsetZ = lerp(this.cameraOffsetZ, targetOffsetZ, lerpAlpha);
  }

  snapCameraToFocus(viewportOverride = null) {
    if (!this.gridMap) {
      this.cameraOffsetX = 0;
      this.cameraOffsetZ = 0;
      return;
    }

    const viewport = normalizeViewport(this.canvas, viewportOverride);
    const focus = this.resolveFocusPoint();

    this.updateTileSize(viewport);
    this.cameraOffsetX = this.resolveCameraOffset(focus.x, viewport.width);
    this.cameraOffsetZ = this.resolveCameraOffset(focus.z, viewport.height);
  }

  updateTileSize(viewport) {
    this.tileSize = resolveStoryTileSize(viewport, this.baseTileSize);
  }

  renderMap(viewportWidth, viewportHeight) {
    const startX = Math.max(0, Math.floor(this.cameraOffsetX / this.tileSize) - this.visiblePaddingTiles);
    const endX = Math.min(
      this.gridMap.width - 1,
      Math.ceil((this.cameraOffsetX + viewportWidth) / this.tileSize) + this.visiblePaddingTiles,
    );
    const startZ = Math.max(0, Math.floor(this.cameraOffsetZ / this.tileSize) - this.visiblePaddingTiles);
    const endZ = Math.min(
      this.gridMap.height - 1,
      Math.ceil((this.cameraOffsetZ + viewportHeight) / this.tileSize) + this.visiblePaddingTiles,
    );

    for (let z = startZ; z <= endZ; z += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.gridMap.getTile(x, z);
        if (tile === TileType.Empty) {
          continue;
        }

        this.renderTile(x, z, tile);
      }
    }
  }

  renderTile(x, z, tile) {
    const color = TILE_COLORS[tile];
    if (!color) {
      return;
    }

    const screenX = x * this.tileSize - this.cameraOffsetX;
    const screenZ = z * this.tileSize - this.cameraOffsetZ;

    this.context.fillStyle = color;
    this.context.fillRect(screenX, screenZ, this.tileSize, this.tileSize);
  }

  renderPlayer() {
    if (!this.player) {
      return;
    }

    const screenX = Number.isFinite(this.player.worldX)
      ? worldToScreen(this.player.worldX, this.tileSize, this.cameraOffsetX)
      : this.player.gridX * this.tileSize - this.cameraOffsetX;
    const screenZ = Number.isFinite(this.player.worldZ)
      ? worldToScreen(this.player.worldZ, this.tileSize, this.cameraOffsetZ)
      : this.player.gridZ * this.tileSize - this.cameraOffsetZ;
    const inset = this.tileSize * 0.15;

    this.context.fillStyle = this.player.state === "dead" ? "#550000" : "#00e5ff";
    this.context.fillRect(
      screenX + inset,
      screenZ + inset,
      this.tileSize - inset * 2,
      this.tileSize - inset * 2,
    );
  }

  resolveFocusPoint() {
    if (this.focusTarget) {
      const x = Number.isFinite(this.focusTarget.worldX)
        ? worldToTile(this.focusTarget.worldX)
        : this.focusTarget.gridX ?? this.focusTarget.x;
      const z = Number.isFinite(this.focusTarget.worldZ)
        ? worldToTile(this.focusTarget.worldZ)
        : this.focusTarget.gridZ ?? this.focusTarget.z;

      if (Number.isFinite(x) && Number.isFinite(z)) {
        return { x, z };
      }
    }

    if (this.focusPoint && Number.isFinite(this.focusPoint.x) && Number.isFinite(this.focusPoint.z)) {
      return this.focusPoint;
    }

    if (this.gridMap?.enter) {
      return { x: this.gridMap.enter.x, z: this.gridMap.enter.z };
    }

    return { x: 0, z: 0 };
  }

  resolveCameraOffset(focusTilePosition, viewportSize) {
    return (focusTilePosition + 0.5) * this.tileSize - viewportSize / 2;
  }

  getWorldWidth() {
    return (this.gridMap?.width ?? 0) * this.tileSize;
  }

  getWorldHeight() {
    return (this.gridMap?.height ?? 0) * this.tileSize;
  }
}
