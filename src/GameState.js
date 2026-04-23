const VALID_STATES = new Set(["loading", "menu", "playing", "paused"]);

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
