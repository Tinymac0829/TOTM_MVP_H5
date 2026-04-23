# ENG-03 输入基础层技术方案

**文档类型**：L2 技术方案文档  
**任务 ID**：ENG-03  
**创建日期**：2026-04-21  
**最后更新**：2026-04-21  
**状态**：初稿  
**依赖**：PM-02 核心运行时设计文档（InputManager 2.3.3、PlayerController 2.3.4）  
**覆盖需求**：R-006（触屏滑动与键盘输入）、R-008（输入缓冲窗口 0.02s）

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
- 触屏滑动识别完整算法（归一化坐标、阈值、方向判定、防误触）
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
触屏事件 (touchstart/touchmove/touchend)
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

每次 fixedUpdate (0.02s):
  1. playerController.fixedUpdate() // 消费 inputManager.consumeDirection()
```

**为什么输入采集在 update 而非 fixedUpdate**：
- 触屏和键盘事件是异步的，跟渲染帧对齐采集可以减少输入延迟
- fixedUpdate 可能在一帧内执行多次或零次，放在 update 中保证每帧只采集一次
- PlayerController 在 fixedUpdate 中通过 consumeDirection() 消费，天然与固定步长对齐

## 4. TouchInput 详细设计

### 4.1 滑动识别算法

**核心思路**：在 touchmove 阶段实时检测滑动距离，超过阈值时立即识别方向并消费触摸。不等 touchend，保证最低延迟。

**归一化坐标**：触摸坐标除以 Canvas 尺寸，转为 [0, 1] 范围。这样滑动阈值在不同分辨率下行为一致。

```
归一化 x = touch.clientX / canvas.width
归一化 y = touch.clientY / canvas.height
```

### 4.2 完整流程

```
touchstart:
  记录起始点 (normalizedX, normalizedY, timestamp)
  标记 tracking = true

touchmove:
  if (!tracking) return
  计算 dx = currentNormalizedX - startNormalizedX
  计算 dy = currentNormalizedY - startNormalizedY
  计算 distance = max(|dx|, |dy|)
  if (distance >= swipeThreshold):
    if (|dx| > |dy|):
      direction = dx > 0 ? 'right' : 'left'
    else:
      direction = dy > 0 ? 'down' : 'up'
    detectedDirection = direction
    tracking = false    // 消费这次触摸，后续 move 事件忽略

touchend:
  tracking = false      // 清理状态
```

### 4.3 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 识别时机 | touchmove 阶段（不等 touchend） | 减少输入延迟，原版也是滑动过程中即触发 |
| 坐标归一化 | clientX / canvas.width | 不同分辨率下阈值行为一致 |
| 方向判定 | 比较 \|dx\| vs \|dy\|，取绝对值大的轴 | 简单可靠，原版使用相同策略 |
| 单次消费 | 识别后立即设 tracking = false | 一次触摸只产出一个方向，防止连续触发 |
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
| 多指触摸 | 只处理第一根手指 | 始终使用 e.touches[0] |

### 4.5 完整实现

```javascript
class TouchInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.tracking = false;
    this.startX = 0;
    this.startY = 0;
    this.detectedDirection = null;
    this.swipeThreshold = 0.3;

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));
  }

  onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.startX = touch.clientX / this.canvas.width;
    this.startY = touch.clientY / this.canvas.height;
    this.tracking = true;
  }

  onTouchMove(e) {
    e.preventDefault();
    if (!this.tracking) return;

    const touch = e.touches[0];
    const dx = touch.clientX / this.canvas.width - this.startX;
    const dy = touch.clientY / this.canvas.height - this.startY;

    if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.detectedDirection = dx > 0 ? 'right' : 'left';
      } else {
        this.detectedDirection = dy > 0 ? 'down' : 'up';
      }
      this.tracking = false;
    }
  }

  onTouchEnd(e) {
    this.tracking = false;
  }

  getDirection() {
    const dir = this.detectedDirection;
    this.detectedDirection = null;
    return dir;
  }

  reset() {
    this.tracking = false;
    this.detectedDirection = null;
  }
}
```

### 4.6 与 PM-02 接口的差异说明

PM-02 中 TouchInput 的 onTouchStart 记录了 `time: performance.now()`，本方案移除了该字段。原因：
- 当前设计在 touchmove 阶段即时识别，不需要基于时间的超时判定
- 如果后续需要区分"快速滑动"和"慢速拖拽"，可以重新加入时间戳

新增了 `touchcancel` 事件监听和 `reset()` 方法，用于状态清理。

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

  update() {
    if (!this.enabled) {
      this.currentDirection = null;
      return;
    }

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
PlayerController.fixedUpdate():
  if (state === 'idle'):
    dir = bufferedDirection || inputManager.consumeDirection()
    if (dir): startMove(dir)
  
  if (state === 'moving'):
    // 更新缓冲计时器
    if (bufferedDirection):
      bufferTimer -= 0.02
      if (bufferTimer <= 0): bufferedDirection = null
    
    // 检查新输入
    newDir = inputManager.consumeDirection()
    if (newDir):
      bufferedDirection = newDir
      bufferTimer = 0.02  // 重置计时器
    
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
| `bufferDuration` | 0.02s (20ms) | R-008，源自逆向报告 ProcessSwipe._nextSwipeTimeout |

20ms 等于一个 fixedUpdate 步长。这意味着缓冲方向最多在下一个 fixedUpdate 中被消费，如果没被消费就过期。这个窗口足够短，不会让玩家感觉"输入被延迟执行"，但足够长，能容纳快速连续滑动的第二次输入。

## 9. 关键参数汇总

| 参数 | 值 | 来源 | 说明 |
|------|-----|------|------|
| `swipeThreshold` | 0.3（归一化距离） | PM-02 TouchInput | 滑动识别最小距离，低于此值视为点击 |
| `bufferDuration` | 0.02s (20ms) | R-008 / 逆向报告 | 输入缓冲窗口，等于一个 fixedUpdate 步长 |
| `moveSpeed` | 5.0 tiles/s | PM-02 PlayerController | 玩家移动速度（调试模式下可修改） |
| `fixedDeltaTime` | 0.02s (20ms) | PM-02 GameLoop | 固定步长，PlayerController 消费输入的频率 |
| Canvas 逻辑尺寸 | 1080×1920 | PM-02 Renderer | 归一化坐标的基准 |

**参数调优说明**：
- `swipeThreshold = 0.3` 意味着手指需要滑过屏幕宽度的 30% 才触发。如果测试中发现误触率高，可以增大到 0.35；如果觉得不够灵敏，可以减小到 0.25。
- 这些参数在 MVP 阶段硬编码，后续可提取为配置。

## 10. 边界条件

| 场景 | 预期行为 | 处理方式 |
|------|---------|---------|
| 触屏和键盘同帧输入 | 触屏方向被采用，键盘方向被丢弃 | InputManager.update() 中触屏优先 |
| 多指触摸 | 只处理第一根手指 | 始终使用 e.touches[0] |
| 斜向 45° 滑动 | 取 \|dx\| 和 \|dy\| 中较大的轴 | 严格大于才判定，相等时取垂直轴（dy） |
| 触摸后不移动直接抬起 | 不产出方向 | distance < swipeThreshold |
| 快速连续两次滑动 | 第一次被识别，第二次需要新的 touchstart | tracking = false 后需重新触发 touchstart |
| 多个方向键同时按下 | 取最后按下的键 | keydown 覆盖 pendingDirection |
| 按住方向键不松开 | 只触发一次方向命令 | keyStates 防重复 |
| 松开后再按同一个键 | 触发新的方向命令 | keyup 重置 keyStates |
| 弹窗显示瞬间正在滑动 | 滑动被忽略 | setEnabled(false) 清空所有状态 |
| 弹窗关闭后立即滑动 | 正常响应 | setEnabled(true) 恢复采集 |
| 死亡瞬间有缓冲方向 | 缓冲被清空 | PlayerController.reset() |
| Canvas 尺寸动态变化 | 归一化坐标自动适应 | 每次 touchmove 都重新除以 canvas.width/height |
| touchcancel 事件 | 清理触摸状态 | 与 touchend 相同处理 |
| 浏览器默认滚动/缩放 | 被阻止 | touchstart/touchmove 调用 preventDefault |

## 11. 测试矩阵

### 11.1 单元测试

| 测试用例 | 输入 | 预期输出 | 验证点 |
|---------|------|---------|--------|
| 右滑识别 | touchstart(0.5, 0.5) → touchmove(0.85, 0.5) | `detectedDirection === 'right'` | 水平滑动方向正确 |
| 上滑识别 | touchstart(0.5, 0.5) → touchmove(0.5, 0.15) | `detectedDirection === 'up'` | 垂直滑动方向正确 |
| 短距离不触发 | touchstart(0.5, 0.5) → touchmove(0.6, 0.5) | `detectedDirection === null` | 阈值过滤有效 |
| 斜向滑动取主轴 | touchstart(0.5, 0.5) → touchmove(0.85, 0.75) | `detectedDirection === 'right'` | dx > dy 时取水平 |
| 单次消费 | 识别后再次 touchmove | `detectedDirection` 不变 | tracking = false 生效 |
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
| 多设备触屏 | 不同分辨率设备上滑动 | 滑动灵敏度一致（归一化坐标） |
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
| swipeThreshold 在小屏设备上过大 | 需要滑动很远才触发 | 根据设备 DPI 动态调整阈值（非 MVP） |
| 归一化坐标在非正方形 Canvas 上行为不一致 | 水平和垂直方向灵敏度不同 | 改用像素距离 + DPI 归一化（非 MVP） |
| touchmove 事件频率在低端安卓设备上较低 | 快速滑动可能漏检 | 降低 swipeThreshold 或在 touchend 补充检测 |
| 浏览器 passive event listener 警告 | 控制台警告（不影响功能） | 已在 addEventListener 中设置 `{ passive: false }` |
| 键盘输入在移动端虚拟键盘上不可用 | 移动端无法使用键盘操作 | 移动端只依赖触屏，键盘仅用于 PC 调试 |
| 同时使用触屏和键盘时体验不一致 | 触屏方向覆盖键盘方向 | 实际场景中不会同时使用两种输入 |

---

## 变更日志

| 日期 | 变更类型 | 变更内容 | 影响范围 |
|------|---------|---------|---------|
| 2026-04-21 | INIT | 创建初稿 | 全文档 |

---

## 附录：参考文档

- PM-02 核心运行时设计文档（InputManager 2.3.3、PlayerController 2.3.4）
- ENG-04 核心移动手感设计文档（输入缓冲与移动协作）
- ENG-05 HUD 状态流技术方案（弹窗期间输入屏蔽）
- MVP 需求清单 R-006、R-008
