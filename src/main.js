import CollisionSystem from "./CollisionSystem.js";
import GameLoop from "./GameLoop.js";
import GameState from "./GameState.js";
import HUD from "./HUD.js";
import InputManager from "./InputManager.js";
import PlayerController from "./PlayerController.js?v=eng04_input_buffer_v1";
import Renderer from "./Renderer.js";
import StageLoader, { STAGE_ORDER } from "./StageLoader.js";

const canvas = document.querySelector("#game-canvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("[Main] Canvas element #game-canvas was not found.");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("[Main] Canvas2D context is not available.");
}

let currentViewport = {
  width: canvas.clientWidth || window.innerWidth || 1,
  height: canvas.clientHeight || window.innerHeight || 1,
  pixelRatio: Math.max(1, window.devicePixelRatio || 1),
};

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
    hud.setStatusMessage("");
  },
});

const DEFAULT_STAGE_ID = "story_001";
const VALIDATION_STAGE_ID = "eng04_death_validation";
const availableStageIds = new Set([DEFAULT_STAGE_ID, VALIDATION_STAGE_ID]);

function getRequestedStageId() {
  const params = new URLSearchParams(window.location.search);
  const requestedStageId = params.get("stage");

  if (!requestedStageId) {
    return DEFAULT_STAGE_ID;
  }

  if (availableStageIds.has(requestedStageId)) {
    return requestedStageId;
  }

  hud.setStatusMessage(`关卡 ${requestedStageId} 尚未接入，当前回到 Story 1。`);
  return DEFAULT_STAGE_ID;
}

function getHudViewModel() {
  const nextStageId = gameState.getNextStageId();
  const hasPlayableNextStage = availableStageIds.has(nextStageId);

  return {
    gameState: gameState.getState(),
    currentStageId: gameState.currentStageId,
    loadingText: "加载中...",
    menuTitle: "TOTM MVP",
    menuSubtitle: "滑动角色，直到撞墙停下。",
    menuActionLabel: "开始游戏",
    menuAction: "start_game",
    completeActionLabel: hasPlayableNextStage ? "下一关" : "重复游玩",
    completeAction: hasPlayableNextStage ? "next_stage" : "replay_stage",
    statusMessage: hud.viewModel?.statusMessage ?? "",
  };
}

function resolveViewport() {
  const visualViewport = window.visualViewport;
  const width = Number.isFinite(visualViewport?.width) && visualViewport.width > 0
    ? visualViewport.width
    : window.innerWidth || canvas.clientWidth || 1;
  const height = Number.isFinite(visualViewport?.height) && visualViewport.height > 0
    ? visualViewport.height
    : window.innerHeight || canvas.clientHeight || 1;

  return {
    width,
    height,
    pixelRatio: Math.max(1, window.devicePixelRatio || 1),
  };
}

function resizeCanvas() {
  currentViewport = resolveViewport();
  const targetWidth = Math.max(1, Math.round(currentViewport.width * currentViewport.pixelRatio));
  const targetHeight = Math.max(1, Math.round(currentViewport.height * currentViewport.pixelRatio));

  canvas.style.width = `${currentViewport.width}px`;
  canvas.style.height = `${currentViewport.height}px`;

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  context.setTransform(currentViewport.pixelRatio, 0, 0, currentViewport.pixelRatio, 0, 0);
  renderer.snapCameraToFocus(currentViewport);
}

function render(deltaTime) {
  renderer.render(deltaTime, currentViewport);
  hud.render(context, canvas, getHudViewModel(), currentViewport);
}

function reportNavigationError(error) {
  console.error(error);
}

function handleHudAction(action) {
  if (action === "start_game") {
    void startGame().catch(reportNavigationError);
    return;
  }

  if (action === "restart") {
    void restartCurrentStage().catch(reportNavigationError);
    return;
  }

  if (action === "next_stage") {
    void advanceToNextStage().catch(reportNavigationError);
    return;
  }

  if (action === "replay_stage") {
    void loadStageById(gameState.currentStageId || "story_001").catch(reportNavigationError);
  }
}

function getCanvasCoordinatesFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? currentViewport.width / rect.width : 1;
  const scaleY = rect.height > 0 ? currentViewport.height / rect.height : 1;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function canHandleHudPointer() {
  const state = gameState.getState();
  return state === "menu" || state === "paused_fail" || state === "paused_complete";
}

function handleHudPointer(clientX, clientY) {
  if (!canHandleHudPointer()) {
    return false;
  }

  const { x, y } = getCanvasCoordinatesFromClient(clientX, clientY);
  const action = hud.handleClick(x, y, getHudViewModel());

  if (!action) {
    return false;
  }

  handleHudAction(action);
  return true;
}

async function loadStageById(stageId) {
  if (!stageId) {
    return false;
  }

  if (!availableStageIds.has(stageId)) {
    hud.setStatusMessage(`关卡 ${stageId} 尚未接入，当前回到 Story 1。`);
    gameState.setState("menu");
    return false;
  }

  hud.dismiss();
  hud.setStatusMessage("");
  gameState.setState("loading");
  const result = await stageLoader.loadAndStart(stageId);

  if (!result.success) {
    hud.setStatusMessage(`关卡加载失败：${result.error}`);
    gameState.setState("menu");
    throw new Error(`[Main] Failed to load stage ${stageId}: ${result.error}`);
  }

  return true;
}

async function startGame() {
  const stageId = gameState.currentStageId && availableStageIds.has(gameState.currentStageId)
    ? gameState.currentStageId
    : getRequestedStageId();

  return loadStageById(stageId);
}

async function restartCurrentStage() {
  return loadStageById(gameState.currentStageId || getRequestedStageId());
}

async function advanceToNextStage() {
  const nextStageId = gameState.getNextStageId();

  if (availableStageIds.has(nextStageId)) {
    return loadStageById(nextStageId);
  }

  hud.setStatusMessage("后续关卡尚未接入，当前回到 Story 1。");
  return loadStageById(STAGE_ORDER[0] || DEFAULT_STAGE_ID);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
window.visualViewport?.addEventListener("resize", resizeCanvas);
window.visualViewport?.addEventListener("scroll", resizeCanvas);
canvas.addEventListener("click", (event) => {
  handleHudPointer(event.clientX, event.clientY);
});
canvas.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];

  if (!touch) {
    return;
  }

  if (handleHudPointer(touch.clientX, touch.clientY)) {
    event.preventDefault();
  }
}, { passive: false });

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
    inputManager.update(deltaTime);
    playerController.update(deltaTime);
    hud.update(deltaTime);
  },
  render,
});

async function bootstrap() {
  resizeCanvas();
  gameState.setState("menu");
  gameLoop.start();
}

void bootstrap();
