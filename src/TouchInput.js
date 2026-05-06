const INVALID_DPI_WIDTH_FACTOR = 0.024;
const NORMAL_DPI_FACTOR = 0.128;
const SWIPE_TIME_SECONDS = 1.0;
const MIN_VALID_DPI = 100;
const MAX_VALID_DPI = 1000;
const DEBUG_INPUT_PARAM = "debugInput";
const DEBUG_INPUT_LOG_LIMIT = 500;

function shouldEnableDebugInput() {
  try {
    return new URLSearchParams(window.location.search).get(DEBUG_INPUT_PARAM) === "1";
  } catch {
    return false;
  }
}

function getTouchPosition(touch) {
  return {
    x: touch.clientX,
    y: touch.clientY,
  };
}

function findTouchByIdentifier(touches, identifier) {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches[index];
    if (touch.identifier === identifier) {
      return touch;
    }
  }

  return null;
}

function getTouchListLength(touches) {
  return touches?.length ?? 0;
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
    this.swipeTime = SWIPE_TIME_SECONDS;
    this.swipeTimeout = this.swipeTime;
    this.tracking = false;
    this.activeTouchId = null;
    this.startX = 0;
    this.startY = 0;
    this.detectedDirection = null;
    this.debugEnabled = shouldEnableDebugInput();
    this.debugLog = [];

    if (this.debugEnabled) {
      window.__totmInputLog = this.debugLog;
      window.__totmInputState = () => this.createDebugSnapshot("manual");
    }

    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);
    this.boundOnTouchCancel = this.onTouchCancel.bind(this);

    this.canvas.addEventListener("touchstart", this.boundOnTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundOnTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundOnTouchEnd);
    this.canvas.addEventListener("touchcancel", this.boundOnTouchCancel);
  }

  createDebugSnapshot(eventName, details = {}) {
    return {
      t: Number(performance.now().toFixed(1)),
      event: eventName,
      tracking: this.tracking,
      swipeTimeout: Number(this.swipeTimeout.toFixed(3)),
      swipeTime: this.swipeTime,
      swipeThreshold: Number(this.swipeThreshold.toFixed(2)),
      activeTouchId: this.activeTouchId,
      startX: Number(this.startX.toFixed(1)),
      startY: Number(this.startY.toFixed(1)),
      detectedDirection: this.detectedDirection,
      ...details,
    };
  }

  pushDebugLog(eventName, details = {}) {
    if (!this.debugEnabled) {
      return;
    }

    this.debugLog.push(this.createDebugSnapshot(eventName, details));

    if (this.debugLog.length > DEBUG_INPUT_LOG_LIMIT) {
      this.debugLog.splice(0, this.debugLog.length - DEBUG_INPUT_LOG_LIMIT);
    }
  }

  onTouchStart(event) {
    event.preventDefault();

    if (this.tracking) {
      this.pushDebugLog("touchstart:already-tracking", {
        touches: event.touches.length,
        changedTouches: getTouchListLength(event.changedTouches),
      });
      return;
    }

    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) {
      this.pushDebugLog("touchstart:no-touch", {
        touches: event.touches.length,
        changedTouches: getTouchListLength(event.changedTouches),
      });
      return;
    }

    const position = getTouchPosition(touch);
    this.activeTouchId = touch.identifier;
    this.startX = position.x;
    this.startY = position.y;
    this.swipeTimeout = this.swipeTime;
    this.detectedDirection = null;
    this.tracking = true;
    this.pushDebugLog("touchstart", {
      touches: event.touches.length,
      changedTouches: getTouchListLength(event.changedTouches),
      touchId: touch.identifier,
      x: Number(position.x.toFixed(1)),
      y: Number(position.y.toFixed(1)),
    });
  }

  onTouchMove(event) {
    event.preventDefault();

    if (!this.tracking) {
      this.pushDebugLog("touchmove:not-tracking", {
        touches: event.touches.length,
        changedTouches: getTouchListLength(event.changedTouches),
      });
      return;
    }

    const touch = findTouchByIdentifier(event.touches, this.activeTouchId);
    if (!touch) {
      this.pushDebugLog("touchmove:active-touch-missing", {
        touches: event.touches.length,
        changedTouches: getTouchListLength(event.changedTouches),
      });
      return;
    }

    if (this.swipeTimeout <= 0) {
      const position = getTouchPosition(touch);
      this.startX = position.x;
      this.startY = position.y;
      this.swipeTimeout = this.swipeTime;
      this.pushDebugLog("touchmove:timeout-reset", {
        touches: event.touches.length,
        changedTouches: getTouchListLength(event.changedTouches),
        touchId: touch.identifier,
        x: Number(position.x.toFixed(1)),
        y: Number(position.y.toFixed(1)),
      });
      return;
    }

    const position = getTouchPosition(touch);
    const dx = position.x - this.startX;
    const dy = position.y - this.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx <= this.swipeThreshold && absDy <= this.swipeThreshold) {
      this.pushDebugLog("touchmove:below-threshold", {
        touches: event.touches.length,
        changedTouches: getTouchListLength(event.changedTouches),
        touchId: touch.identifier,
        x: Number(position.x.toFixed(1)),
        y: Number(position.y.toFixed(1)),
        dx: Number(dx.toFixed(1)),
        dy: Number(dy.toFixed(1)),
        absDx: Number(absDx.toFixed(1)),
        absDy: Number(absDy.toFixed(1)),
      });
      return;
    }

    if (absDx > absDy) {
      this.detectedDirection = dx > 0 ? "right" : "left";
    } else {
      this.detectedDirection = dy > 0 ? "down" : "up";
    }

    this.pushDebugLog("touchmove:direction", {
      touches: event.touches.length,
      changedTouches: getTouchListLength(event.changedTouches),
      touchId: touch.identifier,
      x: Number(position.x.toFixed(1)),
      y: Number(position.y.toFixed(1)),
      dx: Number(dx.toFixed(1)),
      dy: Number(dy.toFixed(1)),
      absDx: Number(absDx.toFixed(1)),
      absDy: Number(absDy.toFixed(1)),
      direction: this.detectedDirection,
    });
    this.startX = position.x;
    this.startY = position.y;
  }

  update(deltaTime = 0) {
    if (!this.tracking) {
      return;
    }

    const elapsed = Math.max(deltaTime, 0);
    this.swipeTimeout = Math.max(0, this.swipeTimeout - elapsed);
  }

  finishActiveTouch(event, eventName) {
    const endedActiveTouch = findTouchByIdentifier(event.changedTouches, this.activeTouchId);
    this.pushDebugLog(eventName, {
      touches: event.touches.length,
      changedTouches: getTouchListLength(event.changedTouches),
      wasTracking: this.tracking,
      endedActiveTouch: Boolean(endedActiveTouch),
    });

    if (!endedActiveTouch) {
      return;
    }

    this.tracking = false;
    this.activeTouchId = null;
  }

  onTouchEnd(event) {
    this.finishActiveTouch(event, "touchend");
  }

  onTouchCancel(event) {
    this.finishActiveTouch(event, "touchcancel");
  }

  getDirection() {
    const direction = this.detectedDirection;
    this.detectedDirection = null;
    if (direction) {
      this.pushDebugLog("getDirection", {
        direction,
      });
    }
    return direction;
  }

  reset() {
    this.pushDebugLog("reset", {
      wasTracking: this.tracking,
    });
    this.tracking = false;
    this.activeTouchId = null;
    this.detectedDirection = null;
    this.swipeTimeout = this.swipeTime;
  }
}
