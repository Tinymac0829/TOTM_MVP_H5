const HUD_DESIGN_WIDTH = 1080;
const HUD_DESIGN_HEIGHT = 1920;

const TOP_BAR_RECT = Object.freeze({ x: 0, y: 0, w: 1080, h: 80 });
const FAIL_PANEL_RECT = Object.freeze({ x: 140, y: 600, w: 800, h: 500 });
const FAIL_BUTTON_RECT = Object.freeze({ x: 290, y: 900, w: 500, h: 80 });
const COMPLETE_PANEL_RECT = Object.freeze({ x: 140, y: 500, w: 800, h: 700 });
const COMPLETE_BUTTON_RECT = Object.freeze({ x: 290, y: 1000, w: 500, h: 80 });
const MENU_PANEL_RECT = Object.freeze({ x: 120, y: 420, w: 840, h: 760 });
const MENU_BUTTON_RECT = Object.freeze({ x: 290, y: 1120, w: 500, h: 100 });
const LOADING_PANEL_RECT = Object.freeze({ x: 180, y: 760, w: 720, h: 280 });

const DEFAULT_VIEW_MODEL = Object.freeze({
  gameState: "playing",
  currentStageId: null,
  loadingText: "加载中...",
  menuTitle: "TOTM MVP",
  menuSubtitle: "滑动路径，抵达出口。",
  menuActionLabel: "开始游戏",
  menuAction: "start_game",
  completeActionLabel: "下一关",
  completeAction: "next_stage",
  statusMessage: "",
});

function resolveViewport(canvas) {
  return {
    width: canvas.clientWidth || canvas.width || 0,
    height: canvas.clientHeight || canvas.height || 0,
  };
}

function normalizeViewport(canvas, viewport = null) {
  if (viewport && Number.isFinite(viewport.width) && Number.isFinite(viewport.height)) {
    return {
      width: viewport.width,
      height: viewport.height,
    };
  }

  return resolveViewport(canvas);
}

function resolveFrame(viewport) {
  const scale = Math.min(
    viewport.width / HUD_DESIGN_WIDTH || 1,
    viewport.height / HUD_DESIGN_HEIGHT || 1,
  );
  const contentWidth = HUD_DESIGN_WIDTH * scale;
  const contentHeight = HUD_DESIGN_HEIGHT * scale;

  return {
    scale,
    offsetX: (viewport.width - contentWidth) / 2,
    offsetY: (viewport.height - contentHeight) / 2,
  };
}

function scaleRect(frame, rect) {
  return {
    x: frame.offsetX + rect.x * frame.scale,
    y: frame.offsetY + rect.y * frame.scale,
    w: rect.w * frame.scale,
    h: rect.h * frame.scale,
  };
}

function insideRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function clampAlpha(value) {
  return Math.min(1, Math.max(0, value));
}

function formatStageLabel(stageId) {
  if (!stageId) {
    return "Story 1";
  }

  const match = /story_(\d+)/i.exec(stageId);
  if (!match) {
    return stageId;
  }

  return `Story ${Number(match[1])}`;
}

function truncateMessage(message, maxLength = 72) {
  if (!message || message.length <= maxLength) {
    return message;
  }

  return `${message.slice(0, maxLength - 1)}…`;
}

export default class HUD {
  constructor() {
    this.stars = 0;
    this.coins = 0;
    this.dots = 0;
    this.dotsTotal = 0;

    this.popupType = null;
    this.popupAlpha = 0;
    this.popupAnimating = false;
    this.popupFadeInDuration = 0.3;
    this.popupFadeInTimer = 0;

    this.viewModel = { ...DEFAULT_VIEW_MODEL };
    this.interactiveButtons = [];
    this.buttonRect = null;
  }

  reset({ counts } = {}) {
    this.stars = 0;
    this.coins = 0;
    this.dots = 0;
    this.dotsTotal = counts?.dot ?? 0;
    this.viewModel.statusMessage = "";

    this.dismiss();
  }

  addCollectible(type) {
    if (type === "star") {
      this.stars += 1;
      return;
    }

    if (type === "coin") {
      this.coins += 1;
      return;
    }

    if (type === "dot") {
      this.dots += 1;
    }
  }

  setStatusMessage(message) {
    this.viewModel.statusMessage = message ? String(message) : "";
  }

  setMenuAction({ label, action } = {}) {
    if (label) {
      this.viewModel.menuActionLabel = label;
    }

    if (action) {
      this.viewModel.menuAction = action;
    }
  }

  setCompleteAction({ label, action } = {}) {
    if (label) {
      this.viewModel.completeActionLabel = label;
    }

    if (action) {
      this.viewModel.completeAction = action;
    }
  }

  showFailPopup() {
    this.showPopup("fail");
  }

  showCompletePopup() {
    this.showPopup("complete");
  }

  showPopup(type) {
    this.popupType = type;
    this.popupAlpha = 0;
    this.popupAnimating = true;
    this.popupFadeInTimer = 0;
    this.interactiveButtons = [];
    this.buttonRect = null;
  }

  dismiss() {
    this.popupType = null;
    this.popupAlpha = 0;
    this.popupAnimating = false;
    this.popupFadeInTimer = 0;
    this.interactiveButtons = [];
    this.buttonRect = null;
  }

  update(dt) {
    if (!this.popupAnimating) {
      return;
    }

    this.popupFadeInTimer += dt;
    this.popupAlpha = clampAlpha(this.popupFadeInTimer / this.popupFadeInDuration);

    if (this.popupAlpha >= 1) {
      this.popupAnimating = false;
    }
  }

  handleClick(x, y, viewModel = {}) {
    const model = this.resolveViewModel(viewModel);
    const overlayMode = this.resolveOverlayMode(model.gameState);

    if ((overlayMode === "fail" || overlayMode === "complete") && this.popupAnimating) {
      return null;
    }

    const hitButton = this.interactiveButtons.find((button) => insideRect(x, y, button.rect));
    if (!hitButton) {
      return null;
    }

    if (overlayMode === "fail" || overlayMode === "complete") {
      this.dismiss();
    }

    return hitButton.action;
  }

  render(context, canvas, viewModel = {}, viewportOverride = null) {
    const viewport = normalizeViewport(canvas, viewportOverride);
    const frame = resolveFrame(viewport);
    const model = this.resolveViewModel(viewModel);
    const overlayMode = this.resolveOverlayMode(model.gameState);

    this.interactiveButtons = [];
    this.buttonRect = null;

    if (this.shouldRenderTopBar(model.gameState, overlayMode)) {
      this.renderTopBar(context, frame);
    }

    if (overlayMode === "menu") {
      this.renderMenu(context, frame, model);
      return;
    }

    if (overlayMode === "loading") {
      this.renderLoading(context, frame, model);
      return;
    }

    if (overlayMode === "fail") {
      this.renderFailPopup(context, frame);
      return;
    }

    if (overlayMode === "complete") {
      this.renderCompletePopup(context, frame, model);
    }
  }

  resolveViewModel(viewModel = {}) {
    this.viewModel = {
      ...DEFAULT_VIEW_MODEL,
      ...this.viewModel,
      ...viewModel,
    };

    return this.viewModel;
  }

  resolveOverlayMode(gameState) {
    if (gameState === "menu") {
      return "menu";
    }

    if (gameState === "loading") {
      return "loading";
    }

    if (this.popupType === "fail") {
      return "fail";
    }

    if (this.popupType === "complete") {
      return "complete";
    }

    return null;
  }

  shouldRenderTopBar(gameState, overlayMode) {
    if (overlayMode === "fail" || overlayMode === "complete") {
      return true;
    }

    return gameState === "playing";
  }

  renderTopBar(context, frame) {
    const barRect = scaleRect(frame, TOP_BAR_RECT);
    const paddingX = frame.offsetX + 20 * frame.scale;
    const textY = frame.offsetY + 50 * frame.scale;
    const fontSize = Math.max(18, Math.round(32 * frame.scale));

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.5)";
    context.fillRect(barRect.x, barRect.y, barRect.w, barRect.h);

    context.font = `${fontSize}px Arial, sans-serif`;
    context.textAlign = "left";
    context.fillStyle = "#ffffff";
    context.fillText(`星 ${this.stars}/3`, paddingX, textY);

    context.fillStyle = "#ffcc00";
    context.fillText(`币 ${this.coins}`, frame.offsetX + 300 * frame.scale, textY);

    context.fillStyle = "#ffffff";
    context.fillText(`点 ${this.dots}/${this.dotsTotal}`, frame.offsetX + 580 * frame.scale, textY);
    context.restore();
  }

  renderMenu(context, frame, model) {
    const panelRect = scaleRect(frame, MENU_PANEL_RECT);
    const titleSize = Math.max(28, Math.round(60 * frame.scale));
    const textSize = Math.max(18, Math.round(30 * frame.scale));
    const smallTextSize = Math.max(16, Math.round(24 * frame.scale));
    const message = truncateMessage(model.statusMessage, 84);

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.72)";
    context.fillRect(0, 0, frame.offsetX * 2 + HUD_DESIGN_WIDTH * frame.scale, frame.offsetY * 2 + HUD_DESIGN_HEIGHT * frame.scale);

    context.fillStyle = "rgba(20, 28, 40, 0.92)";
    context.fillRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h);
    context.strokeStyle = "rgba(111, 199, 255, 0.9)";
    context.lineWidth = Math.max(2, 4 * frame.scale);
    context.strokeRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h);

    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.font = `700 ${titleSize}px Georgia, serif`;
    context.fillText(model.menuTitle, frame.offsetX + 540 * frame.scale, frame.offsetY + 620 * frame.scale);

    context.font = `${textSize}px Arial, sans-serif`;
    context.fillStyle = "rgba(255, 255, 255, 0.92)";
    context.fillText(model.menuSubtitle, frame.offsetX + 540 * frame.scale, frame.offsetY + 740 * frame.scale);
    context.fillText(`当前入口：${formatStageLabel(model.currentStageId)}`, frame.offsetX + 540 * frame.scale, frame.offsetY + 860 * frame.scale);

    if (message) {
      context.fillStyle = "#ffad66";
      context.font = `${smallTextSize}px Arial, sans-serif`;
      context.fillText(message, frame.offsetX + 540 * frame.scale, frame.offsetY + 980 * frame.scale);
    }

    this.renderButton(context, frame, MENU_BUTTON_RECT, {
      alpha: 1,
      label: model.menuActionLabel,
      action: model.menuAction,
    });
    context.restore();
  }

  renderLoading(context, frame, model) {
    const panelRect = scaleRect(frame, LOADING_PANEL_RECT);
    const titleSize = Math.max(24, Math.round(48 * frame.scale));
    const textSize = Math.max(16, Math.round(26 * frame.scale));

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.52)";
    context.fillRect(0, 0, frame.offsetX * 2 + HUD_DESIGN_WIDTH * frame.scale, frame.offsetY * 2 + HUD_DESIGN_HEIGHT * frame.scale);

    context.fillStyle = "rgba(16, 24, 36, 0.92)";
    context.fillRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h);
    context.strokeStyle = "rgba(111, 199, 255, 0.85)";
    context.lineWidth = Math.max(2, 3 * frame.scale);
    context.strokeRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h);

    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.font = `700 ${titleSize}px Arial, sans-serif`;
    context.fillText(model.loadingText, frame.offsetX + 540 * frame.scale, frame.offsetY + 900 * frame.scale);

    context.font = `${textSize}px Arial, sans-serif`;
    context.fillStyle = "rgba(255, 255, 255, 0.78)";
    context.fillText(formatStageLabel(model.currentStageId), frame.offsetX + 540 * frame.scale, frame.offsetY + 980 * frame.scale);
    context.restore();
  }

  renderFailPopup(context, frame) {
    const alpha = this.popupAlpha;
    const panelRect = scaleRect(frame, FAIL_PANEL_RECT);

    context.save();
    this.renderOverlay(context, frame, 0.7 * alpha);

    context.fillStyle = `rgba(42, 42, 42, ${alpha})`;
    context.fillRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h);
    context.strokeStyle = `rgba(111, 199, 255, ${alpha})`;
    context.lineWidth = Math.max(2, 3 * frame.scale);
    context.strokeRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h);

    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.textAlign = "center";
    context.font = `700 ${Math.max(28, Math.round(48 * frame.scale))}px Arial, sans-serif`;
    context.fillText("失败", frame.offsetX + 540 * frame.scale, frame.offsetY + 720 * frame.scale);

    context.font = `${Math.max(16, Math.round(24 * frame.scale))}px Arial, sans-serif`;
    context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    context.fillText("回到入口，重新规划路线。", frame.offsetX + 540 * frame.scale, frame.offsetY + 800 * frame.scale);

    this.renderButton(context, frame, FAIL_BUTTON_RECT, {
      alpha,
      label: "重新开始",
      action: "restart",
    });
    context.restore();
  }

  renderCompletePopup(context, frame, model) {
    const alpha = this.popupAlpha;
    const panelRect = scaleRect(frame, COMPLETE_PANEL_RECT);

    context.save();
    this.renderOverlay(context, frame, 0.7 * alpha);

    context.fillStyle = `rgba(42, 42, 42, ${alpha})`;
    context.fillRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h);
    context.strokeStyle = `rgba(111, 199, 255, ${alpha})`;
    context.lineWidth = Math.max(2, 3 * frame.scale);
    context.strokeRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h);

    context.textAlign = "center";
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.font = `700 ${Math.max(28, Math.round(48 * frame.scale))}px Arial, sans-serif`;
    context.fillText("通关！", frame.offsetX + 540 * frame.scale, frame.offsetY + 640 * frame.scale);

    context.font = `${Math.max(16, Math.round(24 * frame.scale))}px Arial, sans-serif`;
    context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.82})`;
    context.fillText(formatStageLabel(model.currentStageId), frame.offsetX + 540 * frame.scale, frame.offsetY + 710 * frame.scale);

    context.font = `700 ${Math.max(22, Math.round(36 * frame.scale))}px Arial, sans-serif`;
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.fillText(`星 ${this.stars}/3`, frame.offsetX + 340 * frame.scale, frame.offsetY + 780 * frame.scale);
    context.fillStyle = `rgba(255, 204, 0, ${alpha})`;
    context.fillText(`币 ${this.coins}`, frame.offsetX + 540 * frame.scale, frame.offsetY + 780 * frame.scale);
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.fillText(`点 ${this.dots}/${this.dotsTotal}`, frame.offsetX + 740 * frame.scale, frame.offsetY + 780 * frame.scale);

    this.renderButton(context, frame, COMPLETE_BUTTON_RECT, {
      alpha,
      label: model.completeActionLabel,
      action: model.completeAction,
    });
    context.restore();
  }

  renderOverlay(context, frame, alpha) {
    context.fillStyle = `rgba(0, 0, 0, ${clampAlpha(alpha)})`;
    context.fillRect(
      0,
      0,
      frame.offsetX * 2 + HUD_DESIGN_WIDTH * frame.scale,
      frame.offsetY * 2 + HUD_DESIGN_HEIGHT * frame.scale,
    );
  }

  renderButton(context, frame, designRect, { alpha, label, action }) {
    const rect = scaleRect(frame, designRect);
    const textY = rect.y + rect.h * 0.64;

    context.fillStyle = `rgba(0, 136, 255, ${alpha})`;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
    context.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
    context.lineWidth = Math.max(2, 2 * frame.scale);
    context.strokeRect(rect.x, rect.y, rect.w, rect.h);

    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.font = `700 ${Math.max(20, Math.round(32 * frame.scale))}px Arial, sans-serif`;
    context.textAlign = "center";
    context.fillText(label, rect.x + rect.w / 2, textY);

    this.buttonRect = rect;
    this.interactiveButtons.push({
      action,
      rect,
    });
  }
}
