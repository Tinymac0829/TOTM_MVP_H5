import KeyboardInput from "./KeyboardInput.js";
import TouchInput from "./TouchInput.js";

export default class InputManager {
  constructor({ canvas, keyboardTarget = window } = {}) {
    this.touchInput = new TouchInput({ canvas });
    this.keyboardInput = new KeyboardInput({ target: keyboardTarget });
    this.currentDirection = null;
    this.enabled = true;
  }

  update(deltaTime = 0) {
    this.touchInput.update(deltaTime);

    if (!this.enabled) {
      this.currentDirection = null;
      this.touchInput.reset();
      this.keyboardInput.reset();
      return;
    }

    let direction = this.touchInput.getDirection();
    if (!direction) {
      direction = this.keyboardInput.getDirection();
    }

    if (direction) {
      this.currentDirection = direction;
    }
  }

  consumeDirection() {
    const direction = this.currentDirection;
    this.currentDirection = null;
    return direction;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.currentDirection = null;
    this.touchInput.reset();
    this.keyboardInput.reset();

    if (!this.enabled) {
      return;
    }
  }
}
