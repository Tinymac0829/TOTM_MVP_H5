# PM-02 调试面板技术方案

**文档类型**：L2 技术方案文档  
**创建日期**：2026-04-17  
**最后更新**：2026-05-01  
**状态**：已同步 world-units 速度调试口径  
**依赖**：PM-02 核心运行时设计文档（调试方案 2.5）、ENG-04 核心移动手感设计文档（调试方案 2.8）  
**覆盖范围**：开发期调试工具，不属于任何需求 ID，纯开发辅助

---

## 1. 背景

PM-02 和 ENG-04 中分别定义了调试面板的显示内容和快捷键。本文档将两处定义统一为一份完整的调试面板技术方案，覆盖：面板渲染、快捷键系统、调试模式（无敌/慢动作/快动作）、性能监控、日志系统、以及生产环境剥离策略。

**设计约束**：
- 调试面板仅在开发期使用，生产构建中必须可剥离
- 调试功能不得影响正常游戏逻辑的执行路径
- 调试面板渲染不得显著影响帧率（<1ms 额外开销）
- 所有调试快捷键使用 F 键区，避免与游戏输入冲突

## 2. 模块边界

**本文档覆盖**：
- DebugPanel 类的完整实现
- 快捷键注册与分发
- 调试模式（无敌、慢动作、快动作）
- FPS 计数器与性能监控
- 日志输出规范
- 生产环境剥离方案

**本文档不覆盖**：
- 游戏核心逻辑（PM-02、ENG-04）
- HUD 弹窗系统（HUD 状态流文档）
- 关卡数据校验日志（关卡格式与加载器文档）

## 3. 快捷键总表

### 3.1 统一快捷键定义

| 按键 | 功能 | 来源 | 状态切换 | 说明 |
|------|------|------|---------|------|
| F1 | 开关调试面板 | PM-02 2.5 | toggle | 显示/隐藏调试信息叠加层 |
| F2 | 开关网格线 | PM-02 2.5 | toggle | 在游戏画面上叠加网格线 |
| F3 | 开关碰撞框 | PM-02 2.5 | toggle | 高亮显示各瓦片的碰撞类型 |
| F4 | 开关无敌模式 | PM-02 2.5 / ENG-04 2.8 | toggle | 触碰 Spikes 不死亡 |
| F5 | 慢动作模式 | ENG-04 2.8 | toggle | 移动速度 x0.5 |
| F6 | 快动作模式 | ENG-04 2.8 | toggle | 移动速度 x2.0 |
| F7 | 重新加载当前关卡 | 关卡格式文档 10.3 | action | 清除缓存并重新 fetch |
| F8 | 跳到下一关 | 关卡格式文档 10.3 | action | 直接调用 nextStage() |

### 3.2 快捷键分类

- **toggle 类**：按一次开启，再按一次关闭，面板显示当前状态
- **action 类**：按一次执行一次，无持续状态

## 4. DebugPanel 实现

### 4.1 核心字段

```javascript
class DebugPanel {
  constructor() {
    // 面板开关
    this.visible = false;

    // 调试模式
    this.showGrid = false;
    this.showCollision = false;
    this.godMode = false;
    this.slowMotion = false;
    this.fastMotion = false;

    // FPS 计数
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.fpsUpdateInterval = 0.5;  // 每 0.5s 更新一次 FPS 显示

    // 性能采样
    this.fixedUpdateTime = 0;   // 最近一次 fixedUpdate 耗时（ms）
    this.renderTime = 0;        // 最近一次 render 耗时（ms）

    // 快捷键注册
    this.initKeyBindings();
  }
}
```

### 4.2 快捷键注册

```javascript
initKeyBindings() {
  window.addEventListener('keydown', (e) => {
    // 只处理 F 键，阻止浏览器默认行为
    if (e.key >= 'F1' && e.key <= 'F8') {
      e.preventDefault();
    }

    switch (e.key) {
      case 'F1':
        this.visible = !this.visible;
        console.log(`[Debug] Panel ${this.visible ? 'ON' : 'OFF'}`);
        break;

      case 'F2':
        this.showGrid = !this.showGrid;
        console.log(`[Debug] Grid ${this.showGrid ? 'ON' : 'OFF'}`);
        break;

      case 'F3':
        this.showCollision = !this.showCollision;
        console.log(`[Debug] Collision ${this.showCollision ? 'ON' : 'OFF'}`);
        break;

      case 'F4':
        this.godMode = !this.godMode;
        console.log(`[Debug] God mode ${this.godMode ? 'ON' : 'OFF'}`);
        break;

      case 'F5':
        this.slowMotion = !this.slowMotion;
        if (this.slowMotion) this.fastMotion = false;  // 互斥
        this.applySpeedModifier();
        console.log(`[Debug] Slow motion ${this.slowMotion ? 'ON' : 'OFF'}`);
        break;

      case 'F6':
        this.fastMotion = !this.fastMotion;
        if (this.fastMotion) this.slowMotion = false;  // 互斥
        this.applySpeedModifier();
        console.log(`[Debug] Fast motion ${this.fastMotion ? 'ON' : 'OFF'}`);
        break;

      case 'F7':
        stageLoader.clearCache();
        gameState.restart();
        console.log('[Debug] Stage reloaded (cache cleared)');
        break;

      case 'F8':
        gameState.nextStage();
        console.log('[Debug] Skipped to next stage');
        break;
    }
  });
}
```

### 4.3 速度修改器

```javascript
applySpeedModifier() {
  if (this.slowMotion) {
    playerController.runSpeedWorldUnitsPerSecond = 5.0 * 0.5;  // 2.5 world units/s
  } else if (this.fastMotion) {
    playerController.runSpeedWorldUnitsPerSecond = 5.0 * 2.0;  // 10.0 world units/s
  } else {
    playerController.runSpeedWorldUnitsPerSecond = 5.0;     // 恢复默认
  }
}

getSpeedLabel() {
  if (this.slowMotion) return 'x0.5';
  if (this.fastMotion) return 'x2.0';
  return 'x1.0';
}
```

**关键点**：
- 慢动作和快动作互斥，开启一个自动关闭另一个
- 速度修改直接作用于 `playerController.runSpeedWorldUnitsPerSecond`
- 关卡重新加载时 `playerController.reset()` 不会重置 `runSpeedWorldUnitsPerSecond`，调试模式跨关卡保持

### 4.4 无敌模式接入

无敌模式需要在 `PlayerController.checkTileEvent()` 中检查：

```javascript
// PlayerController 中
checkTileEvent() {
  const tile = gridMap.getTile(this.gridX, this.gridZ);
  if (tile === TileType.Spikes) {
    if (debugPanel && debugPanel.godMode) {
      console.log('[Debug] God mode: ignored Spikes');
      return;  // 无敌模式下跳过死亡
    }
    this.die();
  } else if (tile === TileType.Exit) {
    gameState.onStageComplete();
  }
}
```

**设计决策**：无敌模式通过条件检查实现，而非修改碰撞系统。原因：
- 碰撞检测结果不变（路径仍然终止于 Spikes）
- 只是跳过死亡触发
- 最小化对核心逻辑的侵入

## 5. 面板渲染

### 5.1 面板布局

```
┌─────────────────────────────────┐
│  FPS: 60                        │  ← 调试面板（左上角）
│  State: moving                  │
│  Pos: (5, 12)                   │
│  Target: (5, 15)                │
│  Progress: 0.67                 │
│  Buffer: up (0.01s)             │
│  Speed: 5.0 wu/s (41.7 tiles/s)│
│  Stage: story_001 (17x30)        │
│  Dots: 8/12  Coins: 2/4        │
│  fixedUpdate: 0.3ms             │
│  render: 1.2ms                  │
│  [GOD] [SLOW]                   │  ← 激活的调试模式标签
└─────────────────────────────────┘
```

- 位置：左上角，y 从 90 开始（避开顶部信息栏 80px）
- 背景：半透明黑色
- 字体：16px monospace，白色
- 行高：20px

### 5.2 渲染实现

```javascript
render(ctx) {
  if (!this.visible) return;

  const x = 10;
  const startY = 90;
  const lineHeight = 20;
  const lines = this.collectLines();

  // 背景
  const panelHeight = lines.length * lineHeight + 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(x, startY, 360, panelHeight);

  // 文字
  ctx.fillStyle = '#00ff00';
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + 5, startY + 15 + i * lineHeight);
  }
}

collectLines() {
  const pc = playerController;
  const lines = [
    `FPS: ${this.fps}`,
    `State: ${pc.state}`,
    `Pos: (${pc.gridX}, ${pc.gridZ})`,
  ];

  if (pc.state === 'moving') {
    lines.push(`Target: (${pc.moveTargetX}, ${pc.moveTargetZ})`);
    lines.push(`Progress: ${pc.moveProgress.toFixed(2)}`);
  }

  if (pc.bufferedDirection) {
    lines.push(`Buffer: ${pc.bufferedDirection} (${pc.bufferTimer.toFixed(3)}s)`);
  } else {
    lines.push('Buffer: none');
  }

  lines.push(`Speed: ${pc.runSpeedWorldUnitsPerSecond.toFixed(1)} wu/s (${pc.derivedRunSpeedTilesPerSecond.toFixed(1)} tiles/s, ${this.getSpeedLabel()})`);

  if (gridMap) {
    lines.push(`Stage: ${gridMap.id} (${gridMap.width}x${gridMap.height})`);
    lines.push(`Dots: ${hud.dots}/${hud.dotsTotal}  Coins: ${hud.coins}`);
  }

  lines.push(`fixedUpdate: ${this.fixedUpdateTime.toFixed(1)}ms`);
  lines.push(`render: ${this.renderTime.toFixed(1)}ms`);

  // 激活的调试模式标签
  const tags = [];
  if (this.godMode) tags.push('GOD');
  if (this.slowMotion) tags.push('SLOW');
  if (this.fastMotion) tags.push('FAST');
  if (this.showGrid) tags.push('GRID');
  if (this.showCollision) tags.push('COLL');
  if (tags.length > 0) {
    lines.push(`[${tags.join('] [')}]`);
  }

  return lines;
}
```

### 5.3 FPS 计数器

```javascript
updateFPS(dt) {
  this.frameCount++;
  this.fpsTimer += dt;

  if (this.fpsTimer >= this.fpsUpdateInterval) {
    this.fps = Math.round(this.frameCount / this.fpsTimer);
    this.frameCount = 0;
    this.fpsTimer = 0;

    // 低帧率警告
    if (this.fps < 55) {
      console.warn(`[Debug] FPS dropped to ${this.fps}`);
    }
  }
}
```

**更新频率**：每 0.5s 计算一次平均 FPS，避免数字跳动过快。

### 5.4 性能采样

在 GameLoop 中插入计时：

```javascript
// GameLoop.tick() 中
fixedUpdate() {
  if (!gameState.isPlaying()) return;

  const t0 = performance.now();

  inputManager.update();
  playerController.fixedUpdate();

  if (debugPanel) {
    debugPanel.fixedUpdateTime = performance.now() - t0;
  }
}

update(dt) {
  if (debugPanel) debugPanel.updateFPS(dt);

  const t0 = performance.now();

  renderer.render(dt);
  hud.render(renderer.ctx);
  if (debugPanel) debugPanel.render(renderer.ctx);

  if (debugPanel) {
    debugPanel.renderTime = performance.now() - t0;
  }
}
```

## 6. 网格线与碰撞框渲染

### 6.1 网格线（F2）

```javascript
renderGrid(ctx) {
  if (!this.showGrid) return;

  const tileSize = renderer.tileSize;
  const offsetZ = renderer.cameraOffsetZ;
  const startZ = Math.floor(offsetZ / tileSize) - 1;
  const endZ = startZ + Math.ceil(1920 / tileSize) + 2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;

  // 垂直线
  for (let x = 0; x <= gridMap.width; x++) {
    const screenX = x * tileSize;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, 1920);
    ctx.stroke();
  }

  // 水平线
  for (let z = startZ; z <= endZ; z++) {
    const screenZ = z * tileSize - offsetZ;
    ctx.beginPath();
    ctx.moveTo(0, screenZ);
    ctx.lineTo(gridMap.width * tileSize, screenZ);
    ctx.stroke();
  }
}
```

### 6.2 碰撞框（F3）

```javascript
renderCollision(ctx) {
  if (!this.showCollision) return;

  const tileSize = renderer.tileSize;
  const offsetZ = renderer.cameraOffsetZ;
  const startZ = Math.floor(offsetZ / tileSize) - 1;
  const endZ = startZ + Math.ceil(1920 / tileSize) + 2;

  const collisionColors = {
    [TileType.Wall]:   'rgba(255, 0, 0, 0.3)',     // 红：阻挡
    [TileType.Spikes]: 'rgba(255, 0, 255, 0.3)',    // 紫：致死
    [TileType.Exit]:   'rgba(0, 255, 0, 0.3)',      // 绿：通关
    [TileType.Enter]:  'rgba(0, 255, 255, 0.3)',    // 青：出生点
  };

  for (let z = Math.max(0, startZ); z <= Math.min(gridMap.height - 1, endZ); z++) {
    for (let x = 0; x < gridMap.width; x++) {
      const tile = gridMap.getTile(x, z);
      const color = collisionColors[tile];
      if (color) {
        const screenX = x * tileSize;
        const screenZ = z * tileSize - offsetZ;
        ctx.fillStyle = color;
        ctx.fillRect(screenX, screenZ, tileSize, tileSize);

        // 瓦片类型标签
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px monospace';
        ctx.fillText(TileNames[tile], screenX + 2, screenZ + 12);
      }
    }
  }
}
```

## 7. 日志输出规范

### 7.1 日志前缀约定

| 前缀 | 模块 | 示例 |
|------|------|------|
| `[Player]` | PlayerController | `[Player] startMove(right) → target(5, 12), distance=3` |
| `[StageLoader]` | StageLoader | `[StageLoader] Stage story_001 loaded: 17x30` |
| `[GameState]` | GameState | `[GameState] playing → paused_fail` |
| `[Debug]` | DebugPanel | `[Debug] God mode ON` |
| `[Input]` | InputManager | `[Input] swipe detected: right` |

### 7.2 日志级别

| 级别 | 用途 | 方法 |
|------|------|------|
| `console.log` | 正常流程跟踪 | 状态转换、移动开始/结束、关卡加载 |
| `console.warn` | 非致命异常 | FPS 低于 55、校验警告、meta 不一致 |
| `console.error` | 致命错误 | 关卡加载失败、校验错误 |

### 7.3 关键日志点（汇总）

```javascript
// PlayerController
console.log(`[Player] startMove(${dir}) → target(${tx}, ${tz}), distance=${d}`);
console.log(`[Player] buffered ${dir}, timer=${t.toFixed(3)}s`);
console.log(`[Player] buffer expired`);
console.log(`[Player] consumed buffer ${dir}`);
console.log(`[Player] reached target(${x}, ${z}), tile=${TileNames[tile]}`);
console.log(`[Player] died at (${x}, ${z})`);

// GameState
console.log(`[GameState] ${oldState} → ${newState}`);

// StageLoader
console.log(`[StageLoader] Stage ${id} loaded: ${w}x${h}, dots=${d}, coins=${c}, stars=${s}`);
console.warn(`[StageLoader] ${id}: ${warning}`);
console.error(`[StageLoader] Failed to load stage ${id}: ${err}`);

// Debug
console.log(`[Debug] Panel ${on ? 'ON' : 'OFF'}`);
console.log(`[Debug] God mode ${on ? 'ON' : 'OFF'}`);
console.warn(`[Debug] FPS dropped to ${fps}`);
```

## 8. 生产环境剥离方案

### 8.1 策略

MVP 阶段采用全局标志位方案，不引入构建工具：

```javascript
// main.js 顶部
const DEBUG = true;  // 生产发布时改为 false
```

### 8.2 条件初始化

```javascript
let debugPanel = null;
if (DEBUG) {
  debugPanel = new DebugPanel();
}
```

### 8.3 条件调用模式

所有调试相关调用使用短路求值：

```javascript
// GameLoop 中
DEBUG && debugPanel.updateFPS(dt);
DEBUG && debugPanel.render(ctx);
DEBUG && debugPanel.renderGrid(ctx);
DEBUG && debugPanel.renderCollision(ctx);

// PlayerController 中
if (tile === TileType.Spikes) {
  if (DEBUG && debugPanel && debugPanel.godMode) {
    console.log('[Debug] God mode: ignored Spikes');
    return;
  }
  this.die();
}
```

### 8.4 生产发布检查清单

- [ ] `const DEBUG = false;`
- [ ] 确认 F1-F8 快捷键不再响应
- [ ] 确认调试面板不渲染
- [ ] 确认无敌/慢动作/快动作不生效
- [ ] 确认 console.log 中的 `[Debug]` 前缀日志不输出

**注意**：`[Player]`、`[GameState]`、`[StageLoader]` 前缀的日志在生产环境中保留，用于线上问题排查。只有 `[Debug]` 前缀的日志需要剥离。

### 8.5 后续优化（非 MVP）

如果后续引入构建工具（如 esbuild），可以：
- 使用 `process.env.NODE_ENV` 替代手动 `DEBUG` 标志
- 通过 tree-shaking 自动移除 DebugPanel 类
- 通过 terser 的 `drop_console` 移除所有 console 调用

## 9. 边界条件

| 情况 | 处理方式 | 验证方法 |
|------|---------|---------|
| F5 和 F6 同时按下 | 互斥，后按的覆盖先按的 | 手动测试 |
| 调试面板开启时性能下降 | 面板渲染 <1ms，影响可忽略 | 性能采样 |
| 无敌模式下到达 Spikes | 角色停在 Spikes 格子但不死亡，可继续操作 | 集成测试 |
| 慢动作/快动作跨关卡 | `runSpeedWorldUnitsPerSecond` 修改在 reset() 中不重置，调试模式保持 | 集成测试 |
| F7 重新加载时正在移动 | restart() 会重置 PlayerController，移动中断 | 集成测试 |
| F8 跳关时正在移动 | 同上 | 集成测试 |
| DEBUG=false 时访问 debugPanel | 短路求值 `DEBUG && debugPanel.xxx` 不会报错 | 代码审查 |
| 浏览器拦截 F 键默认行为 | `e.preventDefault()` 阻止浏览器默认行为 | 多浏览器测试 |
| F5 与浏览器刷新冲突 | `e.preventDefault()` 已处理，F5 不会刷新页面 | 多浏览器测试 |

## 10. 测试矩阵

### 10.1 单元测试

| 测试用例 | 输入 | 预期输出 | 验证点 |
|---------|------|---------|--------|
| FPS 计算 | 模拟 30 帧 / 0.5s | fps === 60 | FPS 计数准确 |
| 慢动作开启 | 按 F5 | `runSpeedWorldUnitsPerSecond ≈ 2.5`，派生速度约 `20.8333 tiles/s` | 速度减半 |
| 快动作开启 | 按 F6 | `runSpeedWorldUnitsPerSecond ≈ 10.0`，派生速度约 `83.3333 tiles/s` | 速度翻倍 |
| 慢动作→快动作 | 先 F5 再 F6 | slowMotion=false, fastMotion=true | 互斥 |
| 速度恢复 | 开启慢动作后再按 F5 | `runSpeedWorldUnitsPerSecond ≈ 5.0`，派生速度约 `41.6667 tiles/s` | 恢复默认 |
| collectLines | 各种状态组合 | 返回正确行数和内容 | 面板内容 |

### 10.2 集成测试

| 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|
| 面板开关 | 按 F1 | 面板显示/隐藏 |
| 网格线 | 按 F2 | 网格线叠加在游戏画面上 |
| 碰撞框 | 按 F3 | 各类瓦片显示对应颜色高亮 |
| 无敌模式 | 按 F4 后触碰 Spikes | 角色不死亡 |
| 慢动作 | 按 F5 后移动 | 移动明显变慢 |
| 快动作 | 按 F6 后移动 | 移动明显变快 |
| 重新加载 | 按 F7 | 关卡重置，收集物恢复 |
| 跳关 | 按 F8 | 加载下一关 |
| 生产模式 | DEBUG=false | 所有调试功能不可用 |

## 11. 性能约束

| 指标 | 目标 | 说明 |
|------|------|------|
| 面板渲染耗时 | <1ms | 只绘制文字，无复杂图形 |
| 网格线渲染耗时 | <0.5ms | 只绘制可见区域的线条 |
| 碰撞框渲染耗时 | <1ms | 只绘制可见区域的有碰撞属性的瓦片 |
| FPS 计算开销 | <0.01ms | 简单计数和除法 |
| 内存占用 | <1KB | 几个数值字段 |

## 12. 风险与替代方案

| 风险 | 影响 | 替代方案 |
|------|------|---------|
| F5 被浏览器拦截 | 慢动作快捷键失效 | 改用其他键（如 `-` / `=`） |
| DEBUG 标志忘记改为 false | 生产环境暴露调试功能 | 发布检查清单 + CI 检查 |
| 调试面板遮挡游戏画面 | 影响测试体验 | 面板可拖动（非 MVP）或改为右侧显示 |
| 无敌模式下测试碰撞 | 可能遗漏死亡相关 bug | 测试时明确关闭无敌模式 |
| console.log 过多影响性能 | 低端设备卡顿 | 生产环境剥离 [Debug] 日志 |

---

## 变更日志

| 日期 | 变更类型 | 变更内容 | 影响范围 |
|------|---------|---------|---------|
| 2026-04-17 | INIT | 创建初稿 | 全文档 |
| 2026-05-01 | BASELINE | 同步 ENG-04 R-009 world-units 速度口径：调试面板速度字段改为 `runSpeedWorldUnitsPerSecond`，并显示派生 `tiles/s`；慢动作/快动作按 `5.0 world units/s` 基线倍率调整 | 4.3 调试模式、5.2 面板内容、10.1 单元测试 |

---

## 附录：参考文档

- PM-02 核心运行时设计文档（调试方案 2.5）
- ENG-04 核心移动手感设计文档（调试方案 2.8）
- 关卡格式与加载器技术方案（调试快捷键 F7/F8）
- HUD 状态流技术方案（GameState 状态机）
