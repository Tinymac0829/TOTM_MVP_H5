# ENG-05 HUD 状态流技术方案

**文档类型**：L2 技术方案文档  
**创建日期**：2026-04-17  
**最后更新**：2026-04-17  
**状态**：初稿  
**依赖**：PM-02 核心运行时设计文档（HUD 2.3.7、GameState 2.4）  
**覆盖需求**：R-012（开始→失败/通关闭环）、R-013（重复游玩）、R-014（失败后 2s 内可重开）、R-015（UI 不遮挡可玩区）

---

## 1. 背景

PM-02 中已定义了 HUD 的基础布局和 GameState 状态机。本文档在此基础上，完整定义 HUD 的状态流转、弹窗交互细节、触摸区域划分、动画时序、以及与 GameState / PlayerController / StageLoader 的协作关系。

**设计约束**：
- 1080x1920 竖屏布局，UI 不得遮挡核心可玩区域（R-015）
- 失败后 2s 内必须可重开（R-014）
- 所有 UI 元素使用 Canvas2D 绘制，不使用 DOM 元素
- 弹窗期间游戏逻辑暂停（fixedUpdate 不执行）

## 2. 模块边界

**本文档覆盖**：
- HUD 类的完整状态机与渲染逻辑
- GameState 状态流转的完整定义
- 弹窗系统（失败、通关、暂停）
- 顶部信息栏
- 触摸区域与点击事件处理
- 弹窗动画时序

**本文档不覆盖**：
- 瓦片渲染（PM-02 Renderer）
- 玩家移动逻辑（ENG-04）
- 关卡加载（关卡格式与加载器文档）
- 调试面板（调试面板文档）

## 3. GameState 状态机

### 3.1 状态定义

| 状态 | 含义 | fixedUpdate | HUD 渲染 | 接受玩家输入 |
|------|------|-------------|----------|-------------|
| `loading` | 关卡加载中 | 不执行 | 显示加载提示 | 否 |
| `playing` | 游戏进行中 | 执行 | 顶部信息栏 | 是 |
| `paused_fail` | 失败弹窗 | 不执行 | 失败弹窗 + 顶部信息栏 | 仅弹窗按钮 |
| `paused_complete` | 通关弹窗 | 不执行 | 通关弹窗 + 顶部信息栏 | 仅弹窗按钮 |

### 3.2 状态转换图

```
                    loadAndStart()
        ┌──────────── loading ←──────────────┐
        │                                     │
        ↓                                     │
     playing ──────────────────────────────────┤
        │         │                            │
        │         │ onPlayerDead()             │ restart()
        │         ↓                            │
        │    paused_fail ──────────────────────┘
        │
        │ onStageComplete()
        ↓
   paused_complete ─── nextStage() ──→ loading
        │
        │ (最后一关)
        ↓
      menu
```

### 3.3 状态转换规则

| 从 | 到 | 触发条件 | 附带操作 |
|----|-----|---------|---------|
| `loading` | `playing` | `StageLoader.initStage()` 完成 | 重置 HUD，开始 fixedUpdate |
| `playing` | `paused_fail` | `PlayerController` 到达 Spikes | 显示失败弹窗，暂停 fixedUpdate |
| `playing` | `paused_complete` | `PlayerController` 到达 Exit | 显示通关弹窗，暂停 fixedUpdate |
| `paused_fail` | `loading` | 玩家点击"重新开始" | 调用 `StageLoader.loadAndStart(currentStageId)` |
| `paused_complete` | `loading` | 玩家点击"下一关" | 调用 `StageLoader.loadAndStart(nextStageId)` |
| `paused_complete` | `menu` | 最后一关通关后点击"下一关" | 显示主菜单（MVP 可简化为重新开始 story_001） |

### 3.4 GameState 实现

```javascript
class GameState {
  constructor() {
    this.state = 'loading';
    this.currentStageId = null;
    this.stageOrder = STAGE_ORDER;  // ['story_001', 'story_002', 'story_003']
  }

  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    console.log(`[GameState] ${oldState} → ${newState}`);
  }

  isPlaying() {
    return this.state === 'playing';
  }

  isPaused() {
    return this.state === 'paused_fail' || this.state === 'paused_complete';
  }

  onPlayerDead() {
    this.setState('paused_fail');
    hud.showFailPopup();
  }

  onStageComplete() {
    this.setState('paused_complete');
    hud.showCompletePopup();
  }

  restart() {
    this.setState('loading');
    stageLoader.loadAndStart(this.currentStageId);
  }

  nextStage() {
    const idx = this.stageOrder.indexOf(this.currentStageId);
    if (idx >= 0 && idx < this.stageOrder.length - 1) {
      this.setState('loading');
      stageLoader.loadAndStart(this.stageOrder[idx + 1]);
    } else {
      // 最后一关通关，返回第一关（MVP 简化处理）
      this.setState('loading');
      stageLoader.loadAndStart(this.stageOrder[0]);
    }
  }
}
```

**与 PM-02 的差异说明**：
- PM-02 中 `paused` 是单一状态，本文档拆分为 `paused_fail` 和 `paused_complete`，因为两者的弹窗内容和按钮行为不同
- PM-02 中最后一关通关后进入 `menu` 状态，MVP 简化为循环回 story_001

## 4. HUD 布局

### 4.1 屏幕分区（1080x1920）

```
┌─────────────────────────────────┐ y=0
│         顶部信息栏               │
│  ★ 0/3    🪙 0    ⚫ 0/50       │ h=80px
├─────────────────────────────────┤ y=80
│                                 │
│                                 │
│                                 │
│         游戏可玩区域             │
│                                 │
│                                 │
│                                 │
│                                 │ h=1840px
└─────────────────────────────────┘ y=1920
```

### 4.2 顶部信息栏

| 元素 | 位置 | 字体 | 颜色 | 说明 |
|------|------|------|------|------|
| 背景 | (0, 0, 1080, 80) | — | rgba(0,0,0,0.5) | 半透明黑色背景 |
| 星星计数 | x=20, y=50 | 32px Arial | #ffffff | 格式：`★ N/3` |
| 金币计数 | x=300, y=50 | 32px Arial | #ffcc00 | 格式：`🪙 N` |
| 圆点计数 | x=580, y=50 | 32px Arial | #ffffff | 格式：`⚫ N/M` |

**渲染层级**：顶部信息栏始终在游戏画面之上，不受相机偏移影响。

### 4.3 弹窗布局

#### 失败弹窗

```
┌─────────────────────────────────┐
│      (半透明黑色遮罩层)          │
│                                 │
│    ┌───────────────────────┐    │
│    │                       │    │
│    │       💀 失败          │    │  弹窗区域：(140, 600, 800, 500)
│    │                       │    │
│    │   ┌───────────────┐   │    │
│    │   │   重新开始     │   │    │  按钮：(290, 900, 500, 80)
│    │   └───────────────┘   │    │
│    │                       │    │
│    └───────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

#### 通关弹窗

```
┌─────────────────────────────────┐
│      (半透明黑色遮罩层)          │
│                                 │
│    ┌───────────────────────┐    │
│    │                       │    │
│    │       🎉 通关！        │    │  弹窗区域：(140, 500, 800, 700)
│    │                       │    │
│    │   ★ 2/3  🪙 8  ⚫ 45/50│    │  结算信息
│    │                       │    │
│    │   ┌───────────────┐   │    │
│    │   │    下一关      │   │    │  按钮：(290, 1000, 500, 80)
│    │   └───────────────┘   │    │
│    │                       │    │
│    └───────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

## 5. HUD 实现

### 5.1 核心字段

```javascript
class HUD {
  constructor() {
    // 收集物计数
    this.stars = 0;
    this.coins = 0;
    this.dots = 0;
    this.dotsTotal = 0;

    // 弹窗状态
    this.popupType = null;       // null | 'fail' | 'complete'
    this.popupAlpha = 0;         // 弹窗透明度（0-1，用于淡入动画）
    this.popupAnimating = false; // 是否正在播放弹窗动画

    // 弹窗动画参数
    this.popupFadeInDuration = 0.3;  // 淡入时长（秒）
    this.popupFadeInTimer = 0;

    // 按钮区域（用于点击检测）
    this.buttonRect = null;  // {x, y, w, h}
  }
}
```

### 5.2 弹窗显示与动画

```javascript
showFailPopup() {
  this.popupType = 'fail';
  this.popupAlpha = 0;
  this.popupAnimating = true;
  this.popupFadeInTimer = 0;
  this.buttonRect = { x: 290, y: 900, w: 500, h: 80 };
}

showCompletePopup() {
  this.popupType = 'complete';
  this.popupAlpha = 0;
  this.popupAnimating = true;
  this.popupFadeInTimer = 0;
  this.buttonRect = { x: 290, y: 1000, w: 500, h: 80 };
}

updatePopupAnimation(dt) {
  if (!this.popupAnimating) return;

  this.popupFadeInTimer += dt;
  this.popupAlpha = Math.min(1, this.popupFadeInTimer / this.popupFadeInDuration);

  if (this.popupAlpha >= 1) {
    this.popupAnimating = false;
  }
}
```

### 5.3 渲染

```javascript
render(ctx) {
  this.renderTopBar(ctx);

  if (this.popupType) {
    this.renderOverlay(ctx);
    if (this.popupType === 'fail') {
      this.renderFailPopup(ctx);
    } else if (this.popupType === 'complete') {
      this.renderCompletePopup(ctx);
    }
  }
}

renderTopBar(ctx) {
  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, 1080, 80);

  // 星星
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px Arial';
  ctx.fillText(`★ ${this.stars}/3`, 20, 50);

  // 金币
  ctx.fillStyle = '#ffcc00';
  ctx.fillText(`🪙 ${this.coins}`, 300, 50);

  // 圆点
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`⚫ ${this.dots}/${this.dotsTotal}`, 580, 50);
}

renderOverlay(ctx) {
  ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * this.popupAlpha})`;
  ctx.fillRect(0, 0, 1080, 1920);
}

renderFailPopup(ctx) {
  const alpha = this.popupAlpha;

  // 弹窗背景
  ctx.fillStyle = `rgba(42, 42, 42, ${alpha})`;
  ctx.fillRect(140, 600, 800, 500);

  // 标题
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('失败', 540, 720);

  // 按钮
  ctx.fillStyle = `rgba(0, 136, 255, ${alpha})`;
  ctx.fillRect(290, 900, 500, 80);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = '32px Arial';
  ctx.fillText('重新开始', 540, 950);

  ctx.textAlign = 'left';  // 恢复默认
}

renderCompletePopup(ctx) {
  const alpha = this.popupAlpha;

  // 弹窗背景
  ctx.fillStyle = `rgba(42, 42, 42, ${alpha})`;
  ctx.fillRect(140, 500, 800, 700);

  // 标题
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('通关！', 540, 640);

  // 结算信息
  ctx.font = '36px Arial';
  ctx.fillText(`★ ${this.stars}/3`, 340, 780);
  ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
  ctx.fillText(`🪙 ${this.coins}`, 540, 780);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillText(`⚫ ${this.dots}/${this.dotsTotal}`, 740, 780);

  // 按钮
  ctx.fillStyle = `rgba(0, 136, 255, ${alpha})`;
  ctx.fillRect(290, 1000, 500, 80);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = '32px Arial';
  ctx.fillText('下一关', 540, 1050);

  ctx.textAlign = 'left';
}
```

### 5.4 点击事件处理

```javascript
handleClick(screenX, screenY) {
  // 只在弹窗显示且动画完成后响应点击
  if (!this.popupType || this.popupAnimating) return;

  if (this.buttonRect && this.isInsideRect(screenX, screenY, this.buttonRect)) {
    if (this.popupType === 'fail') {
      this.dismiss();
      gameState.restart();
    } else if (this.popupType === 'complete') {
      this.dismiss();
      gameState.nextStage();
    }
  }
}

isInsideRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w &&
         y >= rect.y && y <= rect.y + rect.h;
}

dismiss() {
  this.popupType = null;
  this.popupAlpha = 0;
  this.popupAnimating = false;
  this.buttonRect = null;
}
```

### 5.5 坐标转换

Canvas 的点击坐标需要从 CSS 像素转换为 Canvas 逻辑像素：

```javascript
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;

  hud.handleClick(canvasX, canvasY);
});
```

**关键点**：
- Canvas 逻辑尺寸固定为 1080x1920
- CSS 显示尺寸可能因设备不同而缩放
- 点击坐标必须经过 `scaleX / scaleY` 转换后才能与 HUD 的像素坐标匹配

### 5.6 收集物计数

```javascript
addCollectible(type) {
  if (type === TileType.Dot) this.dots++;
  else if (type === TileType.Coin) this.coins++;
  else if (type === TileType.Star) this.stars++;
}

reset() {
  this.stars = 0;
  this.coins = 0;
  this.dots = 0;
  this.dotsTotal = 0;
  this.dismiss();
}
```

## 6. 时序与协作

### 6.1 失败流程时序

```
t=0.00s  PlayerController 到达 Spikes 格子
         → PlayerController.die()
           → PlayerController.state = 'dead'
           → gameState.onPlayerDead()
             → gameState.state = 'paused_fail'
             → hud.showFailPopup()

t=0.00s~ GameLoop.fixedUpdate() 不再执行（gameState.isPlaying() === false）
         GameLoop.update(dt) 继续执行（驱动弹窗动画）

t=0.30s  弹窗淡入完成（popupAlpha = 1）
         按钮可点击

t=?      玩家点击"重新开始"
         → hud.dismiss()
         → gameState.restart()
           → gameState.state = 'loading'
           → stageLoader.loadAndStart(currentStageId)
             → 从缓存加载，重新初始化
             → gameState.state = 'playing'
             → fixedUpdate 恢复执行
```

### 6.2 通关流程时序

```
t=0.00s  PlayerController 到达 Exit 格子
         → gameState.onStageComplete()
           → gameState.state = 'paused_complete'
           → hud.showCompletePopup()

t=0.30s  弹窗淡入完成

t=?      玩家点击"下一关"
         → hud.dismiss()
         → gameState.nextStage()
           → 加载下一关（或循环回第一关）
```

### 6.3 GameLoop 中的状态检查

```javascript
// GameLoop.tick() 中
fixedUpdate() {
  if (!gameState.isPlaying()) return;  // 弹窗期间跳过玩法逻辑

  inputManager.update();
  playerController.fixedUpdate();
}

update(dt) {
  // 始终执行，驱动弹窗动画和渲染
  hud.updatePopupAnimation(dt);
  renderer.render(dt);
  hud.render(renderer.ctx);
}
```

## 7. 失败后重开时间约束

**需求**：R-014 要求失败后 2s 内可重开。

**时间分解**：
| 阶段 | 耗时 | 说明 |
|------|------|------|
| 死亡动画（移动到 Spikes） | 0-1.0s | 取决于移动距离 |
| 弹窗淡入 | 0.3s | 固定 |
| 玩家反应 + 点击 | 用户决定 | — |
| 关卡重新加载 | <10ms | 从缓存深拷贝 |

**保证**：弹窗淡入完成后（最迟 1.3s），按钮立即可点击。玩家只需在 0.7s 内点击按钮即可满足 2s 约束。实际上按钮响应是即时的，不存在额外延迟。

## 8. 边界条件

| 情况 | 处理方式 | 验证方法 |
|------|---------|---------|
| 弹窗动画期间点击按钮 | 忽略（`popupAnimating === true` 时不响应） | 集成测试 |
| 弹窗区域外点击 | 忽略（`isInsideRect` 返回 false） | 集成测试 |
| 快速连续点击按钮 | 第一次点击后 `dismiss()` 清空 popupType，后续点击无效 | 集成测试 |
| 通关弹窗中收集物显示 | 显示当前关卡的最终收集数量 | 集成测试 |
| 最后一关通关 | 循环回 story_001（MVP 简化） | 集成测试 |
| 顶部信息栏与游戏画面重叠 | 信息栏有半透明背景，始终在最上层 | 视觉检查 |
| 不同屏幕比例下的点击偏移 | 坐标转换使用 scaleX/scaleY | 多设备测试 |
| Canvas 逻辑尺寸与 CSS 尺寸不一致 | getBoundingClientRect + scale 转换 | 多设备测试 |

## 9. 测试矩阵

### 9.1 单元测试

| 测试用例 | 输入 | 预期输出 | 验证点 |
|---------|------|---------|--------|
| addCollectible Dot | `addCollectible(TileType.Dot)` | `dots === 1` | 计数正确 |
| addCollectible Coin | `addCollectible(TileType.Coin)` | `coins === 1` | 计数正确 |
| addCollectible Star | `addCollectible(TileType.Star)` | `stars === 1` | 计数正确 |
| reset | 有收集物后调用 reset | 所有计数归零，弹窗关闭 | 重置完整 |
| showFailPopup | 调用后检查状态 | `popupType === 'fail'`, `popupAlpha === 0` | 初始状态正确 |
| 弹窗淡入 | 连续调用 updatePopupAnimation(0.1) x3 | `popupAlpha === 1` | 动画时长正确 |
| 点击按钮区域内 | 坐标在 buttonRect 内 | `isInsideRect` 返回 true | 命中检测 |
| 点击按钮区域外 | 坐标在 buttonRect 外 | `isInsideRect` 返回 false | 命中检测 |
| 动画中点击 | `popupAnimating === true` 时调用 handleClick | 无响应 | 动画保护 |

### 9.2 集成测试

| 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|
| 失败→重开 | 触碰尖刺 → 等待弹窗 → 点击重新开始 | 关卡重置，玩家回到出生点，收集物恢复 |
| 通关→下一关 | 到达出口 → 等待弹窗 → 点击下一关 | 加载下一关，HUD 重置 |
| 最后一关通关 | 通关 story_003 → 点击下一关 | 循环回 story_001 |
| 收集物显示 | 收集 2 个 Dot 和 1 个 Star | 顶部栏显示 ★ 1/3, ⚫ 2/M |
| 通关结算 | 通关时检查弹窗 | 弹窗显示最终收集数量 |
| 弹窗期间无法移动 | 弹窗显示时滑动屏幕 | 角色不移动 |
| 坐标转换 | 在不同尺寸设备上点击按钮 | 按钮响应正确 |

## 10. 性能约束

| 指标 | 目标 | 说明 |
|------|------|------|
| HUD render 耗时 | <1ms | 只绘制文字和矩形 |
| 弹窗 render 耗时 | <2ms | 含遮罩层和弹窗内容 |
| 点击响应延迟 | <16ms（1 帧） | 同步处理，无异步 |

## 11. 风险与替代方案

| 风险 | 影响 | 替代方案 |
|------|------|---------|
| Canvas fillText 在不同设备上字体渲染不一致 | 文字位置偏移 | 使用 measureText 动态计算居中 |
| emoji 在部分安卓浏览器不显示 | 星星/金币/圆点图标缺失 | 改用纯文字或 Canvas 绘制的简单图形 |
| 触摸事件与点击事件冲突 | 滑动被误判为点击 | 弹窗期间只监听 click，不监听 touchmove |
| 弹窗淡入时间过长 | 影响重开速度 | 可缩短到 0.15s 或去掉动画 |

---

## 变更日志

| 日期 | 变更类型 | 变更内容 | 影响范围 |
|------|---------|---------|---------|
| 2026-04-17 | INIT | 创建初稿 | 全文档 |

---

## 附录：参考文档

- PM-02 核心运行时设计文档（HUD 2.3.7、GameState 2.4）
- ENG-04 核心移动手感设计文档（PlayerController 状态机）
- 关卡格式与加载器技术方案（StageLoader 接口）
- MVP 需求清单 R-012、R-013、R-014、R-015
