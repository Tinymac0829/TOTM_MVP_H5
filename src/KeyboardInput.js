const KEY_DIRECTION_MAP = Object.freeze({
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
});

export default class KeyboardInput {
  constructor({ target = window } = {}) {
    this.target = target;
    this.keyStates = Object.create(null);
    this.pendingDirection = null;

    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);

    this.target.addEventListener("keydown", this.boundOnKeyDown);
    this.target.addEventListener("keyup", this.boundOnKeyUp);
  }

  onKeyDown(event) {
    const direction = KEY_DIRECTION_MAP[event.key];
    if (!direction) {
      return;
    }

    event.preventDefault();

    if (this.keyStates[event.key]) {
      return;
    }

    this.keyStates[event.key] = true;
    this.pendingDirection = direction;
  }

  onKeyUp(event) {
    if (!KEY_DIRECTION_MAP[event.key]) {
      return;
    }

    this.keyStates[event.key] = false;
  }

  getDirection() {
    const direction = this.pendingDirection;
    this.pendingDirection = null;
    return direction;
  }

  reset() {
    this.keyStates = Object.create(null);
    this.pendingDirection = null;
  }
}
