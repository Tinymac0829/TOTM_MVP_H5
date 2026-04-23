import GameLoop from "./GameLoop.js";
import GameState from "./GameState.js";

const canvas = document.querySelector("#game-canvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("[Main] Canvas element #game-canvas was not found.");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("[Main] Canvas2D context is not available.");
}

const gameState = new GameState();

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
}

function render(deltaTime) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  void deltaTime;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#18232d";
  context.fillRect(0, 0, width, height);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

gameState.onChange(({ previousState, nextState }) => {
  console.log(`[GameState] ${previousState} -> ${nextState}`);
});

resizeCanvas();
gameState.setState("menu");

const gameLoop = new GameLoop({
  fixedUpdate: () => {
    if (!gameState.isPlaying()) {
      return;
    }
  },
  render,
});

gameLoop.start();
