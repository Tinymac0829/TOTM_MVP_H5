# ENG-04 核心移动手感设计文档

**文档类型**：L3 设计文档（策划案 + 技术方案）  
**任务 ID**：ENG-04  
**创建日期**：2026-04-16  
**最后更新**：2026-04-16  
**状态**：初稿  
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
4. **容错性**：输入缓冲机制给玩家 20ms 的容错窗口，降低操作难度

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
- 缓冲有效期：0.02 秒（20ms）
- 角色停下后，如果缓冲仍有效，立即执行缓冲的方向
- 如果缓冲过期（超过 20ms），清空缓冲

**时序示例**：
```
t=0.00s: 玩家向右滑动 → 角色开始向右移动
t=0.15s: 玩家向上滑动（角色仍在移动中）→ 方向存入缓冲，bufferTimer = 0.02s
t=0.16s: bufferTimer = 0.01s（递减中）
t=0.17s: bufferTimer = 0.00s（过期）→ 缓冲清空
t=0.20s: 角色停下 → 检查缓冲，发现已过期，不执行

正确时序：
t=0.00s: 玩家向右滑动 → 角色开始向右移动
t=0.18s: 玩家向上滑动 → 方向存入缓冲，bufferTimer = 0.02s
t=0.19s: bufferTimer = 0.01s
t=0.20s: 角色停下 → 检查缓冲，仍有效（0.01s 剩余）→ 立即向上移动
```

#### 碰撞规则（MVP 子集）
- **Wall**：阻挡，角色停在墙前一格
- **Spikes**：角色移动到尖刺格子，然后死亡
- **Exit**：角色移动到出口格子，然后通关
- **Dot / Coin / Star**：收集，继续移动

#### 移动速度规则
- 基础速度：`_runSpeed = 5.0` 格/秒（源自逆向报告 `GameplayConstants._playerSpeed`，运行时不变）
- 舞台缩放：`_gameStageScale = 1.6`（源自 `_referenceGameplaySize`，运行时参与移动公式）
- 实际移动速度：`5.0 × 1.6 = 8.0` 格/秒
- 移动时间 = 移动距离 / 实际移动速度
- 例如：移动 3 格需要 0.375 秒

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
| 玩家基础速度 `_runSpeed` | 5.0 | 格/秒 | 🟢 | GameplayConstants._playerSpeed / PlayerController._runSpeed |
| 舞台缩放 `_gameStageScale` | 1.6 | 倍率 | 🟢 | GameplayController._gameStageScale / _referenceGameplaySize |
| 玩家实际移动速度 | 8.0 | 格/秒 | 🟢 | `_runSpeed × _gameStageScale` |
| 输入缓冲窗口 | 0.02 | 秒 | 🟢 | ProcessSwipe._nextSwipeTimeout |
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
- [ ] 移动中滑动，停下超过 20ms 后缓冲失效，不执行
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
- 必须支持输入缓冲机制，缓冲窗口 0.02s
- 实际移动速度必须为 8.0 格/秒；其中 `_runSpeed = 5.0` 为 base 值，`_gameStageScale = 1.6` 为固定乘数

**来源说明**：
- 移动逻辑源自逆向报告《深度逆向分析》第一章"操作手感复刻参数"
- 输入缓冲源自逆向报告《游戏运行时宏观规则》第三章"输入处理时序"
- 数值参数源自逆向报告《开发用数值真值表》

### 2.2 模块边界

本文档覆盖的模块：
- **PlayerController**：玩家状态机、移动逻辑、输入缓冲
- **CollisionSystem**：路径碰撞检测（接口已在 PM-02 定义，本文档补充细节）

本文档不覆盖的模块（已在 PM-02 定义）：
- **InputManager**：输入采集和标准化
- **Renderer**：视觉渲染和插值
- **GameLoop**：主循环和固定步长

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
fixedUpdate() {
  1. 更新输入缓冲计时器（bufferTimer -= 0.02）
  2. 根据当前状态执行逻辑：
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
- 输入缓冲计时器在每次 `fixedUpdate` 开始时递减
- 移动进度在 `handleMovingState` 中累加

### 2.5 数据结构

**PlayerController 核心字段**：
```javascript
class PlayerController {
  // 位置
  gridX: number;        // 当前格子 X 坐标
  gridZ: number;        // 当前格子 Z 坐标
  visualX: number;      // 渲染位置 X（用于插值）
  visualZ: number;      // 渲染位置 Z（用于插值）
  
  // 状态
  state: 'idle' | 'moving' | 'dead';
  moveSpeed: 8.0;       // 格/秒（_runSpeed 5.0 × _gameStageScale 1.6）
  
  // 移动
  moveDirection: 'up' | 'down' | 'left' | 'right' | null;
  moveProgress: number; // 0-1，当前移动进度
  moveTargetX: number;  // 目标格子 X
  moveTargetZ: number;  // 目标格子 Z
  moveDistance: number; // 本次移动的格数
  
  // 输入缓冲
  bufferedDirection: 'up' | 'down' | 'left' | 'right' | null;
  bufferTimer: number;  // 缓冲剩余时间（秒）
  bufferDuration: 0.02; // 缓冲有效期（冻结值）
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

#### 2.6.1 移动进度计算

**公式**：
```
moveProgress += (moveSpeed / moveDistance) * fixedDeltaTime
```

**推导**：
- 实际移动速度：8.0 格/秒
- 移动距离：N 格
- 移动时间：N / 8.0 秒
- 每个固定步长（0.02s）的进度增量：0.02 / (N / 8.0) = 0.16 / N

**示例**：
- 移动 1 格：moveProgress += 0.16，需要约 7 个固定步长（0.125s，固定步长离散后约 0.14s 到达）
- 移动 2 格：moveProgress += 0.08，需要约 13 个固定步长（0.25s，固定步长离散后约 0.26s 到达）
- 移动 5 格：moveProgress += 0.032，需要约 32 个固定步长（0.625s，固定步长离散后约 0.64s 到达）

**验证**：
- 移动 1 格：1 / 8.0 = 0.125s ✓
- 移动 2 格：2 / 8.0 = 0.25s ✓
- 移动 5 格：5 / 8.0 = 0.625s ✓

#### 2.6.2 输入缓冲逻辑

**存入缓冲**（在 `handleMovingState` 中）：
```javascript
const newDir = inputManager.consumeDirection();
if (newDir) {
  this.bufferedDirection = newDir;
  this.bufferTimer = this.bufferDuration;  // 重置为 0.02s
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

**更新缓冲计时器**（在 `fixedUpdate` 开始时）：
```javascript
if (this.bufferedDirection) {
  this.bufferTimer -= 0.02;
  if (this.bufferTimer <= 0) {
    this.bufferedDirection = null;
  }
}
```

**关键点**：
- 缓冲只保留最后一次输入（新输入覆盖旧缓冲）
- 缓冲计时器每次固定步长递减 0.02s
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
| 输入缓冲过期边界（恰好 0.02s） | `bufferTimer <= 0` 时清空 | 单元测试 |
| 移动进度恰好为 1.0 | `moveProgress >= 1.0` 触发到达 | 单元测试 |
| 移动中死亡 | 移动到尖刺格子，然后切换到 Dead 状态 | 集成测试 |
| 移动中通关 | 移动到出口格子，然后触发通关事件 | 集成测试 |
| 边界外 | `getTile` 返回 `TileType.Wall` | 单元测试 |

### 2.8 调试方案

**调试面板显示**（按 F1 开关）：
```
Player State: moving
Position: (5, 12)
Target: (5, 15)
Progress: 0.67
Buffer: up (0.01s)
Speed: 8.0 tiles/s
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
| 输入缓冲有效 | 移动中输入，0.01s 后停下 | 缓冲被消费，立即执行 | 缓冲窗口内有效 |
| 输入缓冲过期 | 移动中输入，0.03s 后停下 | 缓冲被清空，不执行 | 缓冲窗口外过期 |
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
| 输入缓冲窗口太短 | 连续滑动丢失 | 增加到 50ms（需重新验证手感） |
| 移动速度不合适 | 手感太快/太慢 | 以 `8.0 tiles/s` 为当前逆向校正基线，任何调整都需重新验证 ENG-04/ENG-05 联动边界 |
| 固定步长累加器卡顿 | 帧率过低时游戏卡死 | 限制累加器最大执行次数（已在 PM-02 实现） |
| 路径检测性能不足 | 长路径导致卡顿 | 限制路径长度上限为 50 格 |

---

## 变更日志

| 日期 | 变更类型 | 变更内容 | 影响范围 | 审批状态 |
|------|---------|---------|---------|---------|
| 2026-04-16 | INIT | 创建初稿 | 全文档 | — |

---

## 附录：参考文档

- PM-02 核心运行时设计文档
- 逆向报告《深度逆向分析》第一章"操作手感复刻参数"
- 逆向报告《游戏运行时宏观规则》第三章"输入处理时序"
- 逆向报告《开发用数值真值表》
- 逆向报告《全机关行为矩阵》第九章"碰撞优先级"
