import GameLoop from "./GameLoop.js";
import GameState from "./GameState.js";
import InputManager from "./InputManager.js";
import Renderer from "./Renderer.js";
import StageLoader from "./StageLoader.js";

const canvas = document.querySelector("#game-canvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("[Main] Canvas element #game-canvas was not found.");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("[Main] Canvas2D context is not available.");
}

const gameState = new GameState();
const inputManager = new InputManager({ canvas });
const renderer = new Renderer({
  canvas,
  context,
});
const stageLoader = new StageLoader({
  gameState,
  onStageReady: ({ gridMap }) => {
    renderer.setGridMap(gridMap);
  },
});

function resizeCanvas() {
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const width = window.innerWidth;
  const height = window.innerHeight;
  const targetWidth = Math.floor(width * pixelRatio);
  const targetHeight = Math.floor(height * pixelRatio);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  renderer.snapCameraToFocus();
}

function render(deltaTime) {
  renderer.render(deltaTime);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

gameState.onChange(({ previousState, nextState }) => {
  inputManager.setEnabled(nextState === "playing");
  console.log(`[GameState] ${previousState} -> ${nextState}`);
});

const gameLoop = new GameLoop({
  fixedUpdate: () => {
    if (!gameState.isPlaying()) {
      return;
    }
  },
  update: () => {
    inputManager.update();

    if (!gameState.isPlaying()) {
      return;
    }

    const direction = inputManager.consumeDirection();
    if (direction) {
      console.log(`[Input] direction=${direction}`);
    }
  },
  render,
});

async function bootstrap() {
  resizeCanvas();
  gameState.setState("menu");
  gameLoop.start();

  gameState.setState("loading");
  const result = await stageLoader.loadAndStart("story_001");

  if (!result.success) {
    gameState.setState("menu");
    throw new Error(`[Main] Failed to bootstrap story_001: ${result.error}`);
  }
}

void bootstrap();
