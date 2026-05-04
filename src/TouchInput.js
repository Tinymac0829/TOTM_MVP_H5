const INVALID_DPI_WIDTH_FACTOR = 0.024;
const NORMAL_DPI_FACTOR = 0.128;
const MIN_VALID_DPI = 100;
const MAX_VALID_DPI = 1000;

function getTouchPosition(touch) {
  return {
    x: touch.clientX,
    y: touch.clientY,
  };
}

function resolveScreenDpi() {
  const dpi = window.screen?.deviceXDPI
    ?? window.screen?.logicalXDPI
    ?? (window.devicePixelRatio || 1) * 96;

  return Number.isFinite(dpi) ? dpi : 0;
}

function resolveSwipeThreshold(canvas) {
  const dpi = resolveScreenDpi();

  if (dpi <= MIN_VALID_DPI || dpi >= MAX_VALID_DPI) {
    const width = canvas.clientWidth || canvas.getBoundingClientRect().width || window.innerWidth || 1;
    return width * INVALID_DPI_WIDTH_FACTOR;
  }

  return dpi * NORMAL_DPI_FACTOR;
}

export default class TouchInput {
  constructor({ canvas, swipeThreshold = null } = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("[TouchInput] canvas must be an HTMLCanvasElement.");
    }

    this.canvas = canvas;
    this.swipeThreshold = swipeThreshold ?? resolveSwipeThreshold(canvas);
    this.tracking = false;
    this.startX = 0;
    this.startY = 0;
    this.detectedDirection = null;

    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);

    this.canvas.addEventListener("touchstart", this.boundOnTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundOnTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundOnTouchEnd);
    this.canvas.addEventListener("touchcancel", this.boundOnTouchEnd);
  }

  onTouchStart(event) {
    event.preventDefault();

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const position = getTouchPosition(touch);
    this.startX = position.x;
    this.startY = position.y;
    this.tracking = true;
  }

  onTouchMove(event) {
    event.preventDefault();

    if (!this.tracking) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const position = getTouchPosition(touch);
    const dx = position.x - this.startX;
    const dy = position.y - this.startY;

    if (Math.abs(dx) <= this.swipeThreshold && Math.abs(dy) <= this.swipeThreshold) {
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.detectedDirection = dx > 0 ? "right" : "left";
    } else {
      this.detectedDirection = dy > 0 ? "down" : "up";
    }

    this.startX = position.x;
    this.startY = position.y;
  }

  onTouchEnd() {
    this.tracking = false;
  }

  getDirection() {
    const direction = this.detectedDirection;
    this.detectedDirection = null;
    return direction;
  }

  reset() {
    this.tracking = false;
    this.detectedDirection = null;
  }
}
