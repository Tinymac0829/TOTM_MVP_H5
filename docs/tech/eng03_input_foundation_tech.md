# ENG-03 输入基础层技术方案

**文档类型**：L2 技术方案文档  
**任务 ID**：ENG-03  
**创建日期**：2026-04-21  
**最后更新**：2026-06-08
**状态**：输入缓冲基线与主触点 ID 跟踪已实现并通过真机/浏览器回归  
**依赖**：PM-02 核心运行时设计文档（InputManager 2.3.3、PlayerController 2.3.4）  
**覆盖需求**：R-006（触屏滑动与键盘输入）、R-008（输入缓冲窗口 0.1s）

---

## 1. 背景

PM-02 中已定义了 InputManager / TouchInput / KeyboardInput 的接口级设计和输入缓冲的基本规则。本文档在此基础上，完整定义触屏滑动识别算法、键盘输入处理、两种输入源的合并策略、输入与游戏状态的交互规则、边界条件与测试矩阵。

本文档的目标是：任何开发 thread 只看本文档 + PM-02，就能正确实现输入层，不需要额外沟通。

**设计约束**：
- 触屏滑动和键盘输入必须汇聚到同一个方向命令层
- 输入层不直接操作玩家移动，只产出标准化的方向命令（`up` / `down` / `left` / `right`）
- 输入缓冲由 PlayerController 管理，不在输入层内部实现
- 弹窗、死亡等非 `playing` 状态下，输入层必须被屏蔽

## 2. 模块边界

**本文档覆盖**：
- 触屏滑动识别完整算法（像素坐标、DPI/宽度派生阈值、主触点 ID、方向判定、防误触）
- 键盘输入按键映射与状态管理
- 两种输入源的合并策略与优先级
- 输入与游戏状态的交互规则
- 输入缓冲机制的边界条件补充
- 关键参数定义与调试支持

**本文档不覆盖**（已在其他文档定义）：
- 输入缓冲的核心逻辑（PM-02 PlayerController 2.3.4）
- 移动路径计算与碰撞检测（ENG-04）
- 弹窗 UI 的点击事件处理（ENG-05）
- 主循环中 InputManager.update() 的调用时序（PM-02 2.2）

## 3. 输入架构总览

### 3.1 数据流

```
触屏事件 (touchstart/touchmove/touchend/touchcancel)
    ↓
  TouchInput  ──→  detectedDirection
                          ↓
                    InputManager.update()  ──→  currentDirection  ──→  PlayerController
                          ↑
  KeyboardInput ──→  getDirection()
    ↑
键盘事件 (keydown/keyup)
```

### 3.2 职责划分

| 模块 | 职责 | 输出 |
|------|------|------|
| `TouchInput` | 监听触屏事件，识别滑动方向 | `detectedDirection: string \| null` |
| `KeyboardInput` | 监听键盘事件，映射方向键 | `getDirection(): string \| null` |
| `InputManager` | 合并两种输入源，输出标准化方向命令 | `currentDirection: string \| null` |
| `PlayerController` | 消费方向命令，管理输入缓冲，驱动移动 | 玩家状态变化 |

### 3.3 调用时序

InputManager.update() 在主循环的 update(dt) 阶段被调用（非 fixedUpdate），每渲染帧执行一次：

```
每帧 update(dt):
  1. inputManager.update()          // 采集本帧输入
  2. // ... 其他 update 逻辑

每次 update(dt) / fixedUpdate(0.02s):
  1. playerController.fixedUpdate() // 消费 inputManager.consumeDirection()
```

**为什么输入采集在 update 而非 fixedUpdate**：
- 触屏和键盘事件是异步的，跟渲染帧对齐采集可以减少输入延迟
- fixedUpdate 可能在一帧内执行多次或零次，放在 update 中保证每帧只采集一次
- PlayerController 在 fixedUpdate 中通过 consumeDirection() 消费，天然与固定步长对齐

## 4. TouchInput 详细设计

### 4.1 滑动识别算法

**核心思路**：在 touchmove 阶段实时检测滑动距离，超过阈值时立即识别方向并消费触摸。不等 touchend，保证最低延迟。

**坐标与阈值口径**：当前实现使用浏览器触摸事件的 `clientX/clientY` 像素坐标，不再使用 `clientX / canvas.width` 的归一化坐标。滑动阈值在初始化时由设备 DPI 或 Canvas 客户区短边派生：

```
if (dpi <= 100 || dpi >= 1000):
  swipeThreshold = min(canvasClientWidth, canvasClientHeight) * 0.03
else:
  swipeThreshold = dpi * 0.16
```

短边 fallback 只影响 DPI 不可信路径；DPI 正常时仍保持逆向复核后的 `dpi * 0.16` 口径。横屏和竖屏都使用短边计算，可以让相同设备方向切换后保持更接近的滑动触发距离。

触摸手势还带有 `SWIPE_TIME_SECONDS = 1.0` 的时间窗口：手指按下后超过 1 秒仍未形成有效滑动时，下一次 `touchmove` 会重置起点并重新开启时间窗口。

### 4.2 完整流程

```
touchstart:
  if (tracking) return
  从 changedTouches[0] 或 touches[0] 取得新触点
  记录 activeTouchId = touch.identifier
  记录起始点 (clientX, clientY)
  重置 swipeTimeout = 1.0s
  标记 tracking = true

touchmove:
  if (!tracking) return
  在 event.touches 中查找 identifier == activeTouchId 的触点
  if (找不到主触点) return
  if (swipeTimeout <= 0):
    以当前触点重置起点和 swipeTimeout
    return
  计算 dx = currentClientX - startClientX
  计算 dy = currentClientY - startClientY
  if (max(|dx|, |dy|) > swipeThreshold):
    if (|dx| > |dy|):
      direction = dx > 0 ? 'right' : 'left'
    else:
      direction = dy > 0 ? 'down' : 'up'
    detectedDirection = direction
    将当前触点位置作为新的起点

update(dt):
  if (tracking) swipeTimeout = max(0, swipeTimeout - dt)

touchend / touchcancel:
  只有 changedTouches 包含 activeTouchId 时才结束 tracking
```

### 4.3 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 识别时机 | touchmove 阶段（不等 touchend） | 减少输入延迟，原版也是滑动过程中即触发 |
| 坐标口径 | clientX / clientY 像素坐标 | 与浏览器 TouchEvent 和当前实现一致 |
| 阈值口径 | DPI 有效时 `dpi * 0.16`，否则 `min(canvasClientWidth, canvasClientHeight) * 0.03` | 对 Android 真机、桌面浏览器和横竖屏 fallback 更稳定 |
| 方向判定 | 比较 \|dx\| vs \|dy\|，取绝对值大的轴 | 简单可靠，原版使用相同策略 |
| 主触点绑定 | 使用 `activeTouchId = touch.identifier` | 非主触点结束不应打断当前手势 |
| 连续滑动 | 识别方向后更新起点，保持 tracking | 支持手指不离屏的连续方向输入 |
| 时间窗口 | `SWIPE_TIME_SECONDS = 1.0` | 超时后重置起点，避免慢拖误判 |
| preventDefault | touchstart 和 touchmove 都调用 | 阻止浏览器默认滚动和缩放行为 |

### 4.4 防误触设计

**问题场景**：
1. 手指放上去没动就抬起（点击而非滑动）→ 不应产出方向
2. 手指斜向滑动（45° 附近）→ 需要明确判定为水平或垂直
3. 弹窗显示时手指在屏幕上滑动 → 不应触发移动

**处理方式**：

| 场景 | 处理 | 实现 |
|------|------|------|
| 点击（无滑动） | 不产出方向 | distance < swipeThreshold 时不触发 |
| 斜向滑动 | 取主轴方向 | \|dx\| vs \|dy\| 比较，严格大于才判定 |
| 弹窗期间滑动 | 屏蔽 | InputManager.update() 检查游戏状态，非 playing 时不采集 |
| 多指触摸 | 只处理当前主触点 | `touchmove` 按 `activeTouchId` 查找，非主触点结束不清空 tracking |

### 4.5 完整实现

```javascript
class TouchInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.tracking = false;
    this.activeTouchId = null;
    this.startX = 0;
    this.startY = 0;
    this.detectedDirection = null;
    this.swipeThreshold = resolveSwipeThreshold(canvas);
    this.swipeTime = 1.0;
    this.swipeTimeout = this.swipeTime;

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    canvas.addEventListener('touchcancel', this.onTouchCancel.bind(this));
  }

  onTouchStart(e) {
    e.preventDefault();
    if (this.tracking) return;

    const touch = e.changedTouches[0] || e.touches[0];
    if (!touch) return;

    this.activeTouchId = touch.identifier;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.swipeTimeout = this.swipeTime;
    this.tracking = true;
  }

  onTouchMove(e) {
    e.preventDefault();
    if (!this.tracking) return;

    const touch = findTouchByIdentifier(e.touches, this.activeTouchId);
    if (!touch) return;

    if (this.swipeTimeout <= 0) {
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.swipeTimeout = this.swipeTime;
      return;
    }

    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;

    if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.detectedDirection = dx > 0 ? 'right' : 'left';
      } else {
        this.detectedDirection = dy > 0 ? 'down' : 'up';
      }
      this.startX = touch.clientX;
      this.startY = touch.clientY;
    }
  }

  update(deltaTime = 0) {
    if (this.tracking) {
      this.swipeTimeout = Math.max(0, this.swipeTimeout - Math.max(deltaTime, 0));
    }
  }

  onTouchEnd(e) {
    if (!findTouchByIdentifier(e.changedTouches, this.activeTouchId)) return;
    this.tracking = false;
    this.activeTouchId = null;
  }

  onTouchCancel(e) {
    this.onTouchEnd(e);
  }

  getDirection() {
    const dir = this.detectedDirection;
    this.detectedDirection = null;
    return dir;
  }

  reset() {
    this.tracking = false;
    this.activeTouchId = null;
    this.detectedDirection = null;
    this.swipeTimeout = this.swipeTime;
  }
}
```

### 4.6 与 PM-02 接口的差异说明

PM-02 中 TouchInput 的 onTouchStart 只记录触摸起点，未建模主触点身份和滑动时间窗口。当前实现补齐了两个差异：
- 使用 `activeTouchId` 绑定当前手势生命周期，避免非主触点结束导致输入采集中断。
- 使用 `swipeTimeout` 和 `SWIPE_TIME_SECONDS = 1.0` 限制单次滑动判定窗口，超时后重置起点。

新增了 `touchcancel` 事件监听和 `reset()` 方法，用于状态清理；`touchend` 与 `touchcancel` 都必须先确认 `changedTouches` 包含主触点。

## 5. KeyboardInput 详细设计

### 5.1 按键映射表

| 按键 | 方向 | 说明 |
|------|------|------|
| `ArrowUp` / `w` / `W` | `up` | 向上移动 |
| `ArrowDown` / `s` / `S` | `down` | 向下移动 |
| `ArrowLeft` / `a` / `A` | `left` | 向左移动 |
| `ArrowRight` / `d` / `D` | `right` | 向右移动 |

支持方向键和 WASD 两套键位，覆盖主流 PC 操作习惯。

### 5.2 状态管理模型

键盘输入采用"按下即触发、持续按住不重复"的模型：

```
keydown:
  if (key 在映射表中 && !已按下):
    pendingDirection = 对应方向
    标记 key 为已按下

keyup:
  标记 key 为未按下
```

**为什么不用持续按住重复触发**：
- 原版 TOTM 是"一次输入一次滑行"，不是"按住持续移动"
- 持续触发会导致输入缓冲被反复覆盖，破坏手感
- 玩家需要松开再按才能触发下一次移动

### 5.3 多键同时按下

当多个方向键同时按下时，取最后按下的键作为方向。实现方式：每次 keydown 都覆盖 pendingDirection，不做队列。

### 5.4 完整实现

```javascript
class KeyboardInput {
  constructor() {
    this.keyStates = {};
    this.pendingDirection = null;

    this.keyMap = {
      'ArrowUp': 'up', 'w': 'up', 'W': 'up',
      'ArrowDown': 'down', 's': 'down', 'S': 'down',
      'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
      'ArrowRight': 'right', 'd': 'right', 'D': 'right'
    };

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  onKeyDown(e) {
    const dir = this.keyMap[e.key];
    if (!dir) return;
    e.preventDefault();
    if (!this.keyStates[e.key]) {
      this.keyStates[e.key] = true;
      this.pendingDirection = dir;
    }
  }

  onKeyUp(e) {
    if (this.keyMap[e.key]) {
      this.keyStates[e.key] = false;
    }
  }

  getDirection() {
    const dir = this.pendingDirection;
    this.pendingDirection = null;
    return dir;
  }

  reset() {
    this.keyStates = ;
    this.pendingDirection = null;
  }
}
```

### 5.5 与 PM-02 接口的差异说明

PM-02 中 KeyboardInput 使用"持续按住 = 持续返回方向"的模型（每帧检查 keyStates 返回当前按下的方向）。本方案改为"按下即触发一次"模型，原因：
- 与触屏滑动行为对齐（一次滑动 = 一次方向命令）
- 避免持续按住时每帧都产出方向，导致输入缓冲被反复覆盖
- 更符合原版"一次输入一次滑行"的设计

如果后续需要支持"按住持续移动"的模式（如 Arcade 模式），可以在 KeyboardInput 中增加 holdMode 开关。

## 6. 输入合并策略

### 6.1 优先级规则

```
InputManager.update():
  1. 先尝试从 TouchInput 获取方向
  2. 如果触屏无输入，再从 KeyboardInput 获取
  3. 如果都无输入，currentDirection = null
```

**触屏优先的原因**：
- MVP 目标平台是安卓浏览器，触屏是主要输入方式
- 键盘主要用于 PC 端调试
- 触屏滑动的识别有阈值延迟，如果不优先处理可能被键盘输入覆盖

### 6.2 同帧双输入

如果同一帧内触屏和键盘都产出了方向：
- 触屏方向被采用，键盘方向被丢弃
- 这是合理的，因为实际使用中不会同时用触屏和键盘

### 6.3 完整实现

```javascript
class InputManager {
  constructor(canvas) {
    this.touchInput = new TouchInput(canvas);
    this.keyboardInput = new KeyboardInput();
    this.currentDirection = null;
    this.enabled = true;
  }

  update(deltaTime = 0) {
    if (!this.enabled) {
      this.currentDirection = null;
      return;
    }

    this.touchInput.update(deltaTime);
    let dir = this.touchInput.getDirection();
    if (!dir) {
      dir = this.keyboardInput.getDirection();
    }
    this.currentDirection = dir;
  }

  consumeDirection() {
    const dir = this.currentDirection;
    this.currentDirection = null;
    return dir;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.currentDirection = null;
      this.touchInput.reset();
      this.keyboardInput.reset();
    }
  }
}
```

### 6.4 与 PM-02 接口的差异说明

新增了 `enabled` 开关和 `setEnabled()` 方法，用于游戏状态切换时统一屏蔽/恢复输入。PM-02 原设计中没有此机制，输入屏蔽逻辑分散在各处。

## 7. 输入与游戏状态交互

### 7.1 状态-输入映射表

| 游戏状态 | 输入是否启用 | 说明 |
|---------|------------|------|
| `loading` | 否 | 关卡加载中，不接受输入 |
| `playing` | 是 | 正常游玩，接受方向输入 |
| `paused_fail` | 否 | 失败弹窗显示中，只接受弹窗按钮点击 |
| `paused_complete` | 否 | 通关弹窗显示中，只接受弹窗按钮点击 |
| `menu` | 否 | 主菜单，不接受方向输入 |

### 7.2 状态切换时的输入处理

```
进入 playing:
  inputManager.setEnabled(true)

离开 playing（进入任何其他状态）:
  inputManager.setEnabled(false)
  // setEnabled(false) 会自动清空 currentDirection 和子模块状态
```

**为什么离开 playing 时要清空状态**：
- 防止死亡瞬间的滑动方向残留到重开后
- 防止通关弹窗期间的触摸状态泄漏到下一关

### 7.3 弹窗期间的事件隔离

弹窗（失败/通关）显示期间：
- InputManager 被禁用，不采集方向输入
- 弹窗按钮使用独立的 click 事件监听，不经过 InputManager
- touchmove 事件仍被 preventDefault 阻止（防止页面滚动），但不产出方向

这与 ENG-05 中定义的规则一致：弹窗期间只监听 click，不监听 touchmove 作为游戏输入。

## 8. 输入缓冲机制

### 8.1 职责归属

输入缓冲由 PlayerController 管理（定义在 PM-02 2.3.4），不在 InputManager 内部实现。本节补充 PM-02 中未详细说明的边界条件。

### 8.2 缓冲流程回顾

```
PlayerController.update(dt):
  if (bufferedDirection):
    bufferTimer -= dt
    if (bufferTimer <= 0): bufferedDirection = null

PlayerController.fixedUpdate():
  if (state === 'idle'):
    dir = bufferedDirection || inputManager.consumeDirection()
    if (dir): startMove(dir)
  
  if (state === 'moving'):
    // 检查新输入
    newDir = inputManager.consumeDirection()
    if (newDir):
      bufferedDirection = newDir
      bufferTimer = 0.1  // 重置计时器
    
    // 继续移动...
```

### 8.3 边界条件补充

| 场景 | 行为 | 说明 |
|------|------|------|
| 移动中输入同方向 | 覆盖缓冲，重置计时器 | 不会加速当前移动 |
| 移动中输入反方向 | 覆盖缓冲，重置计时器 | 停下后立即反向移动 |
| 移动中连续输入两个不同方向 | 后者覆盖前者 | 只保留最后一次输入 |
| 缓冲过期后输入 | 正常处理为新输入 | 缓冲过期 = 回到 idle 等待输入 |
| 死亡瞬间有缓冲方向 | 缓冲被清空 | PlayerController.reset() 清空所有状态 |
| 重开关卡后立即输入 | 正常响应 | InputManager 在进入 playing 时重新启用 |

### 8.4 缓冲窗口参数

| 参数 | 值 | 来源 |
|------|-----|------|
| `bufferDuration` | 0.1s (100ms) | R-008，源自逆向报告 ProcessSwipe._nextSwipeTimeout = 0.1f |

100ms 约等于 5 个 fixedUpdate 步长或 5~6 个 60fps 渲染帧。它用于覆盖玩家在角色接近墙体前提前滑动下一个方向的预输入窗口；倒计时应按 `update(dt)` 递减，实际位移仍由 `fixedUpdate` 执行。

## 9. 关键参数汇总

| 参数 | 值 | 来源 | 说明 |
|------|-----|------|------|
| `swipeThreshold` | DPI 有效时 `dpi * 0.16`；DPI 无效时 `min(canvasClientWidth, canvasClientHeight) * 0.03` | OPS-01 / 逆向报告 8.5 系列回归 | 滑动识别最小像素距离，低于此值视为点击或慢拖 |
| `swipeTime` | 1.0s | OPS-01 / 逆向报告 8.5a | 单次滑动判定时间窗口，超时后重置起点 |
| `activeTouchId` | 当前主触点 `touch.identifier` | OPS-01 Android 真机回归 | 多指触摸时保护主触点生命周期 |
| `bufferDuration` | 0.1s (100ms) | R-008 / 逆向报告 | 输入缓冲窗口，约 5 个 fixedUpdate 步长，按 update(dt) 递减 |
| `runSpeedWorldUnitsPerSecond` | 5.0 world units/s | PM-02 PlayerController / R-009 | 玩家连续位移主速度；`41.6667 tiles/s` 仅作为由 `TileSize = 0.12 world units/tile` 派生出的显示/验收换算值 |
| `fixedDeltaTime` | 0.02s (20ms) | PM-02 GameLoop | 固定步长，PlayerController 消费输入的频率 |
| Canvas 逻辑尺寸 | 1080×1920 | PM-02 Renderer | 归一化坐标的基准 |

**参数调优说明**：
- 当前 `swipeThreshold` 已从归一化比例改为像素阈值，优先使用 DPI；当浏览器 DPI 明显不可信时，退回到 Canvas 客户区短边的 3%，避免横屏长边导致 fallback 阈值偏大、滑动体感变钝。
- 这些参数在 MVP 阶段硬编码，后续可提取为配置。

## 10. 边界条件

| 场景 | 预期行为 | 处理方式 |
|------|---------|---------|
| 触屏和键盘同帧输入 | 触屏方向被采用，键盘方向被丢弃 | InputManager.update() 中触屏优先 |
| 多指触摸 | 只处理已绑定的主触点 | `activeTouchId` 匹配 `touch.identifier` |
| 斜向 45° 滑动 | 取 \|dx\| 和 \|dy\| 中较大的轴 | 严格大于才判定，相等时取垂直轴（dy） |
| 触摸后不移动直接抬起 | 不产出方向 | distance < swipeThreshold |
| 手指不离屏连续滑动 | 每次超过阈值都可产出方向 | 识别后更新起点并保持 tracking |
| 非主触点结束 | 不影响当前滑动 | `changedTouches` 不含 `activeTouchId` 时不清 tracking |
| 滑动时间窗口超时 | 重置起点并重新开启 1.0s 窗口 | `swipeTimeout <= 0` 时不产出方向 |
| 多个方向键同时按下 | 取最后按下的键 | keydown 覆盖 pendingDirection |
| 按住方向键不松开 | 只触发一次方向命令 | keyStates 防重复 |
| 松开后再按同一个键 | 触发新的方向命令 | keyup 重置 keyStates |
| 弹窗显示瞬间正在滑动 | 滑动被忽略 | setEnabled(false) 清空所有状态 |
| 弹窗关闭后立即滑动 | 正常响应 | setEnabled(true) 恢复采集 |
| 死亡瞬间有缓冲方向 | 缓冲被清空 | PlayerController.reset() |
| Canvas 尺寸动态变化 | 后续新建 TouchInput 或阈值重算时适应 | 阈值初始化时读取 Canvas 客户区短边 |
| touchcancel 事件 | 只在取消主触点时清理触摸状态 | 与 touchend 共用主触点检查 |
| 浏览器默认滚动/缩放 | 被阻止 | touchstart/touchmove 调用 preventDefault |

## 11. 测试矩阵

### 11.1 单元测试

| 测试用例 | 输入 | 预期输出 | 验证点 |
|---------|------|---------|--------|
| 右滑识别 | touchstart(500, 500) → touchmove(560, 500) 且超过阈值 | `detectedDirection === 'right'` | 水平滑动方向正确 |
| 上滑识别 | touchstart(500, 500) → touchmove(500, 440) 且超过阈值 | `detectedDirection === 'up'` | 垂直滑动方向正确 |
| 短距离不触发 | touchstart 后移动距离低于 `swipeThreshold` | `detectedDirection === null` | 阈值过滤有效 |
| 斜向滑动取主轴 | `absDx > absDy` | `detectedDirection === 'right'` 或 `'left'` | dx > dy 时取水平 |
| 连续滑动 | 识别一次后同一主触点继续移动 | 可再次产出方向 | 起点更新且 tracking 保持 |
| 主触点 move 匹配 | event.touches 中包含 activeTouchId | 正常计算方向 | 主触点身份有效 |
| 非主触点 end | changedTouches 不含 activeTouchId | tracking 保持 true | 多指结束不误清 |
| 主触点 end/cancel | changedTouches 包含 activeTouchId | tracking=false, activeTouchId=null | 生命周期清理 |
| 滑动时间窗口超时 | swipeTimeout <= 0 后 touchmove | 重置起点，不产出方向 | 1.0s 窗口有效 |
| getDirection 消费后清空 | 调用 getDirection() 两次 | 第一次返回方向，第二次返回 null | 消费语义正确 |
| 键盘方向键映射 | keydown ArrowUp | `pendingDirection === 'up'` | 映射正确 |
| WASD 映射 | keydown 'w' | `pendingDirection === 'up'` | WASD 支持 |
| 按住不重复 | keydown ArrowUp × 2（不松开） | pendingDirection 只设置一次 | keyStates 防重复 |
| 松开后再按 | keydown → keyup → keydown | pendingDirection 被重新设置 | 状态正确重置 |
| 非映射键忽略 | keydown 'q' | `pendingDirection === null` | 无关键过滤 |
| 输入合并触屏优先 | 触屏='right', 键盘='up' | `currentDirection === 'right'` | 优先级正确 |
| 输入合并键盘兜底 | 触屏=null, 键盘='left' | `currentDirection === 'left'` | 兜底逻辑正确 |
| 禁用状态 | setEnabled(false) 后 update | `currentDirection === null` | 屏蔽有效 |
| 禁用时清空子模块 | setEnabled(false) | touchInput.detectedDirection === null, keyboardInput.pendingDirection === null | 状态清理完整 |
| reset 清空 | TouchInput.reset() | tracking=false, detectedDirection=null | 重置完整 |

### 11.2 集成测试

| 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|
| 触屏滑动移动 | 在游戏画面上向右滑动 | 角色向右滑行至碰壁 |
| 键盘移动 | 按下 ArrowDown | 角色向下滑行至碰壁 |
| WASD 移动 | 按下 'a' | 角色向左滑行至碰壁 |
| 触屏键盘切换 | 先滑动，再按键盘 | 两种输入都能正常驱动移动 |
| 弹窗期间滑动 | 失败弹窗显示时滑动 | 角色不移动 |
| 弹窗关闭后输入 | 点击重新开始后立即滑动 | 角色正常响应 |
| 快速连续输入 | 移动中快速滑动另一方向 | 缓冲生效，停下后立即转向 |
| 死亡后重开输入 | 死亡 → 重新开始 → 立即滑动 | 角色正常响应，无残留方向 |
| 多设备触屏 | 不同分辨率和 DPI 设备上滑动 | 滑动阈值与 Android 真机验收口径一致 |
| 多指触摸 | 主触点按住时增加/移除第二触点 | 主触点后续滑动仍被采集 |
| 页面不滚动 | 在 Canvas 上滑动 | 页面不发生滚动或缩放 |

## 12. 性能约束

| 指标 | 目标 | 说明 |
|------|------|------|
| 输入采集延迟 | <16ms（1 帧） | update() 每帧执行，事件驱动无额外延迟 |
| InputManager.update() 耗时 | <0.1ms | 只做两次 getDirection() 调用和一次赋值 |
| 事件监听器数量 | 6 个 | touchstart/touchmove/touchend/touchcancel + keydown/keyup |
| 内存占用 | <1KB | 几个数值字段和一个按键状态对象 |

**为什么输入延迟可以接受**：
- 触屏事件在 touchmove 阶段即时识别，不等 touchend，延迟 = 浏览器事件派发延迟（通常 <8ms）
- 键盘事件在 keydown 时立即记录，延迟同上
- InputManager.update() 在每帧 update(dt) 中调用，最坏情况下输入在下一帧被采集（16ms @60fps）
- PlayerController 在 fixedUpdate 中消费，最坏再加一个 fixedDeltaTime（20ms）
- 端到端最坏延迟：8ms（事件）+ 16ms（采集）+ 20ms（消费）= 44ms，人类感知阈值约 100ms

## 13. 风险与替代方案

| 风险 | 影响 | 替代方案 |
|------|------|---------|
| swipeThreshold 在特定设备上过大或过小 | 误触或需要滑动很远才触发 | 调整 DPI 因子或短边 fallback 因子 |
| 浏览器报告的 DPI 不可信 | 阈值明显偏离体感 | 使用 `min(canvasClientWidth, canvasClientHeight) * 0.03` fallback |
| touchmove 事件频率在低端安卓设备上较低 | 快速滑动可能漏检 | 降低 swipeThreshold 或在 touchend 补充检测 |
| 主触点 ID 未正确维护 | 多指触摸后输入采集中断 | `activeTouchId` 与 `changedTouches` 单元/真机回归覆盖 |
| 浏览器 passive event listener 警告 | 控制台警告（不影响功能） | 已在 addEventListener 中设置 `{ passive: false }` |
| 键盘输入在移动端虚拟键盘上不可用 | 移动端无法使用键盘操作 | 移动端只依赖触屏，键盘仅用于 PC 调试 |
| 同时使用触屏和键盘时体验不一致 | 触屏方向覆盖键盘方向 | 实际场景中不会同时使用两种输入 |

---

## 变更日志

| 日期 | 变更类型 | 变更内容 | 影响范围 |
|------|---------|---------|---------|
| 2026-04-21 | INIT | 创建初稿 | 全文档 |
| 2026-04-29 | DESIGN | 同步 R-009 三层坐标域方案，将输入文档中的玩家速度参数从 `moveSpeed tiles/s` 改为 world-units 主口径说明 | 9. 关键参数汇总 |
| 2026-04-30 | BASELINE | 修正 R-008 输入缓冲窗口为 `0.1s/100ms`，并明确缓冲倒计时由 `update(dt)` 递减、移动仍由 `fixedUpdate` 执行 | 8. 输入缓冲机制、9. 关键参数汇总 |
| 2026-05-01 | VALIDATION | ENG-04 已完成 100ms 输入缓冲代码实现与真实浏览器回归；快速连续滑动、AHK 边界测试、缓冲过期和单缓冲覆盖语义均为 `PASS` | 8. 输入缓冲机制、12. 性能要求、ENG-04 联动 |
| 2026-06-08 | DOC_FIX | 同步 OPS-01 后续 TouchInput 实现：DPI/宽度派生像素阈值、`SWIPE_TIME_SECONDS = 1.0`、`activeTouchId` 主触点绑定、非主触点结束不清 tracking | 4. TouchInput 详细设计、9. 关键参数汇总、10. 边界条件、11. 测试矩阵 |

---

## 附录：参考文档

- PM-02 核心运行时设计文档（InputManager 2.3.3、PlayerController 2.3.4）
- ENG-04 核心移动手感设计文档（输入缓冲与移动协作）
- ENG-05 HUD 状态流技术方案（弹窗期间输入屏蔽）
- MVP 需求清单 R-006、R-008
