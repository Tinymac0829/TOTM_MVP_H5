import fs from "node:fs";
import path from "node:path";

const TILE_NAMES = new Map([
  [0, "Empty"],
  [1, "Wall"],
  [2, "Enter"],
  [3, "Exit"],
  [4, "Dot"],
  [5, "Coin"],
  [6, "Star"],
  [7, "Spikes"],
]);

function showUsage() {
  console.error("Usage: node tools/format_stage_json.mjs <input.json> <output.json>");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringifyInlineObject(value) {
  const entries = Object.entries(value).map(([key, item]) => {
    return `${JSON.stringify(key)}: ${JSON.stringify(item)}`;
  });

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

function countTiles(stageData) {
  const counts = new Map();

  for (const tileValue of TILE_NAMES.keys()) {
    counts.set(tileValue, 0);
  }

  if (!Array.isArray(stageData.tiles)) {
    return counts;
  }

  for (const row of stageData.tiles) {
    if (!Array.isArray(row)) {
      continue;
    }

    for (const tile of row) {
      counts.set(tile, (counts.get(tile) ?? 0) + 1);
    }
  }

  return counts;
}

function validateShape(stageData) {
  const warnings = [];
  const width = stageData.width;
  const height = stageData.height;

  if (!Array.isArray(stageData.tiles)) {
    warnings.push("tiles is not an array");
    return warnings;
  }

  if (stageData.tiles.length !== height) {
    warnings.push(`tiles row count (${stageData.tiles.length}) != height (${height})`);
  }

  stageData.tiles.forEach((row, index) => {
    if (!Array.isArray(row)) {
      warnings.push(`tiles[${index}] is not an array`);
      return;
    }

    if (row.length !== width) {
      warnings.push(`tiles[${index}] width (${row.length}) != width (${width})`);
    }
  });

  return warnings;
}

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  showUsage();
  process.exit(1);
}

const input = fs.readFileSync(inputPath, "utf8");
const stageData = JSON.parse(input);
const output = stringifyStage(stageData);
const outputDir = path.dirname(outputPath);

if (outputDir && outputDir !== ".") {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, output, "utf8");

const counts = countTiles(stageData);
const warnings = validateShape(stageData);
const rowWidths = Array.isArray(stageData.tiles)
  ? [...new Set(stageData.tiles.filter(Array.isArray).map((row) => row.length))]
  : [];

console.log(`Wrote ${outputPath}`);
console.log(`id: ${stageData.id ?? "(missing)"}`);
console.log(`size: ${stageData.width ?? "(missing)"}x${stageData.height ?? "(missing)"}`);
console.log(`rows: ${Array.isArray(stageData.tiles) ? stageData.tiles.length : "(missing)"}`);
console.log(`row widths: ${rowWidths.length > 0 ? rowWidths.join(", ") : "(missing)"}`);
console.log(`enter: ${stringifyValue(stageData.enter ?? null)}`);
console.log(`exit: ${stringifyValue(stageData.exit ?? null)}`);

for (const [tileValue, tileName] of TILE_NAMES.entries()) {
  console.log(`${tileName}(${tileValue}): ${counts.get(tileValue) ?? 0}`);
}

if (warnings.length > 0) {
  console.log("warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
