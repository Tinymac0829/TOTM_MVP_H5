function resolveViewport(canvas) {
  return {
    width: canvas.clientWidth || canvas.width || 0,
    height: canvas.clientHeight || canvas.height || 0,
  };
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
    this.buttonRect = null;
  }

  reset({ counts } = {}) {
    this.stars = 0;
    this.coins = 0;
    this.dots = 0;
    this.dotsTotal = counts?.dot ?? 0;

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
    this.buttonRect = null;
  }

  dismiss() {
    this.popupType = null;
    this.popupAlpha = 0;
    this.popupAnimating = false;
    this.popupFadeInTimer = 0;
    this.buttonRect = null;
  }

  update(dt) {
    if (!this.popupAnimating) {
      return;
    }

    this.popupFadeInTimer += dt;
    this.popupAlpha = Math.min(1, this.popupFadeInTimer / this.popupFadeInDuration);

    if (this.popupAlpha >= 1) {
      this.popupAnimating = false;
    }
  }

  handleClick(x, y) {
    if (!this.popupType || this.popupAnimating || !this.buttonRect) {
      return null;
    }

    const inside =
      x >= this.buttonRect.x &&
      x <= this.buttonRect.x + this.buttonRect.w &&
      y >= this.buttonRect.y &&
      y <= this.buttonRect.y + this.buttonRect.h;

    if (!inside) {
      return null;
    }

    const action = this.popupType === "fail" ? "restart" : "next_stage";
    this.dismiss();
    return action;
  }

  render(context, canvas) {
    const viewport = resolveViewport(canvas);

    this.renderTopBar(context, viewport);

    if (!this.popupType) {
      return;
    }

    const layout = this.resolvePopupLayout(viewport);
    this.buttonRect = layout.buttonRect;

    context.save();
    context.fillStyle = `rgba(0, 0, 0, ${0.68 * this.popupAlpha})`;
    context.fillRect(0, 0, viewport.width, viewport.height);

    context.fillStyle = `rgba(28, 34, 42, ${this.popupAlpha})`;
    context.fillRect(layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight);

    context.strokeStyle = `rgba(111, 199, 255, ${this.popupAlpha})`;
    context.lineWidth = 2;
    context.strokeRect(layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight);

    context.fillStyle = `rgba(255, 255, 255, ${this.popupAlpha})`;
    context.font = `${layout.titleSize}px sans-serif`;
    context.textAlign = "center";
    context.fillText(
      this.popupType === "fail" ? "失败" : "通关",
      viewport.width / 2,
      layout.titleY,
    );

    context.font = `${layout.summarySize}px sans-serif`;
    context.fillText(
      `星 ${this.stars}/3   币 ${this.coins}   点 ${this.dots}/${this.dotsTotal}`,
      viewport.width / 2,
      layout.summaryY,
    );

    context.fillStyle = `rgba(0, 136, 255, ${this.popupAlpha})`;
    context.fillRect(
      layout.buttonRect.x,
      layout.buttonRect.y,
      layout.buttonRect.w,
      layout.buttonRect.h,
    );

    context.fillStyle = `rgba(255, 255, 255, ${this.popupAlpha})`;
    context.font = `${layout.buttonSize}px sans-serif`;
    context.fillText(
      this.popupType === "fail" ? "重新开始" : "下一关",
      viewport.width / 2,
      layout.buttonTextY,
    );

    context.restore();
  }

  renderTopBar(context, viewport) {
    const barHeight = Math.max(56, Math.round(viewport.height * 0.07));
    const paddingX = Math.max(16, Math.round(viewport.width * 0.02));
    const textY = Math.round(barHeight * 0.66);
    const fontSize = Math.max(18, Math.round(barHeight * 0.36));

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.45)";
    context.fillRect(0, 0, viewport.width, barHeight);

    context.fillStyle = "#ffffff";
    context.font = `${fontSize}px sans-serif`;
    context.textAlign = "left";
    context.fillText(`星 ${this.stars}/3`, paddingX, textY);
    context.fillStyle = "#ffcc00";
    context.fillText(`币 ${this.coins}`, Math.round(viewport.width * 0.32), textY);
    context.fillStyle = "#ffffff";
    context.fillText(`点 ${this.dots}/${this.dotsTotal}`, Math.round(viewport.width * 0.56), textY);
    context.restore();
  }

  resolvePopupLayout(viewport) {
    const panelWidth = Math.min(Math.round(viewport.width * 0.74), 520);
    const panelHeight = this.popupType === "fail" ? Math.min(300, Math.round(viewport.height * 0.28)) : Math.min(360, Math.round(viewport.height * 0.34));
    const panelX = Math.round((viewport.width - panelWidth) / 2);
    const panelY = Math.round((viewport.height - panelHeight) / 2);
    const buttonWidth = Math.min(Math.round(panelWidth * 0.62), 320);
    const buttonHeight = Math.max(56, Math.round(panelHeight * 0.2));
    const buttonX = Math.round((viewport.width - buttonWidth) / 2);
    const buttonY = panelY + panelHeight - buttonHeight - Math.round(panelHeight * 0.14);

    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      titleY: panelY + Math.round(panelHeight * 0.28),
      summaryY: panelY + Math.round(panelHeight * 0.52),
      titleSize: Math.max(28, Math.round(panelHeight * 0.12)),
      summarySize: Math.max(18, Math.round(panelHeight * 0.08)),
      buttonSize: Math.max(20, Math.round(buttonHeight * 0.42)),
      buttonTextY: buttonY + Math.round(buttonHeight * 0.62),
      buttonRect: {
        x: buttonX,
        y: buttonY,
        w: buttonWidth,
        h: buttonHeight,
      },
    };
  }
}
