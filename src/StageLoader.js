import GridMap from "./GridMap.js";
import TileType, { isValidTileType } from "./TileType.js";

export const STAGE_ORDER = Object.freeze(["story_001", "story_002", "story_003"]);

function cloneStageData(stageData) {
  return JSON.parse(JSON.stringify(stageData));
}

function isValidPoint(point, width, height) {
  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.z)) {
    return false;
  }

  return point.x >= 0 && point.x < width && point.z >= 0 && point.z < height;
}

function countStageTiles(stageData) {
  const counts = {
    enter: 0,
    exit: 0,
    dot: 0,
    coin: 0,
    star: 0,
  };

  if (!Array.isArray(stageData?.tiles)) {
    return counts;
  }

  for (let z = 0; z < stageData.tiles.length; z += 1) {
    const row = stageData.tiles[z];

    if (!Array.isArray(row)) {
      continue;
    }

    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x];

      if (tile === TileType.Enter) {
        counts.enter += 1;
      } else if (tile === TileType.Exit) {
        counts.exit += 1;
      } else if (tile === TileType.Dot) {
        counts.dot += 1;
      } else if (tile === TileType.Coin) {
        counts.coin += 1;
      } else if (tile === TileType.Star) {
        counts.star += 1;
      }
    }
  }

  return counts;
}

export function validateStageData(stageData) {
  const errors = [];
  const warnings = [];

  if (!stageData || typeof stageData !== "object") {
    return {
      valid: false,
      errors: ["stage data must be an object"],
      warnings,
      counts: countStageTiles(stageData),
    };
  }

  if (stageData.version !== 1) {
    errors.push(`version must be 1, got ${stageData.version}`);
  }

  if (!Number.isInteger(stageData.width) || stageData.width <= 0) {
    errors.push(`width must be positive integer, got ${stageData.width}`);
  }

  if (!Number.isInteger(stageData.height) || stageData.height <= 0) {
    errors.push(`height must be positive integer, got ${stageData.height}`);
  }

  if (!Array.isArray(stageData.tiles)) {
    errors.push("tiles must be an array");
  } else {
    if (Number.isInteger(stageData.height) && stageData.tiles.length !== stageData.height) {
      errors.push(`tiles has ${stageData.tiles.length} rows, expected ${stageData.height}`);
    }

    for (let z = 0; z < stageData.tiles.length; z += 1) {
      const row = stageData.tiles[z];

      if (!Array.isArray(row)) {
        errors.push(`tiles[${z}] must be an array`);
        continue;
      }

      if (Number.isInteger(stageData.width) && row.length !== stageData.width) {
        errors.push(`tiles[${z}] length is ${row.length}, expected ${stageData.width}`);
      }

      for (let x = 0; x < row.length; x += 1) {
        const tile = row[x];
        if (!isValidTileType(tile)) {
          errors.push(`tiles[${z}][${x}] = ${tile} is not a valid tile type`);
        }
      }
    }
  }

  const width = stageData.width;
  const height = stageData.height;

  if (!isValidPoint(stageData.enter, width, height)) {
    errors.push("enter must be an in-bounds integer coordinate");
  } else if (stageData.tiles?.[stageData.enter.z]?.[stageData.enter.x] !== TileType.Enter) {
    errors.push(
      `enter points to tile type ${stageData.tiles[stageData.enter.z][stageData.enter.x]}, expected Enter(2)`,
    );
  }

  if (!isValidPoint(stageData.exit, width, height)) {
    errors.push("exit must be an in-bounds integer coordinate");
  } else if (stageData.tiles?.[stageData.exit.z]?.[stageData.exit.x] !== TileType.Exit) {
    errors.push(
      `exit points to tile type ${stageData.tiles[stageData.exit.z][stageData.exit.x]}, expected Exit(3)`,
    );
  }

  const counts = countStageTiles(stageData);

  if (errors.length === 0) {
    if (counts.enter !== 1) {
      warnings.push(`Enter count is ${counts.enter}, expected 1`);
    }

    if (counts.exit !== 1) {
      warnings.push(`Exit count is ${counts.exit}, expected 1`);
    }

    if (counts.star > 3) {
      warnings.push(`Star count is ${counts.star}, max is 3`);
    }

    const meta = stageData.meta ?? {};

    if (meta.dots_total !== undefined && meta.dots_total !== counts.dot) {
      warnings.push(`meta.dots_total (${meta.dots_total}) != actual (${counts.dot})`);
    }

    if (meta.coins_total !== undefined && meta.coins_total !== counts.coin) {
      warnings.push(`meta.coins_total (${meta.coins_total}) != actual (${counts.coin})`);
    }

    if (meta.stars_total !== undefined && meta.stars_total !== counts.star) {
      warnings.push(`meta.stars_total (${meta.stars_total}) != actual (${counts.star})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    counts,
  };
}

export default class StageLoader {
  constructor({ fetchImpl, stageBasePath = "stages", gameState = null, onStageReady = null } = {}) {
    this.fetchImpl = fetchImpl ?? globalThis.fetch?.bind(globalThis);
    this.stageBasePath = String(stageBasePath).replace(/\/+$/, "") || "stages";
    this.gameState = gameState;
    this.onStageReady = onStageReady;
    this.cache = new Map();

    if (typeof this.fetchImpl !== "function") {
      throw new Error("[StageLoader] fetch implementation is required.");
    }
  }

  async loadAndStart(stageId) {
    try {
      const stageData = await this.load(stageId);
      const snapshot = this.initStage(stageData);
      return { success: true, ...snapshot };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[StageLoader] Failed to load stage ${stageId}: ${message}`);
      return { success: false, error: message };
    }
  }

  async load(stageId) {
    if (this.cache.has(stageId)) {
      return cloneStageData(this.cache.get(stageId));
    }

    const url = `${this.stageBasePath}/${stageId}.json`;
    const response = await this.fetchImpl(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    const stageData = await response.json();
    const result = validateStageData(stageData);

    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.join("; ")}`);
    }

    for (const warning of result.warnings) {
      console.warn(`[StageLoader] ${stageId}: ${warning}`);
    }

    this.cache.set(stageId, cloneStageData(stageData));
    return cloneStageData(stageData);
  }

  initStage(stageData) {
    const gridMap = new GridMap(stageData);
    const counts = this.countCollectibles(stageData);

    if (this.gameState) {
      this.gameState.currentStageId = stageData.id;

      if (typeof this.gameState.setState === "function") {
        this.gameState.setState("playing");
      }
    }

    const snapshot = {
      stageData,
      gridMap,
      counts,
    };

    if (typeof this.onStageReady === "function") {
      this.onStageReady(snapshot);
    }

    console.log(
      `[StageLoader] Stage ${stageData.id} loaded: ` +
        `${stageData.width}x${stageData.height}, ` +
        `dots=${counts.dot}, coins=${counts.coin}, stars=${counts.star}`,
    );

    return snapshot;
  }

  countCollectibles(stageData) {
    const counts = countStageTiles(stageData);

    return {
      dot: counts.dot,
      coin: counts.coin,
      star: counts.star,
    };
  }

  clearCache() {
    this.cache.clear();
  }
}
