const DEFAULT_SWIPE_THRESHOLD = 0.3;

function getNormalizedTouchPosition(touch, canvas) {
  const width = Math.max(1, canvas.clientWidth || canvas.width || 1);
  const height = Math.max(1, canvas.clientHeight || canvas.height || 1);

  return {
    x: touch.clientX / width,
    y: touch.clientY / height,
  };
}

export default class TouchInput {
  constructor({ canvas, swipeThreshold = DEFAULT_SWIPE_THRESHOLD } = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("[TouchInput] canvas must be an HTMLCanvasElement.");
    }

    this.canvas = canvas;
    this.swipeThreshold = swipeThreshold;
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

    const normalized = getNormalizedTouchPosition(touch, this.canvas);
    this.startX = normalized.x;
    this.startY = normalized.y;
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

    const normalized = getNormalizedTouchPosition(touch, this.canvas);
    const dx = normalized.x - this.startX;
    const dy = normalized.y - this.startY;

    if (Math.abs(dx) < this.swipeThreshold && Math.abs(dy) < this.swipeThreshold) {
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.detectedDirection = dx > 0 ? "right" : "left";
    } else {
      this.detectedDirection = dy > 0 ? "down" : "up";
    }

    this.tracking = false;
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
