import fs from "node:fs";
import path from "node:path";

const TILE_TYPES = Object.freeze({
  Empty: 0,
  Wall: 1,
  Enter: 2,
  Exit: 3,
  Dot: 4,
  Coin: 5,
  Star: 6,
  Spikes: 7,
});

const TILE_NAMES = new Map([
  [TILE_TYPES.Empty, "Empty"],
  [TILE_TYPES.Wall, "Wall"],
  [TILE_TYPES.Enter, "Enter"],
  [TILE_TYPES.Exit, "Exit"],
  [TILE_TYPES.Dot, "Dot"],
  [TILE_TYPES.Coin, "Coin"],
  [TILE_TYPES.Star, "Star"],
  [TILE_TYPES.Spikes, "Spikes"],
]);

const REQUIRED_COUNT_TILE_VALUES = Object.freeze([
  TILE_TYPES.Enter,
  TILE_TYPES.Exit,
  TILE_TYPES.Dot,
  TILE_TYPES.Coin,
  TILE_TYPES.Star,
  TILE_TYPES.Spikes,
]);

function showUsage() {
  console.error("Usage: node tools/convert_stage_json_landscape.mjs <input.json> <output.json> [--id <stageId>]");
}

function parseArgs(argv) {
  const [, , inputPath, outputPath, ...options] = argv;
  const result = {
    inputPath,
    outputPath,
    outputStageId: null,
  };

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];

    if (option === "--id") {
      const value = options[index + 1];
      if (!value) {
        throw new Error("--id requires a stage id value");
      }
      result.outputStageId = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${option}`);
  }

  return result;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function stringifyInlineObject(value) {
  const entries = Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${JSON.stringify(item)}`);
  return `{ ${entries.join(", ")} }`;
}

function shouldStringifyInlineObject(value) {
  const keys = Object.keys(value);

  return (
    keys.length === 2 &&
    keys.includes("x") &&
    keys.includes("z") &&
    Object.values(value).every((item) => Number.isInteger(item))
  );
}

function stringifyValue(value, indentLevel = 0) {
  const indent = "  ".repeat(indentLevel);
  const nextIndent = "  ".repeat(indentLevel + 1);

  if (Array.isArray(value)) {
    if (value.every((item) => !Array.isArray(item) && !isPlainObject(item))) {
      return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    }

    const lines = value.map((item) => `${nextIndent}${stringifyValue(item, indentLevel + 1)}`);
    return `[\n${lines.join(",\n")}\n${indent}]`;
  }

  if (isPlainObject(value)) {
    if (shouldStringifyInlineObject(value)) {
      return stringifyInlineObject(value);
    }

    const lines = Object.entries(value).map(([key, item]) => {
      return `${nextIndent}${JSON.stringify(key)}: ${stringifyValue(item, indentLevel + 1)}`;
    });
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }

  return JSON.stringify(value);
}

function stringifyStage(stageData) {
  const lines = Object.entries(stageData).map(([key, value]) => {
    return `  ${JSON.stringify(key)}: ${stringifyValue(value, 1)}`;
  });

  return `{\n${lines.join(",\n")}\n}\n`;
}

function isValidPoint(point, width, height) {
  return (
    isPlainObject(point) &&
    Number.isInteger(point.x) &&
    Number.isInteger(point.z) &&
    point.x >= 0 &&
    point.x < width &&
    point.z >= 0 &&
    point.z < height
  );
}

function rotatePointClockwise(point, oldHeight) {
  return {
    x: oldHeight - 1 - point.z,
    z: point.x,
  };
}

function createEmptyCounts() {
  const counts = new Map();

  for (const tileValue of TILE_NAMES.keys()) {
    counts.set(tileValue, 0);
  }

  return counts;
}

function countTiles(stageData) {
  const counts = createEmptyCounts();

  if (!Array.isArray(stageData?.tiles)) {
    return counts;
  }

  for (const row of stageData.tiles) {
    if (!Array.isArray(row)) {
      continue;
    }

    for (const tileValue of row) {
      counts.set(tileValue, (counts.get(tileValue) ?? 0) + 1);
    }
  }

  return counts;
}

function validateStageData(stageData, label) {
  const errors = [];

  if (!isPlainObject(stageData)) {
    return [`${label}: stage data must be an object`];
  }

  if (!Number.isInteger(stageData.width) || stageData.width <= 0) {
    errors.push(`${label}: width must be a positive integer`);
  }

  if (!Number.isInteger(stageData.height) || stageData.height <= 0) {
    errors.push(`${label}: height must be a positive integer`);
  }

  if (!Array.isArray(stageData.tiles)) {
    errors.push(`${label}: tiles must be an array`);
    return errors;
  }

  if (Number.isInteger(stageData.height) && stageData.tiles.length !== stageData.height) {
    errors.push(`${label}: tiles row count (${stageData.tiles.length}) != height (${stageData.height})`);
  }

  stageData.tiles.forEach((row, z) => {
    if (!Array.isArray(row)) {
      errors.push(`${label}: tiles[${z}] must be an array`);
      return;
    }

    if (Number.isInteger(stageData.width) && row.length !== stageData.width) {
      errors.push(`${label}: tiles[${z}] width (${row.length}) != width (${stageData.width})`);
    }

    row.forEach((tileValue, x) => {
      if (!TILE_NAMES.has(tileValue)) {
        errors.push(`${label}: tiles[${z}][${x}] = ${tileValue} is not a valid tile type`);
      }
    });
  });

  if (
    Number.isInteger(stageData.width) &&
    Number.isInteger(stageData.height) &&
    Array.isArray(stageData.tiles)
  ) {
    if (!isValidPoint(stageData.enter, stageData.width, stageData.height)) {
      errors.push(`${label}: enter must be an in-bounds integer coordinate`);
    } else if (stageData.tiles[stageData.enter.z]?.[stageData.enter.x] !== TILE_TYPES.Enter) {
      errors.push(`${label}: enter does not point to Enter(2)`);
    }

    if (!isValidPoint(stageData.exit, stageData.width, stageData.height)) {
      errors.push(`${label}: exit must be an in-bounds integer coordinate`);
    } else if (stageData.tiles[stageData.exit.z]?.[stageData.exit.x] !== TILE_TYPES.Exit) {
      errors.push(`${label}: exit does not point to Exit(3)`);
    }
  }

  return errors;
}

function rotateStageDataClockwise(stageData, outputStageId) {
  const source = cloneJson(stageData);
  const oldWidth = source.width;
  const oldHeight = source.height;
  const rotatedWidth = oldHeight;
  const rotatedHeight = oldWidth;
  const rotatedTiles = Array.from(
    { length: rotatedHeight },
    () => Array.from({ length: rotatedWidth }, () => TILE_TYPES.Empty),
  );

  for (let z = 0; z < oldHeight; z += 1) {
    for (let x = 0; x < oldWidth; x += 1) {
      const rotatedPoint = rotatePointClockwise({ x, z }, oldHeight);
      rotatedTiles[rotatedPoint.z][rotatedPoint.x] = source.tiles[z][x];
    }
  }

  return {
    ...source,
    id: outputStageId,
    width: rotatedWidth,
    height: rotatedHeight,
    enter: rotatePointClockwise(source.enter, oldHeight),
    exit: rotatePointClockwise(source.exit, oldHeight),
    tiles: rotatedTiles,
    meta: {
      ...(source.meta ?? {}),
      orientation: "landscape",
      transform: "rotate90_clockwise",
      sourceStageId: source.id,
    },
  };
}

function getRowWidths(stageData) {
  if (!Array.isArray(stageData.tiles)) {
    return [];
  }

  return [...new Set(stageData.tiles.filter(Array.isArray).map((row) => row.length))];
}

function compareRequiredCounts(sourceCounts, outputCounts) {
  const mismatches = [];

  for (const tileValue of REQUIRED_COUNT_TILE_VALUES) {
    const sourceCount = sourceCounts.get(tileValue) ?? 0;
    const outputCount = outputCounts.get(tileValue) ?? 0;

    if (sourceCount !== outputCount) {
      mismatches.push(`${TILE_NAMES.get(tileValue)}(${tileValue}) source=${sourceCount} output=${outputCount}`);
    }
  }

  return mismatches;
}

function printSummary({ inputPath, outputPath, sourceStageData, outputStageData }) {
  const sourceCounts = countTiles(sourceStageData);
  const outputCounts = countTiles(outputStageData);
  const mismatches = compareRequiredCounts(sourceCounts, outputCounts);

  console.log(`Wrote ${outputPath}`);
  console.log(`source: ${inputPath}`);
  console.log(`source id: ${sourceStageData.id ?? "(missing)"}`);
  console.log(`output id: ${outputStageData.id ?? "(missing)"}`);
  console.log(`source size: ${sourceStageData.width}x${sourceStageData.height}`);
  console.log(`output size: ${outputStageData.width}x${outputStageData.height}`);
  console.log(`expected output size: ${sourceStageData.height}x${sourceStageData.width}`);
  console.log(`output rows: ${Array.isArray(outputStageData.tiles) ? outputStageData.tiles.length : "(missing)"}`);
  console.log(`output row widths: ${getRowWidths(outputStageData).join(", ") || "(missing)"}`);
  console.log(`source enter: ${stringifyValue(sourceStageData.enter ?? null)}`);
  console.log(`output enter: ${stringifyValue(outputStageData.enter ?? null)}`);
  console.log(`source exit: ${stringifyValue(sourceStageData.exit ?? null)}`);
  console.log(`output exit: ${stringifyValue(outputStageData.exit ?? null)}`);

  for (const tileValue of REQUIRED_COUNT_TILE_VALUES) {
    const tileName = TILE_NAMES.get(tileValue);
    const sourceCount = sourceCounts.get(tileValue) ?? 0;
    const outputCount = outputCounts.get(tileValue) ?? 0;
    console.log(`${tileName}(${tileValue}): source=${sourceCount} output=${outputCount}`);
  }

  console.log(`count check: ${mismatches.length === 0 ? "PASS" : "FAIL"}`);

  for (const mismatch of mismatches) {
    console.log(`- ${mismatch}`);
  }
}

function assertNotSameResolvedPath(inputPath, outputPath) {
  const inputResolvedPath = path.resolve(inputPath);
  const outputResolvedPath = path.resolve(outputPath);

  if (inputResolvedPath === outputResolvedPath) {
    throw new Error("output path must not be the same as input path");
  }
}

function main() {
  const { inputPath, outputPath, outputStageId } = parseArgs(process.argv);

  if (!inputPath || !outputPath) {
    showUsage();
    process.exit(1);
  }

  assertNotSameResolvedPath(inputPath, outputPath);

  const input = fs.readFileSync(inputPath, "utf8");
  const sourceStageData = JSON.parse(input);
  const inputErrors = validateStageData(sourceStageData, "input");

  if (inputErrors.length > 0) {
    for (const error of inputErrors) {
      console.error(error);
    }
    process.exit(1);
  }

  const resolvedOutputStageId = outputStageId ?? `${sourceStageData.id}_landscape`;
  const outputStageData = rotateStageDataClockwise(sourceStageData, resolvedOutputStageId);
  const outputErrors = validateStageData(outputStageData, "output");
  const countMismatches = compareRequiredCounts(countTiles(sourceStageData), countTiles(outputStageData));

  if (outputErrors.length > 0 || countMismatches.length > 0) {
    for (const error of outputErrors) {
      console.error(error);
    }
    for (const mismatch of countMismatches) {
      console.error(`output count mismatch: ${mismatch}`);
    }
    process.exit(1);
  }

  const outputDir = path.dirname(outputPath);

  if (outputDir && outputDir !== ".") {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, stringifyStage(outputStageData), "utf8");
  printSummary({ inputPath, outputPath, sourceStageData, outputStageData });
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
