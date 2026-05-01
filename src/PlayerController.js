import {
  DERIVED_RUN_SPEED_TILES_PER_SECOND,
  RUN_SPEED_WORLD_UNITS_PER_SECOND,
  WORLD_UNITS_PER_TILE,
  tileDistanceToWorld,
  tileToWorld,
  worldDistanceToTiles,
} from "./CoordinateSystem.js";
import TileType, { isCollectibleTile } from "./TileType.js";

export {
  RUN_SPEED_WORLD_UNITS_PER_SECOND,
  WORLD_UNITS_PER_TILE,
};

export const DEFAULT_MOVE_SPEED_TILES_PER_SECOND = DERIVED_RUN_SPEED_TILES_PER_SECOND;

const PLAYER_STATES = Object.freeze({
  Idle: "idle",
  Moving: "moving",
  Dead: "dead",
});

const FLOAT_EPSILON = 1e-9;
const DEFAULT_MAX_MOVE_SEGMENTS_PER_TICK = 4;

const COLLECTIBLE_COUNTER_KEYS = Object.freeze({
  [TileType.Dot]: "dot",
  [TileType.Coin]: "coin",
  [TileType.Star]: "star",
});

function isPositiveFiniteNumber(value) {
  return Number.isFinite(value) && value > 0;
}

export default class PlayerController {
  constructor({
    collisionSystem,
    gridMap = null,
    runSpeedWorldUnitsPerSecond = RUN_SPEED_WORLD_UNITS_PER_SECOND,
    moveSpeed = null,
    bufferDuration = 0.1,
    maxMoveSegmentsPerTick = DEFAULT_MAX_MOVE_SEGMENTS_PER_TICK,
    onCollect = null,
    onDeath = null,
    onExit = null,
    logger = console,
  } = {}) {
    if (!collisionSystem) {
      throw new Error("[PlayerController] collisionSystem is required.");
    }

    this.collisionSystem = collisionSystem;
    this.gridMap = gridMap;
    this.runSpeedWorldUnitsPerSecond = Number.isFinite(moveSpeed)
      ? tileDistanceToWorld(moveSpeed)
      : runSpeedWorldUnitsPerSecond;
    this.bufferDuration = bufferDuration;
    this.maxMoveSegmentsPerTick = maxMoveSegmentsPerTick;
    this.onCollect = onCollect;
    this.onDeath = onDeath;
    this.onExit = onExit;
    this.logger = logger;

    this.gridX = 0;
    this.gridZ = 0;
    this.worldX = 0;
    this.worldZ = 0;

    this.state = PLAYER_STATES.Idle;
    this.moveDirection = null;
    this.moveProgress = 0;
    this.targetGridX = 0;
    this.targetGridZ = 0;
    this.targetWorldX = 0;
    this.targetWorldZ = 0;
    this.startWorldX = 0;
    this.startWorldZ = 0;
    this.moveDistanceTiles = 0;
    this.moveDistanceWorld = 0;
    this.traveledWorld = 0;

    this.bufferedDirection = null;
    this.bufferTimer = 0;

    this.lastPath = [];
    this.processedPathSteps = 0;
    this.lastStopReason = null;
    this.lastStopTile = null;
    this.collectedCounts = {
      dot: 0,
      coin: 0,
      star: 0,
    };
    this.stageClearPending = false;
  }

  get derivedRunSpeedTilesPerSecond() {
    return worldDistanceToTiles(this.runSpeedWorldUnitsPerSecond);
  }

  get moveSpeed() {
    return this.derivedRunSpeedTilesPerSecond;
  }

  set moveSpeed(value) {
    this.setRunSpeedWorldUnitsPerSecond(tileDistanceToWorld(value));
  }

  setRunSpeedWorldUnitsPerSecond(value) {
    if (!isPositiveFiniteNumber(value)) {
      throw new Error(`[PlayerController] runSpeedWorldUnitsPerSecond must be positive, got ${value}`);
    }

    this.runSpeedWorldUnitsPerSecond = value;
  }

  setGridMap(gridMap) {
    this.gridMap = gridMap ?? null;
  }

  reset(x, z) {
    this.gridX = x;
    this.gridZ = z;
    this.worldX = tileToWorld(x);
    this.worldZ = tileToWorld(z);

    this.state = PLAYER_STATES.Idle;
    this.moveDirection = null;
    this.moveProgress = 0;
    this.targetGridX = x;
    this.targetGridZ = z;
    this.targetWorldX = this.worldX;
    this.targetWorldZ = this.worldZ;
    this.startWorldX = this.worldX;
    this.startWorldZ = this.worldZ;
    this.moveDistanceTiles = 0;
    this.moveDistanceWorld = 0;
    this.traveledWorld = 0;

    this.bufferedDirection = null;
    this.bufferTimer = 0;

    this.lastPath = [];
    this.processedPathSteps = 0;
    this.lastStopReason = null;
    this.lastStopTile = null;
    this.collectedCounts = {
      dot: 0,
      coin: 0,
      star: 0,
    };
    this.stageClearPending = false;
  }

  fixedUpdate(fixedDeltaTime, inputDirection = null) {
    if (!Number.isFinite(fixedDeltaTime) || fixedDeltaTime <= 0) {
      return;
    }

    if (this.state === PLAYER_STATES.Dead || this.stageClearPending) {
      return;
    }

    let remainingTime = fixedDeltaTime;
    let pendingInputDirection = inputDirection;
    let moveSegmentsThisTick = 0;

    while (remainingTime > FLOAT_EPSILON) {
      if (this.state === PLAYER_STATES.Dead || this.stageClearPending) {
        break;
      }

      if (this.state === PLAYER_STATES.Idle) {
        if (moveSegmentsThisTick >= this.maxMoveSegmentsPerTick) {
          break;
        }

        const didStartMove = this.tryStartIdleMove(pendingInputDirection);
        pendingInputDirection = null;

        if (!didStartMove) {
          this.syncWorldToGrid();
          break;
        }

        moveSegmentsThisTick += 1;
      }

      if (this.state !== PLAYER_STATES.Moving) {
        continue;
      }

      if (pendingInputDirection) {
        this.bufferInput(pendingInputDirection);
        pendingInputDirection = null;
      }

      const result = this.advanceMovingState(remainingTime);
      remainingTime -= result.elapsedTime;

      if (!result.reachedTarget) {
        break;
      }
    }
  }

  tryStartIdleMove(inputDirection) {
    const bufferedDirection = this.consumeBufferedDirection();
    const direction = bufferedDirection ?? inputDirection;

    if (!direction) {
      return false;
    }

    return this.startMove(direction);
  }

  advanceMovingState(availableTime) {
    if (!isPositiveFiniteNumber(this.runSpeedWorldUnitsPerSecond)) {
      return { elapsedTime: availableTime, reachedTarget: false };
    }

    const remainingWorld = Math.max(0, this.moveDistanceWorld - this.traveledWorld);
    if (remainingWorld <= FLOAT_EPSILON) {
      this.reachMoveTarget();
      return { elapsedTime: 0, reachedTarget: true };
    }

    const stepWorld = this.runSpeedWorldUnitsPerSecond * availableTime;

    if (stepWorld + FLOAT_EPSILON < remainingWorld) {
      this.traveledWorld += stepWorld;
      this.updateWorldPositionFromProgress();
      this.processReachedPathSteps();
      return { elapsedTime: availableTime, reachedTarget: false };
    }

    const elapsedTime = remainingWorld / this.runSpeedWorldUnitsPerSecond;
    this.traveledWorld = this.moveDistanceWorld;
    this.updateWorldPositionFromProgress();
    this.processReachedPathSteps(this.lastPath.length);
    this.reachMoveTarget();

    return {
      elapsedTime,
      reachedTarget: true,
    };
  }

  startMove(direction) {
    const result = this.collisionSystem.checkPath(this.gridX, this.gridZ, direction);

    if (!result.canMove) {
      this.logger?.log?.(`[Player] blocked(${direction}) at (${this.gridX}, ${this.gridZ})`);
      this.syncWorldToGrid();
      return false;
    }

    this.state = PLAYER_STATES.Moving;
    this.moveDirection = direction;
    this.targetGridX = result.targetX;
    this.targetGridZ = result.targetZ;
    this.targetWorldX = tileToWorld(result.targetX);
    this.targetWorldZ = tileToWorld(result.targetZ);
    this.startWorldX = this.worldX;
    this.startWorldZ = this.worldZ;
    this.moveDistanceTiles =
      Math.abs(result.targetX - this.gridX) + Math.abs(result.targetZ - this.gridZ);
    this.moveDistanceWorld = tileDistanceToWorld(this.moveDistanceTiles);
    this.traveledWorld = 0;
    this.moveProgress = 0;
    this.lastPath = result.path;
    this.processedPathSteps = 0;
    this.lastStopReason = result.stopReason;
    this.lastStopTile = result.stopTile;

    this.logger?.log?.(
      `[Player] startMove(${direction}) -> target(${result.targetX}, ${result.targetZ}), ` +
        `distance=${this.moveDistanceTiles} tiles/${this.moveDistanceWorld.toFixed(3)} wu, ` +
        `speed=${this.runSpeedWorldUnitsPerSecond.toFixed(1)} wu/s ` +
        `(${this.derivedRunSpeedTilesPerSecond.toFixed(1)} tiles/s)`,
    );

    return true;
  }

  updateWorldPositionFromProgress() {
    if (this.moveDistanceWorld <= FLOAT_EPSILON) {
      this.moveProgress = 1;
    } else {
      this.moveProgress = Math.min(1, this.traveledWorld / this.moveDistanceWorld);
    }

    this.worldX = this.startWorldX + (this.targetWorldX - this.startWorldX) * this.moveProgress;
    this.worldZ = this.startWorldZ + (this.targetWorldZ - this.startWorldZ) * this.moveProgress;
  }

  reachMoveTarget() {
    this.processReachedPathSteps(this.lastPath.length);
    this.gridX = this.targetGridX;
    this.gridZ = this.targetGridZ;
    this.worldX = this.targetWorldX;
    this.worldZ = this.targetWorldZ;
    this.moveProgress = 0;
    this.moveDirection = null;
    this.traveledWorld = 0;

    if (this.lastStopReason === "spikes") {
      this.clearBuffer();
      this.state = PLAYER_STATES.Dead;
      this.logger?.log?.(`[Player] died at (${this.gridX}, ${this.gridZ})`);
      this.onDeath?.({
        x: this.gridX,
        z: this.gridZ,
        tile: this.lastStopTile,
      });
      return;
    }

    if (this.lastStopReason === "exit") {
      this.clearBuffer();
      this.state = PLAYER_STATES.Idle;
      this.stageClearPending = true;
      this.logger?.log?.(`[Player] exit reached at (${this.gridX}, ${this.gridZ})`);
      this.onExit?.({
        x: this.gridX,
        z: this.gridZ,
        tile: this.lastStopTile,
      });
      return;
    }

    this.state = PLAYER_STATES.Idle;
  }

  syncWorldToGrid() {
    this.worldX = tileToWorld(this.gridX);
    this.worldZ = tileToWorld(this.gridZ);
  }

  update(deltaTime) {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    this.updateBufferTimer(deltaTime);
  }

  updateBufferTimer(elapsedTime) {
    if (!this.bufferedDirection) {
      return;
    }

    this.bufferTimer -= elapsedTime;
    if (this.bufferTimer <= 0) {
      this.logger?.log?.(`[Player] buffer expired(${this.bufferedDirection})`);
      this.bufferedDirection = null;
      this.bufferTimer = 0;
    }
  }

  bufferInput(direction) {
    this.bufferedDirection = direction;
    this.bufferTimer = this.bufferDuration + FLOAT_EPSILON;
    this.logger?.log?.(`[Player] buffer set(${direction})`);
  }

  consumeBufferedDirection() {
    if (!this.bufferedDirection) {
      return null;
    }

    const direction = this.bufferedDirection;
    this.bufferedDirection = null;
    this.bufferTimer = 0;
    this.logger?.log?.(`[Player] buffer consume(${direction})`);
    return direction;
  }

  clearBuffer() {
    this.bufferedDirection = null;
    this.bufferTimer = 0;
  }

  processReachedPathSteps(forcedStepCount = null) {
    if (!this.gridMap || !Array.isArray(this.lastPath) || this.moveDistanceTiles <= 0) {
      return;
    }

    const reachedStepCount = forcedStepCount ?? Math.floor(
      Math.min(this.moveDistanceTiles, this.moveProgress * this.moveDistanceTiles + FLOAT_EPSILON),
    );
    const nextStepCount = Math.min(reachedStepCount, this.lastPath.length);

    for (let index = this.processedPathSteps; index < nextStepCount; index += 1) {
      this.processCollectibleAtStep(this.lastPath[index]);
    }

    this.processedPathSteps = Math.max(this.processedPathSteps, nextStepCount);
  }

  processCollectibleAtStep(step) {
    const tile = this.gridMap.getTile(step.x, step.z);
    if (!isCollectibleTile(tile)) {
      return;
    }

    this.gridMap.setTile(step.x, step.z, TileType.Empty);

    const counterKey = COLLECTIBLE_COUNTER_KEYS[tile];
    if (counterKey) {
      this.collectedCounts[counterKey] += 1;
    }

    this.logger?.log?.(`[Player] collect(${counterKey}) at (${step.x}, ${step.z})`);
    this.onCollect?.({
      type: counterKey,
      x: step.x,
      z: step.z,
      total: this.collectedCounts[counterKey],
    });
  }

  isIdle() {
    return this.state === PLAYER_STATES.Idle;
  }

  isMoving() {
    return this.state === PLAYER_STATES.Moving;
  }

  isDead() {
    return this.state === PLAYER_STATES.Dead;
  }

  isStageCleared() {
    return this.stageClearPending;
  }
}
