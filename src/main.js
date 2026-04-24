import CollisionSystem from "./CollisionSystem.js";
import GameLoop from "./GameLoop.js";
import GameState from "./GameState.js";
import HUD from "./HUD.js";
import InputManager from "./InputManager.js";
import PlayerController from "./PlayerController.js";
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
const hud = new HUD();
const inputManager = new InputManager({ canvas });
const collisionSystem = new CollisionSystem();
const playerController = new PlayerController({
  collisionSystem,
  onCollect: ({ type }) => {
    hud.addCollectible(type);
  },
  onDeath: () => {
    gameState.onPlayerDead();
    hud.showFailPopup();
  },
  onExit: () => {
    gameState.onStageComplete();
    hud.showCompletePopup();
  },
});
const renderer = new Renderer({
  canvas,
  context,
});
const stageLoader = new StageLoader({
  gameState,
  onStageReady: ({ gridMap, counts, stageData }) => {
    collisionSystem.setGridMap(gridMap);
    playerController.setGridMap(gridMap);
    playerController.reset(gridMap.enter.x, gridMap.enter.z);
    renderer.setGridMap(gridMap);
    renderer.setPlayer(playerController);
    renderer.setFocusTarget(playerController);
    hud.reset({ counts });
    gameState.currentStageId = stageData.id;
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
  hud.render(context, canvas);
}

function handleHudAction(action) {
  if (action === "restart") {
    void restartCurrentStage();
    return;
  }

  if (action === "next_stage") {
    void loadStageById(gameState.getNextStageId());
  }
}

function getCanvasCoordinates(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = (canvas.clientWidth || rect.width || 1) / Math.max(rect.width, 1);
  const scaleY = (canvas.clientHeight || rect.height || 1) / Math.max(rect.height, 1);

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

async function loadStageById(stageId) {
  if (!stageId) {
    return false;
  }

  gameState.setState("loading");
  const result = await stageLoader.loadAndStart(stageId);

  if (!result.success) {
    gameState.setState("menu");
    throw new Error(`[Main] Failed to load stage ${stageId}: ${result.error}`);
  }

  return true;
}

async function restartCurrentStage() {
  return loadStageById(gameState.currentStageId);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
canvas.addEventListener("click", (event) => {
  const { x, y } = getCanvasCoordinates(event);
  const action = hud.handleClick(x, y);

  if (action) {
    handleHudAction(action);
  }
});

gameState.onChange(({ previousState, nextState }) => {
  inputManager.setEnabled(nextState === "playing");
  console.log(`[GameState] ${previousState} -> ${nextState}`);
});

const gameLoop = new GameLoop({
  fixedUpdate: (fixedDeltaTime) => {
    if (!gameState.isPlaying()) {
      return;
    }

    const direction = inputManager.consumeDirection();
    playerController.fixedUpdate(fixedDeltaTime, direction);
  },
  update: (deltaTime) => {
    inputManager.update();
    hud.update(deltaTime);
  },
  render,
});

async function bootstrap() {
  resizeCanvas();
  gameState.setState("menu");
  gameLoop.start();

  await loadStageById("story_001");
}

void bootstrap();
