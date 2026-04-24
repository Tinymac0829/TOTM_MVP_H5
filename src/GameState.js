const VALID_STATES = new Set([
  "loading",
  "menu",
  "playing",
  "paused",
  "paused_fail",
  "paused_complete",
]);

export default class GameState {
  constructor() {
    this.state = "loading";
    this.currentStageId = null;
    this.stageOrder = ["story_001", "story_002", "story_003"];
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  isPlaying() {
    return this.state === "playing";
  }

  isPaused() {
    return this.state === "paused" || this.state === "paused_fail" || this.state === "paused_complete";
  }

  onPlayerDead() {
    this.setState("paused_fail");
  }

  onStageComplete() {
    this.setState("paused_complete");
  }

  getNextStageId() {
    const currentIndex = this.stageOrder.indexOf(this.currentStageId);
    if (currentIndex === -1 || currentIndex >= this.stageOrder.length - 1) {
      return this.stageOrder[0] ?? null;
    }

    return this.stageOrder[currentIndex + 1];
  }

  setState(nextState) {
    if (!VALID_STATES.has(nextState)) {
      throw new Error(`[GameState] Invalid state: ${nextState}`);
    }

    if (nextState === this.state) {
      return;
    }

    const previousState = this.state;
    this.state = nextState;
    this.notify(previousState, nextState);
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(previousState, nextState) {
    for (const listener of this.listeners) {
      listener({
        previousState,
        nextState,
        currentStageId: this.currentStageId,
      });
    }
  }
}
