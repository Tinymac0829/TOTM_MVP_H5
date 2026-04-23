const STEP_EPSILON = 1e-9;

export default class GameLoop {
  constructor({ fixedDeltaTime = 0.02, maxFixedSteps = 5, fixedUpdate, update, render } = {}) {
    this.fixedDeltaTime = fixedDeltaTime;
    this.maxFixedSteps = maxFixedSteps;
    this.fixedUpdate = fixedUpdate ?? (() => {});
    this.update = update ?? (() => {});
    this.render = render ?? (() => {});

    this.accumulator = 0;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.running = false;
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame((time) => this.tick(time));
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = null;
    this.running = false;
  }

  tick(currentTime) {
    if (!this.running) {
      return;
    }

    const deltaTime = Math.max(0, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    let fixedSteps = 0;
    while (this.accumulator + STEP_EPSILON >= this.fixedDeltaTime && fixedSteps < this.maxFixedSteps) {
      this.fixedUpdate(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
      fixedSteps += 1;
    }

    if (fixedSteps === this.maxFixedSteps) {
      this.accumulator = 0;
    }

    this.update(deltaTime);
    this.render(deltaTime);
    this.animationFrameId = requestAnimationFrame((time) => this.tick(time));
  }
}
