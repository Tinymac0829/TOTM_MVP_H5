# ENG-04 核心移动手感设计文档

**文档类型**：L3 设计文档（策划案 + 技术方案）  
**任务 ID**：ENG-04  
**创建日期**：2026-04-16  
**最后更新**：2026-05-01
**状态**：坐标域与输入缓冲方案已实现并通过真实浏览器回归
**来源**：基于逆向报告中冻结的原版 Tomb of the Mask v1.25.0 核心移动手感规则  
**依赖**：PM-02 核心运行时设计文档

---

## 第一部分：策划案

### 1.1 玩家体验目标

**核心体验**：精准、流畅、可预测的网格滑行手感

**体验支柱**：
1. **即时响应**：输入到响应延迟 <50ms，玩家感觉"想到即做到"
2. **连击流畅**：快速连续滑动时，第二次输入不会丢失，形成流畅的连击感
3. **可预测性**：玩家能准确预判角色会在哪里停下，形成"心流"状态
4. **容错性**：输入缓冲机制给玩家 100ms 的容错窗口，降低操作难度

### 1.2 玩法规则

#### 四向滑行规则
- 玩家只能沿四个方向移动：上、下、左、右
- 无对角线移动
- 一次滑动触发一次移动，角色沿该方向直线滑行
- 滑行持续到遇到阻挡物（墙壁、边界）或触发事件（死亡、通关）

#### 输入缓冲规则（核心手感机制）
**问题**：如果玩家在角色移动中滑动，而游戏不接受输入，会导致"输入丢失"，手感很差。

**解决方案**：输入缓冲机制
- 玩家在角色移动中滑动时，方向被缓存到 `bufferedDirection`
- 缓冲有效期：0.1 秒（100ms）
- 角色停下后，如果缓冲仍有效，立即执行缓冲的方向
- 如果缓冲过期（超过 100ms），清空缓冲

**时序示例**：
```
t=0.00s: 玩家向右滑动 → 角色开始向右移动
t=0.15s: 玩家向上滑动（角色仍在移动中）→ 方向存入缓冲，bufferTimer = 0.10s
t=0.20s: bufferTimer = 0.05s（递减中）
t=0.26s: bufferTimer <= 0（过期）→ 缓冲清空
t=0.30s: 角色停下 → 检查缓冲，发现已过期，不执行

正确时序：
t=0.00s: 玩家向右滑动 → 角色开始向右移动
t=0.18s: 玩家向上滑动 → 方向存入缓冲，bufferTimer = 0.10s
t=0.24s: bufferTimer = 0.04s
t=0.26s: 角色停下 → 检查缓冲，仍有效（0.02s 剩余）→ 立即向上移动
```

#### 碰撞规则（MVP 子集）
- **Wall**：阻挡，角色停在墙前一格
- **Spikes**：角色移动到尖刺格子，然后死亡
- **Exit**：角色移动到出口格子，然后通关
- **Dot / Coin / Star**：收集，继续移动

#### 移动速度规则
- 源速度：`_runSpeed = 5.0 world units/s`（源自逆向报告，运行时不变）
- 单格尺寸：`TileSize = 0.12 world units/tile`
- 当前 H5 MVP 采用三层坐标域：Tile 拓扑坐标、World 运动坐标、Screen/Design 像素坐标
- 关卡 JSON、碰撞和事件判定继续使用整数 tile 拓扑坐标
- 玩家连续位移、速度、移动距离和耗时计算使用 world units 作为主口径
- tile-grid 等效穿格速度只作为显示和验收换算值：`5.0 / 0.12 = 41.6667 tiles/s`
- `_gameStageScale = 1.6` 是舞台/相机缩放相关参数，不参与玩家 tile 位移速度换算
- 移动时间 = `tileDistance * TileSize / _runSpeed`
- 例如：移动 3 格需要约 0.072 秒

### 1.3 反馈表现

#### 视觉反馈
- **移动动画**：平滑的线性插值（Lerp），从起点到终点
- **撞墙**：角色停在墙前一格，无回弹效果
- **收集物**：角色移动到或经过对应格子时消失，不能在滑行开始瞬间整条路径提前消失
- **死亡**：角色消失，播放简单的爆炸效果

#### 音效反馈（占位期）
- **滑动**：短促的"嗖"声（每次滑动触发一次）
- **撞墙**：低沉的"咚"声
- **收集圆点/金币**：清脆的"叮"声，支持 pitch 递增（连续收集时音调升高）

#### 触觉反馈（可选）
- **撞墙**：轻微震动
- **死亡**：中等震动

### 1.4 数值基线

**来源**：逆向报告《开发用数值真值表》，100% 精准

| 参数 | 值 | 单位 | 置信度 | 来源 |
|------|-----|------|--------|------|
| 玩家源速度 `_runSpeed` | 5.0 | world units/s | 🟢 | PlayerController._runSpeed + 逐帧验证复核 |
| 单格尺寸 `TileSize` | 0.12 | world units/tile | 🟢 | GameplayController.TileSize + 逐帧验证复核 |
| 玩家 tile-grid 等效速度 | 41.6667 | tiles/s | 🟢 | `_runSpeed / TileSize` |
| 舞台缩放 `_gameStageScale` | 1.6 | 倍率 | 🟡 | 舞台/相机缩放参数；不参与玩家 tile 位移速度换算 |
| 输入缓冲窗口 | 0.1 | 秒 | 🟢 | ProcessSwipe._nextSwipeTimeout = 0.1f |
| 滑动识别阈值 | 0.3 | 归一化距离 | 🟢 | ProcessSwipe 反汇编常量 |
| 固定步长 | 0.02 | 秒 | 🟢 | 运行时宏观规则 |

### 1.5 失败与成功条件

#### 失败条件
- 角色到达 Spikes 瓦片

#### 成功条件
- 角色到达 Exit 瓦片

#### 边界情况
- 角色在移动中死亡：移动动画继续播放到尖刺格子，然后触发死亡
- 角色在移动中通关：移动动画继续播放到出口格子，然后触发通关

### 1.6 验收标准（策划层）

**手感验收**：
- [ ] 输入到响应延迟 <50ms（在基线设备上测试）
- [ ] 快速连续滑动时，第二次滑动不会被吞掉
- [ ] 移动速度在不同设备上保持一致（通过固定步长保证）
- [ ] 角色停在墙前一格，不会"穿墙"或"滑过头"

**输入缓冲验收**：
- [ ] 移动中滑动，停下后立即执行缓冲方向（缓冲有效期内）
- [ ] 移动中滑动，停下超过 100ms 后缓冲失效，不执行
- [ ] 移动中多次滑动，只保留最后一次（覆盖缓冲）

**碰撞验收**：
- [ ] 撞墙时停在墙前一格
- [ ] 触碰尖刺时移动到尖刺格子，然后死亡
- [ ] 到达出口时移动到出口格子，然后通关
- [ ] 角色移动到或经过收集物格子时，收集物随当前经过进度消失，角色继续移动

---

## 第二部分：技术方案

### 2.1 背景

本文档定义 TOTM MVP H5 版本的核心移动手感实现细节。本文档依赖 PM-02 中定义的运行时架构、输入管理、碰撞检测接口。

**设计约束**：
- 必须使用固定步长（0.02s）更新玩法逻辑，保证跨设备一致性
- 必须支持输入缓冲机制，缓冲窗口 0.1s
- 速度源基线必须为 `_runSpeed = 5.0 world units/s`，并按 `TileSize = 0.12 world units/tile` 派生显示用 tile-grid 等效速度约 `41.67 tiles/s`
- 代码必须显式区分 Tile 拓扑坐标、World 运动坐标、Screen/Design 像素坐标，避免再把 `tiles/s`、world units 与像素坐标混用
- 固定步长运行时仍保持 0.02s；短距离移动的离散误差在 `PlayerController` 内通过 world-units 距离积分和过冲/剩余距离处理，不改变全局 runtime

**来源说明**：
- 移动逻辑源自逆向报告《深度逆向分析》第一章"操作手感复刻参数"
- 输入缓冲源自逆向报告《游戏运行时宏观规则》第三章"输入处理时序"
- 数值参数源自逆向报告《开发用数值真值表》

### 2.2 模块边界

本文档覆盖的模块：
- **PlayerController**：玩家状态机、移动逻辑、输入缓冲
- **CollisionSystem**：路径碰撞检测（接口已在 PM-02 定义，本文档补充细节）
- **CoordinateSystem**：坐标与单位转换常量，集中定义 `WORLD_UNITS_PER_TILE`、`RUN_SPEED_WORLD_UNITS_PER_SECOND` 和 tile/world/screen 换算

本文档不覆盖的模块（已在 PM-02 定义）：
- **InputManager**：输入采集和标准化
- **Renderer**：视觉渲染、相机和 world-to-screen 适配
- **GameLoop**：主循环和固定步长

### 2.2.1 坐标域定义

本轮修订采用三层坐标域，不再把玩家运动主口径写成单一 `tiles/s`：

| 坐标域 | 单位 | 负责人 | 用途 | 约束 |
|---|---|---|---|---|
| Tile 拓扑坐标 | 整数 tile index | `GridMap`、`CollisionSystem`、`StageLoader`、`PlayerController.gridX/gridZ` | 关卡 JSON、墙/尖刺/出口/收集物判定、路径扫描、事件触发权威状态 | 必须保持整数，不引入浮点碰撞 |
| World 运动坐标 | world units | `CoordinateSystem`、`PlayerController.worldX/worldZ` | 玩家连续位移、速度、移动距离、移动耗时、移动进度 | 主速度口径为 `5.0 world units/s` |
| Screen/Design 像素坐标 | CSS pixel / 1080x1920 design pixel | `Renderer`、`HUD`、`main.js` 点击换算 | Canvas 渲染、相机、HUD 布局、按钮点击 | 不参与玩法碰撞与速度判定 |

关键换算：

```javascript
const WORLD_UNITS_PER_TILE = 0.12;
const WORLD_UNITS_PER_HALF_TILE = 0.06;
const RUN_SPEED_WORLD_UNITS_PER_SECOND = 5.0;
const DERIVED_RUN_SPEED_TILES_PER_SECOND =
  RUN_SPEED_WORLD_UNITS_PER_SECOND / WORLD_UNITS_PER_TILE;

tileToWorldOrigin(tile) = tile * WORLD_UNITS_PER_TILE;
tileToWorldCenter(tile) = tileToWorldOrigin(tile) + WORLD_UNITS_PER_HALF_TILE;
tileToWorld(tile) = tileToWorldOrigin(tile); // 当前兼容别名，保持 origin 语义
worldToTile(world) = world / WORLD_UNITS_PER_TILE;
```

关卡 JSON 不切换到 world units。原因是当前 `tiles[][]`、`enter`、`exit`、路径扫描和收集物判定天然是离散 tile 拓扑；把关卡和碰撞改成浮点 world 坐标会扩大边界误差和返工范围。

本轮采用 C 方案：新增 center-point / TileHalfSize API，但暂不切换主坐标语义。`PlayerController.worldX/worldZ` 继续表示 tile origin 对应的 world 位置，`Renderer` 继续按该 origin 位置绘制玩家占位方块；`tileToWorldCenter()` 只作为后续更贴近 Unity center-point 空间定位时的显式 API。

### 2.2.2 Story 相机与 viewport 边界

Story/Lava 相机规则以逆向 `1.6` 节为准：

- 相机目标为玩家位置，跟随因子为 `clamp(deltaTime * 10, 0, 1)`。
- Story/Lava 不使用 Arcade/Boss 的二次曲线 `t² * 0.85 + 0.15`、X 轴对齐动画、Y 偏移或 Section 添加逻辑。
- `cameraLerpSpeed` 不是 Story/Lava 的全局 Lerp 速度；它只属于 Arcade/Boss 开局 `0 -> 1` 渐变参数。
- Story MVP 的 Renderer 不应把相机夹在地图边界内；地图边缘允许显示背景留白，以保持玩家在可视区域内稳定跟随。

该相机规则属于 Screen/Renderer 层，只影响画面构图、HUD 点击坐标和移动端 viewport 适配，不改变 Tile 拓扑碰撞、World 运动速度或 `PlayerController` 的状态机语义。

移动端实现时必须统一以下口径：

- canvas CSS 可视尺寸。
- canvas backing store 尺寸。
- Renderer viewport。
- HUD 渲染坐标。
- `main.js` 中 HUD 点击命中坐标。

### 2.3 状态机设计

**PlayerController 状态机**：
```
        ┌─────────┐
        │  Idle   │ ←──────────┐
        └─────────┘             │
             │                  │
             │ startMove()      │
             ↓                  │
        ┌─────────┐             │
        │ Moving  │ ────────────┘
        └─────────┘   到达目标
             │
             │ 到达 Spikes
             ↓
        ┌─────────┐
        │  Dead   │
        └─────────┘
```

**状态定义**：
- **Idle**：角色静止，等待输入
- **Moving**：角色正在移动，接受输入缓冲
- **Dead**：角色死亡，不接受输入

**状态转换条件**：
- Idle → Moving：接收到有效方向输入，且碰撞检测通过
- Moving → Idle：到达目标格子，且目标格子不是 Spikes 或 Exit
- Moving → Dead：到达目标格子，且目标格子是 Spikes
- Moving → (通关)：到达目标格子，且目标格子是 Exit

### 2.4 时序与执行顺序

**固定步长循环（50Hz，每 0.02s 执行一次）**：
```
update(dt) {
  1. 更新输入缓冲计时器（bufferTimer -= dt）
  2. 处理输入采样层已经产出的方向命令
}

fixedUpdate() {
  1. 根据当前状态执行逻辑：
     - Idle: handleIdleState()
       a. 检查输入缓冲，有则消费
       b. 无缓冲则从 InputManager 取新输入
       c. 有输入则调用 startMove()
     - Moving: handleMovingState()
       a. 检查 InputManager 是否有新输入
       b. 有新输入则存入缓冲，重置 bufferTimer
       c. 更新移动进度（moveProgress += speed / distance * 0.02）
       d. 如果 moveProgress >= 1.0，到达目标，切换到 Idle
       e. 检查目标格子的触发事件（Spikes / Exit）
}
```

**关键时序点**：
- 输入缓冲在 `handleMovingState` 中接收（存入 `bufferedDirection`）
- 输入缓冲在 `handleIdleState` 中消费（取出并执行）
- 输入缓冲计时器在每次 `update(dt)` 中递减，贴近原版 `DoUpdate` 语义
- 移动进度在 `handleMovingState` 中累加

### 2.5 数据结构

**PlayerController 核心字段**：
```javascript
class PlayerController {
  // 位置
  gridX: number;        // 当前已确认所在 tile X，碰撞与事件权威状态
  gridZ: number;        // 当前已确认所在 tile Z，碰撞与事件权威状态
  worldX: number;       // 当前连续 world X，用于运动和渲染
  worldZ: number;       // 当前连续 world Z，用于运动和渲染
  
  // 状态
  state: 'idle' | 'moving' | 'dead';
  runSpeedWorldUnitsPerSecond: 5.0; // world units/s，运动主口径
  
  // 移动
  moveDirection: 'up' | 'down' | 'left' | 'right' | null;
  moveProgress: number; // 0-1，派生显示/调试值
  targetGridX: number;  // 目标 tile X
  targetGridZ: number;  // 目标 tile Z
  targetWorldX: number; // 目标 world X
  targetWorldZ: number; // 目标 world Z
  moveDistanceTiles: number; // 本次移动的 tile 数
  moveDistanceWorld: number; // 本次移动的 world units 距离
  traveledWorld: number;     // 已推进 world units 距离
  
  // 输入缓冲
  bufferedDirection: 'up' | 'down' | 'left' | 'right' | null;
  bufferTimer: number;  // 缓冲剩余时间（秒）
  bufferDuration: 0.1; // 缓冲有效期（冻结值）
}
```

**CollisionSystem 返回值**：
```javascript
interface PathCheckResult {
  canMove: boolean;     // 是否可以移动
  targetX: number;      // 目标格子 X
  targetZ: number;      // 目标格子 Z
  path: Array<{x, z}>; // 路径上的所有格子（用于收集物）
}
```

### 2.6 关键算法

#### 2.6.1 World-units 移动进度计算

**公式**：
```
stepWorld = runSpeedWorldUnitsPerSecond * fixedDeltaTime
traveledWorld = min(moveDistanceWorld, traveledWorld + stepWorld)
moveProgress = traveledWorld / moveDistanceWorld
worldX = lerp(startWorldX, targetWorldX, moveProgress)
worldZ = lerp(startWorldZ, targetWorldZ, moveProgress)
```

**推导**：
- 原版源速度：`5.0 world units/s`
- 单格世界距离：`0.12 world units/tile`
- 移动距离：`N * 0.12 world units`
- 移动时间：`N * 0.12 / 5.0` 秒
- 派生穿格速度：`5.0 / 0.12 = 41.6667 tiles/s`

**示例**：
- 移动 1 格：距离 `0.12 world units`，理论耗时 `0.024s`
- 移动 2 格：距离 `0.24 world units`，理论耗时 `0.048s`
- 移动 5 格：距离 `0.60 world units`，理论耗时 `0.12s`

**验证**：
- 移动 1 格：1 / 41.6667 ≈ 0.024s ✓
- 移动 2 格：2 / 41.6667 ≈ 0.048s ✓
- 移动 5 格：5 / 41.6667 ≈ 0.12s ✓

#### 2.6.1.1 固定步长过冲处理

全局运行时仍使用 `fixedDeltaTime = 0.02s`。如果只在固定 tick 末尾判定到达，1 tile 理论 `0.024s` 的移动会被量化到约 `0.04s`，短距离体感偏慢。

本轮修订要求在 `PlayerController` 内处理该问题：

- 每个 fixed tick 仍只调用一次 `fixedUpdate(0.02)`。
- 在本次 tick 内按 world-units 距离推进。
- 若 `stepWorld` 超过当前移动剩余距离，则本次移动在 tick 内提前到达目标。
- 到达目标后立即执行收集/死亡/通关触发和输入缓冲消费判断。
- 如果仍有同一 tick 的剩余运动预算，且缓冲方向有效，可在同一 `fixedUpdate` 内继续推进下一段移动。
- 为避免极端情况下单 tick 内无限连锁，`PlayerController` 内部必须限制每个 fixed tick 的移动段处理次数，例如 `maxMoveSegmentsPerTick = 4`。

该方案不改变全局固定步长，不影响 `GameLoop` 的跨设备一致性；它只让高速度短距离移动不被 0.02s tick 粗粒度拖慢。

#### 2.6.2 输入缓冲逻辑

**存入缓冲**（在 `handleMovingState` 中）：
```javascript
const newDir = inputManager.consumeDirection();
if (newDir) {
  this.bufferedDirection = newDir;
  this.bufferTimer = this.bufferDuration;  // 重置为 0.1s
}
```

**消费缓冲**（在 `handleIdleState` 中）：
```javascript
let dir = this.bufferedDirection;
if (dir) {
  this.bufferedDirection = null;
  this.bufferTimer = 0;
} else {
  dir = inputManager.consumeDirection();
}
```

**更新缓冲计时器**（在 `update(dt)` 中）：
```javascript
if (this.bufferedDirection) {
  this.bufferTimer -= deltaTime;
  if (this.bufferTimer <= 0) {
    this.bufferedDirection = null;
  }
}
```

**关键点**：
- 缓冲只保留最后一次输入（新输入覆盖旧缓冲）
- 缓冲计时器每次渲染帧按 `deltaTime` 递减
- 缓冲过期时立即清空，不执行

#### 2.6.3 路径碰撞检测

**算法**（源自逆向报告《全机关行为矩阵》）：
```javascript
checkPath(startX, startZ, direction) {
  const {dx, dz} = directionToVector(direction);
  const path = [];
  let x = startX, z = startZ;
  
  while (true) {
    x += dx;
    z += dz;
    const tile = gridMap.getTile(x, z);
    
    // 优先级 1：墙壁 → 停在前一格
    if (tile === TileType.Wall) {
      return {
        canMove: path.length > 0,
        targetX: path.length > 0 ? path[path.length - 1].x : startX,
        targetZ: path.length > 0 ? path[path.length - 1].z : startZ,
        path: path
      };
    }
    
    // 优先级 2：尖刺 → 移动到尖刺格
    if (tile === TileType.Spikes) {
      path.push({x, z});
      return { canMove: true, targetX: x, targetZ: z, path };
    }
    
    // 优先级 3：出口 → 移动到出口格
    if (tile === TileType.Exit) {
      path.push({x, z});
      return { canMove: true, targetX: x, targetZ: z, path };
    }
    
    // Empty / Dot / Coin / Star → 继续
    path.push({x, z});
    
    if (path.length > 100) break;  // 防御性上限
  }
}
```

**碰撞优先级**（源自逆向报告）：
1. Wall / 边界 → Stop（最高优先级）
2. Spikes → Kill
3. Exit → 通关
4. Dot / Coin / Star → Collect，继续移动

### 2.7 边界条件

| 情况 | 处理方式 | 验证方法 |
|------|---------|---------|
| 起始位置前方就是墙 | `canMove: false`，角色不动 | 单元测试 |
| 移动距离为 0 | 不应发生（`canMove: false` 时不调用 `startMove`） | 断言检查 |
| 输入缓冲过期边界（恰好 0.1s） | `bufferTimer <= 0` 时清空 | 单元测试 |
| 移动进度恰好为 1.0 | `moveProgress >= 1.0` 触发到达 | 单元测试 |
| 移动中死亡 | 移动到尖刺格子，然后切换到 Dead 状态 | 集成测试 |
| 移动中通关 | 移动到出口格子，然后触发通关事件 | 集成测试 |
| 边界外 | `getTile` 返回 `TileType.Wall` | 单元测试 |

### 2.8 调试方案

**调试面板显示**（按 F1 开关）：
```
Player State: moving
Grid: (5, 12)
World: (0.600, 1.440)
Target Grid: (5, 15)
Target World: (0.600, 1.800)
Progress: 0.67
Buffer: up (0.01s)
Speed: 5.0 world units/s (41.7 tiles/s derived)
```

**调试快捷键**：
- F1：开关调试面板
- F4：开关无敌模式（触碰尖刺不死亡）
- F5：慢动作模式（移动速度 x0.5）
- F6：快动作模式（移动速度 x2.0）

**日志输出**：
```javascript
// 移动开始
console.log(`[Player] startMove(${direction}) → target(${targetX}, ${targetZ}), distance=${distance}`);

// 输入缓冲
console.log(`[Player] buffered ${direction}, timer=${bufferTimer.toFixed(3)}s`);

// 输入缓冲过期
console.log(`[Player] buffer expired`);

// 输入缓冲消费
console.log(`[Player] consumed buffer ${direction}`);

// 到达目标
console.log(`[Player] reached target(${gridX}, ${gridZ}), tile=${tile}`);
```

### 2.9 测试矩阵

#### 单元测试

| 测试用例 | 输入 | 预期输出 | 验证点 |
|---------|------|---------|--------|
| 移动 1 格 | 起点(0,0)，向右，前方 1 格是墙 | 目标(0,0)，canMove=false | 撞墙停止 |
| 移动 3 格 | 起点(0,0)，向右，前方 3 格是墙 | 目标(2,0)，path.length=2 | 停在墙前一格 |
| 移动到尖刺 | 起点(0,0)，向右，前方 2 格是尖刺 | 目标(1,0)，path 包含尖刺格 | 移动到尖刺格 |
| 移动到出口 | 起点(0,0)，向右，前方 3 格是出口 | 目标(2,0)，path 包含出口格 | 移动到出口格 |
| 输入缓冲有效 | 移动中输入，0.09s 后停下 | 缓冲被消费，立即执行 | 缓冲窗口内有效 |
| 输入缓冲过期 | 移动中输入，0.11s 后停下 | 缓冲被清空，不执行 | 缓冲窗口外过期 |
| 输入缓冲覆盖 | 移动中输入两次 | 只保留最后一次 | 新输入覆盖旧缓冲 |

#### 集成测试

| 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|
| 快速连击 | 向右滑动，0.15s 后向上滑动 | 角色先向右移动，停下后立即向上移动 |
| 连击过慢 | 向右滑动，0.25s 后向上滑动 | 角色向右移动，停下后不自动向上（需再次输入） |
| 撞墙停止 | 向墙壁方向滑动 | 角色停在墙前一格 |
| 触碰尖刺 | 向尖刺方向滑动 | 角色移动到尖刺格子，然后死亡 |
| 到达出口 | 向出口方向滑动 | 角色移动到出口格子，然后通关 |
| 收集物 | 向收集物方向滑动 | 角色移动到或经过收集物格子时，收集物随当前经过进度消失，角色继续移动 |

#### 手感测试

| 测试项 | 测试方法 | 验收标准 |
|--------|---------|---------|
| 输入延迟 | 用高速摄像机录制，测量触摸到角色开始移动的帧数 | <50ms（<3 帧 @ 60fps） |
| 输入缓冲 | 快速连续滑动 10 次，记录丢失次数 | 0 次丢失 |
| 跨设备一致性 | 在 3 台不同设备上测量移动 5 格的时间 | 误差 <5%（1.0s ± 0.05s） |
| 可预测性 | 让 5 名玩家预判停止位置，记录准确率 | >90% 准确 |

### 2.10 性能约束

**目标**：核心移动逻辑不应成为性能瓶颈

**性能指标**：
- `fixedUpdate` 执行时间 <1ms（在基线设备上）
- `checkPath` 执行时间 <0.5ms（最坏情况：100 格路径）

**优化策略**：
- 路径检测提前终止（遇到墙/尖刺/出口立即返回）
- 避免在 `fixedUpdate` 中分配新对象（复用 path 数组）
- 输入缓冲逻辑极简（只有 3 个字段）

### 2.11 风险与替代方案

| 风险 | 影响 | 替代方案 |
|------|------|---------|
| 输入缓冲窗口实现仍停留在 20ms | 连续滑动丢失，偏离逆向确认的 100ms 原版预输入手感 | 默认 `bufferDuration` 改为 0.1s，并按 `update(dt)` 递减 |
| 坐标域混用 | 速度、碰撞和渲染互相污染，后续再次误用 `tiles/s` 或 `_gameStageScale` | 统一通过 `CoordinateSystem` 转换；`PlayerController` 使用 world-units 主运动口径，`CollisionSystem` 只接收 tile 拓扑坐标 |
| 移动速度不合适 | 手感太快/太慢 | 以 `5.0 world units/s` 与 `0.12 world units/tile` 为当前逆向校正基线，`41.67 tiles/s` 仅作为派生显示；任何调整都需重新验证 ENG-04/ENG-05 联动边界 |
| Story 相机沿用地图边界 clamp | 玩家在关卡边缘贴近屏幕边缘，移动端 HUD 命中和滑动阈值体感被 viewport/camera 问题污染 | Story/Lava 相机改为 `clamp(dt * 10, 0, 1)` 跟随玩家，不做地图边界 clamp，允许背景留白 |
| 移动端 viewport 口径不统一 | canvas 显示、HUD 命中、Renderer viewport 与浏览器可视区域错位 | 统一 canvas CSS 尺寸、backing store、Renderer viewport、HUD 渲染和点击命中坐标 |
| 短距离移动被固定步长量化拖慢 | 1-2 格滑行体感偏慢，输入缓冲时序偏离原版 | 在 `PlayerController` 内进行 world-units 过冲/剩余距离处理，不改全局 fixed runtime |
| 固定步长累加器卡顿 | 帧率过低时游戏卡死 | 限制累加器最大执行次数（已在 PM-02 实现） |
| 路径检测性能不足 | 长路径导致卡顿 | 限制路径长度上限为 50 格 |

---

## 变更日志

| 日期 | 变更类型 | 变更内容 | 影响范围 | 审批状态 |
|------|---------|---------|---------|---------|
| 2026-04-16 | INIT | 创建初稿 | 全文档 | — |
| 2026-04-28 | BASELINE | 修正移动速度单位：源速度为 `5.0 world units/s`，单格尺寸为 `0.12 world units/tile`，当前 tile-grid 等效速度约 `41.67 tiles/s`；撤回 `_runSpeed × _gameStageScale = 8.0 tiles/s` 作为玩家位移速度的结论 | 移动手感、代码默认速度、ENG-04/ENG-05 联合验收 | 已批准执行 |
| 2026-04-29 | DESIGN | 将最小派生速度修正升级为三层坐标域方案：Tile 拓扑坐标保留给关卡/碰撞/事件，World 运动坐标作为玩家连续位移与速度主口径，Screen/Design 像素坐标只用于渲染和 HUD；同时要求 `PlayerController` 内处理固定步长过冲 | `CoordinateSystem`、`PlayerController`、`Renderer`、调试显示、ENG-04/ENG-05 回归 | 已批准步骤 1-4 文档更新 |
| 2026-04-30 | BASELINE | 修正输入缓冲窗口为 `0.1s/100ms`，并明确缓冲倒计时应在 `update(dt)` 路径中递减；空间定位采用 C 方案，只新增 `TileHalfSize` / center API，暂不切换 `worldX/worldZ` 的 origin 主语义 | ENG-04 文档、PM-02 文档、ENG-03 输入文档、`CoordinateSystem`、`PlayerController`、真实浏览器回归 | 已批准批次 1-3 文档更新 |
| 2026-05-01 | CODE | 已按 C 方案完成代码批次：`CoordinateSystem` 新增 half-tile/center API 且保留 `tileToWorld()` origin 语义；`PlayerController` 默认 `bufferDuration = 0.1`，缓冲倒计时走 `update(deltaTime)`；`fixedUpdate()` 继续负责玩家位移；模块缓存 query 更新为 `eng04_input_buffer_v1` | `CoordinateSystem`、`PlayerController`、`main.js`、`index.html`、浏览器缓存版本 | 已批准并完成 |
| 2026-05-01 | VALIDATION | 自动校验和真实浏览器回归均已通过：`story_001` 主链路、快速连续滑动与 AHK 边界测试、`eng04_death_validation`、弹窗输入屏蔽、点击/缩放和缓存版本确认均为 `PASS`；两个入口均加载 `eng04_input_buffer_v1` | ENG-04/ENG-05 联合验收、输入缓冲边界、死亡/通关时序、HUD 同步、点击缩放 | 已验收通过 |
| 2026-05-02 | BASELINE | 补充 Story/Lava 相机基线：相机按 `clamp(dt * 10, 0, 1)` 跟随玩家，不使用地图边界 clamp；`cameraLerpSpeed` 仅属于 Arcade/Boss 渐变；移动端 viewport/canvas/HUD/Renderer 口径需统一 | Renderer、Camera、Screen/Design 坐标、OPS-01 Android 阻断 | 已批准本批文档更新 |

---

## 附录：参考文档

- PM-02 核心运行时设计文档
- 逆向报告《深度逆向分析》第一章"操作手感复刻参数"
- 逆向报告《游戏运行时宏观规则》第三章"输入处理时序"
- 逆向报告《开发用数值真值表》
- 逆向报告《全机关行为矩阵》第九章"碰撞优先级"
