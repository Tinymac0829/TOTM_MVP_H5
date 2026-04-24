import TileType, { isCollectibleTile } from "./TileType.js";

const PLAYER_STATES = Object.freeze({
  Idle: "idle",
  Moving: "moving",
  Dead: "dead",
});

const FLOAT_EPSILON = 1e-9;

const COLLECTIBLE_COUNTER_KEYS = Object.freeze({
  [TileType.Dot]: "dot",
  [TileType.Coin]: "coin",
  [TileType.Star]: "star",
});

export default class PlayerController {
  constructor({
    collisionSystem,
    gridMap = null,
    moveSpeed = 5.0,
    bufferDuration = 0.02,
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
    this.moveSpeed = moveSpeed;
    this.bufferDuration = bufferDuration;
    this.onCollect = onCollect;
    this.onDeath = onDeath;
    this.onExit = onExit;
    this.logger = logger;

    this.gridX = 0;
    this.gridZ = 0;
    this.visualX = 0;
    this.visualZ = 0;

    this.state = PLAYER_STATES.Idle;
    this.moveDirection = null;
    this.moveProgress = 0;
    this.moveTargetX = 0;
    this.moveTargetZ = 0;
    this.moveDistance = 0;

    this.bufferedDirection = null;
    this.bufferTimer = 0;

    this.lastPath = [];
    this.lastStopReason = null;
    this.lastStopTile = null;
    this.collectedCounts = {
      dot: 0,
      coin: 0,
      star: 0,
    };
    this.stageClearPending = false;
  }

  setGridMap(gridMap) {
    this.gridMap = gridMap ?? null;
  }

  reset(x, z) {
    this.gridX = x;
    this.gridZ = z;
    this.visualX = x;
    this.visualZ = z;

    this.state = PLAYER_STATES.Idle;
    this.moveDirection = null;
    this.moveProgress = 0;
    this.moveTargetX = x;
    this.moveTargetZ = z;
    this.moveDistance = 0;

    this.bufferedDirection = null;
    this.bufferTimer = 0;

    this.lastPath = [];
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
    this.updateBufferTimer(fixedDeltaTime);

    if (this.state === PLAYER_STATES.Dead || this.stageClearPending) {
      this.visualX = this.gridX;
      this.visualZ = this.gridZ;
      return;
    }

    if (this.state === PLAYER_STATES.Idle) {
      this.handleIdleState(inputDirection);
      inputDirection = null;
    }

    if (this.state === PLAYER_STATES.Moving) {
      this.handleMovingState(fixedDeltaTime, inputDirection);

      if (this.state === PLAYER_STATES.Idle && !this.stageClearPending) {
        this.handleIdleState(null);
      }
      return;
    }

    this.visualX = this.gridX;
    this.visualZ = this.gridZ;
  }

  handleIdleState(inputDirection) {
    let direction = this.consumeBufferedDirection();

    if (!direction && inputDirection) {
      direction = inputDirection;
    }

    if (!direction) {
      this.visualX = this.gridX;
      this.visualZ = this.gridZ;
      return;
    }

    this.startMove(direction);
  }

  handleMovingState(fixedDeltaTime, inputDirection) {
    if (inputDirection) {
      this.bufferInput(inputDirection);
    }

    this.moveProgress += (this.moveSpeed / this.moveDistance) * fixedDeltaTime;

    if (this.moveProgress + FLOAT_EPSILON >= 1.0) {
      this.gridX = this.moveTargetX;
      this.gridZ = this.moveTargetZ;
      this.visualX = this.gridX;
      this.visualZ = this.gridZ;
      this.moveProgress = 0;
      this.moveDirection = null;

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
      return;
    }

    this.visualX = this.gridX + (this.moveTargetX - this.gridX) * this.moveProgress;
    this.visualZ = this.gridZ + (this.moveTargetZ - this.gridZ) * this.moveProgress;
  }

  startMove(direction) {
    const result = this.collisionSystem.checkPath(this.gridX, this.gridZ, direction);

    if (!result.canMove) {
      this.logger?.log?.(`[Player] blocked(${direction}) at (${this.gridX}, ${this.gridZ})`);
      this.visualX = this.gridX;
      this.visualZ = this.gridZ;
      return false;
    }

    this.state = PLAYER_STATES.Moving;
    this.moveDirection = direction;
    this.moveTargetX = result.targetX;
    this.moveTargetZ = result.targetZ;
    this.moveDistance = Math.abs(result.targetX - this.gridX) + Math.abs(result.targetZ - this.gridZ);
    this.moveProgress = 0;
    this.lastPath = result.path;
    this.lastStopReason = result.stopReason;
    this.lastStopTile = result.stopTile;
    this.processPath(result.path);

    this.logger?.log?.(
      `[Player] startMove(${direction}) -> target(${result.targetX}, ${result.targetZ}), distance=${this.moveDistance}`,
    );

    return true;
  }

  updateBufferTimer(fixedDeltaTime) {
    if (!this.bufferedDirection) {
      return;
    }

    this.bufferTimer -= fixedDeltaTime;
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

  processPath(path) {
    if (!this.gridMap || !Array.isArray(path)) {
      return;
    }

    for (const step of path) {
      const tile = this.gridMap.getTile(step.x, step.z);
      if (!isCollectibleTile(tile)) {
        continue;
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
