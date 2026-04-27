# PM-02 核心运行时设计文档

**文档类型**：L3 设计文档（策划案 + 技术方案）  
**任务 ID**：PM-02  
**创建日期**：2026-04-16  
**最后更新**：2026-04-16  
**状态**：初稿  
**来源**：基于逆向报告中冻结的原版 Tomb of the Mask v1.25.0 运行时规则

---

## 第一部分：策划案

### 1.1 玩家体验目标

**核心体验**：流畅的网格滑行 + 精准的输入响应 + 稳定的跨设备手感

**体验支柱**：
1. **即时响应**：从手指触摸到角色开始移动，延迟 <50ms
2. **输入不丢失**：快速连续滑动时，第二次滑动不会被吞掉（输入缓冲机制）
3. **手感一致性**：在不同设备、不同帧率下，移动速度和碰撞判定保持一致
4. **可预测性**：玩家能准确预判角色会在哪里停下，不会出现"滑过头"或"提前停"

### 1.2 玩法规则

#### 移动规则
- 玩家通过滑动屏幕（或按键盘方向键）控制角色
- 支持四个方向：上、下、左、右（无对角线）
- 一次滑动触发一次移动，角色沿该方向直线滑行，直到：
  - 撞到墙壁
  - 撞到阻挡物（如冰块、移动平台）
  - 触发机关（如传送门、弹簧）
  - 死亡（如撞到尖刺）

#### 输入缓冲规则
- 玩家在角色移动中滑动时，方向被缓存
- 缓冲有效期：0.02 秒（20ms）
- 角色停下后，如果缓冲仍有效，立即执行缓冲的方向
- 这是"跟手感"的关键机制

#### 碰撞规则（基础子集）
MVP 阶段支持的瓦片类型：
- **Empty**：空地，可通过
- **Wall**：墙壁，阻挡，角色停在墙前一格
- **Enter**：入口，标记玩家出生点
- **Exit**：出口，触发通关
- **Dot**：圆点，收集后消失，不阻挡移动
- **Coin**：金币，收集后消失，不阻挡移动
- **Star**：星星，收集后消失，不阻挡移动（每关最多 3 个）
- **Spikes**：尖刺，触碰死亡

碰撞优先级（从高到低）：
1. Wall / 边界 → 停止
2. Spikes → 死亡
3. Exit → 通关
4. Dot / Coin / Star → 收集，继续移动

### 1.3 反馈表现

#### 视觉反馈
- 角色移动：平滑的 Tween 动画，从当前格移动到目标格
- 撞墙：角色停在墙前一格，无"撞击回弹"效果
- 收集物：收集时播放简单的缩放 + 淡出动画
- 死亡：角色消失，播放简单的爆炸效果

#### 音效反馈（占位期）
- 滑动：短促的"嗖"声
- 撞墙：低沉的"咚"声
- 收集圆点/金币：清脆的"叮"声
- 死亡：短促的"啊"声

#### 触觉反馈（可选）
- 撞墙：轻微震动
- 死亡：中等震动

### 1.4 数值基线

**来源**：逆向报告中提取的原版数值，100% 精准

| 参数 | 值 | 单位 | 说明 |
|------|-----|------|------|
| 玩家基础速度 `_runSpeed` | 5.0 | 格/秒 | 逆向 base 值，不直接作为最终实际速度 |
| 舞台缩放 `_gameStageScale` | 1.6 | 倍率 | 源自 `_referenceGameplaySize`，参与移动速度计算 |
| 玩家实际移动速度 | 8.0 | 格/秒 | `5.0 × 1.6`，核心手感参数 |
| 输入缓冲窗口 | 0.02 | 秒 | 20ms |
| 滑动识别阈值 | 0.3 | 归一化距离 | 触摸滑动超过此距离才算有效 |
| 瓦片逻辑尺寸 | 1.0 | 单位 | 网格中每格的逻辑尺寸 |
| 固定步长 | 0.02 | 秒 | 50Hz，保证跨设备手感一致 |

### 1.5 失败与成功条件

#### 失败条件
- 角色触碰到 Spikes 瓦片
- （后续扩展：被 Lava 追上、被移动障碍物击中）

#### 成功条件
- 角色到达 Exit 瓦片

#### 重开规则
- 失败后 2 秒内可重开
- MVP 阶段重开不消耗体力
- 重开后从 Enter 位置重新开始
- 已收集的物品重置

### 1.6 验收标准（策划层）

- [ ] 玩家能通过滑动/键盘控制角色四向移动
- [ ] 角色移动到墙前停下，不会"穿墙"或"滑过头"
- [ ] 快速连续滑动时，第二次滑动不会被吞掉
- [ ] 收集圆点/金币/星星时，物品消失且计数增加
- [ ] 触碰尖刺时，角色死亡并显示失败界面
- [ ] 到达出口时，显示通关界面
- [ ] 失败后能在 2 秒内重开
- [ ] 在不同设备上，移动速度和手感保持一致

---

## 第二部分：技术方案

### 2.1 背景

本文档定义 TOTM MVP H5 版本的核心运行时架构。技术栈为单 HTML + Canvas2D + 纯 JavaScript，不依赖外部框架。

**设计约束**：
- 目标平台：安卓浏览器，1080x1920 竖屏
- 性能目标：中端安卓设备 ≥55 FPS
- 手感一致性：通过固定步长循环保证跨设备一致

**来源说明**：
- 运行时模型源自逆向报告《游戏运行时宏观规则》
- 数值参数源自逆向报告《开发用数值真值表》
- 碰撞规则源自逆向报告《全机关行为矩阵》

### 2.2 架构概览

```
index.html
  └─ main.js (入口)
       ├─ GameLoop (主循环)
       │    ├─ fixedUpdate(0.02s) → 玩法逻辑
       │    └─ update(dt) → 渲染、相机、计时器
       ├─ InputManager (输入管理)
       │    ├─ TouchInput (触屏滑动)
       │    └─ KeyboardInput (键盘方向键)
       ├─ GridMap (网格地图)
       │    ├─ tiles[][] (二维瓦片数组)
       │    └─ metadata (关卡元数据)
       ├─ PlayerController (玩家控制)
       │    ├─ position (当前格子坐标)
       │    ├─ moveDirection (移动方向)
       │    └─ inputBuffer (输入缓冲)
       ├─ CollisionSystem (碰撞检测)
       │    └─ checkPath() (路径碰撞检测)
       ├─ Renderer (渲染器)
       │    └─ Canvas2D 绘制
       ├─ HUD (界面)
       │    ├─ 分数/金币/星星显示
       │    └─ 失败/通关弹窗
       └─ StageLoader (关卡加载)
            └─ loadStage(id) (加载 JSON 关卡数据)
```

### 2.3 核心模块设计

#### 2.3.1 GameLoop（主循环）

**职责**：驱动整个游戏的时间流

**双循环模型**（源自逆向报告）：
```javascript
class GameLoop {
  constructor() {
    this.fixedDeltaTime = 0.02;  // 50Hz 固定步长
    this.accumulator = 0;
    this.lastTime = 0;
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.tick.bind(this));
  }

  tick(currentTime) {
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // 固定步长累加器
    this.accumulator += dt;
    while (this.accumulator >= this.fixedDeltaTime) {
      this.fixedUpdate();  // 玩法逻辑
      this.accumulator -= this.fixedDeltaTime;
    }
    
    // 可变步长更新
    this.update(dt);  // 渲染、相机、计时器
    
    requestAnimationFrame(this.tick.bind(this));
  }

  fixedUpdate() {
    // 玩家移动、碰撞检测、输入缓冲
    inputManager.update();
    playerController.fixedUpdate();
    collisionSystem.update();
  }

  update(dt) {
    // 渲染、相机跟随、计时器
    renderer.render(dt);
    hud.update(dt);
  }
}
```

**关键点**：
- 固定步长（0.02s）负责玩法逻辑，保证跨设备一致性
- 可变步长（dt）负责渲染和视觉效果，适应不同帧率
- 累加器模式避免"螺旋死亡"（帧率过低时不会无限累积）

#### 2.3.2 GridMap（网格地图）

**职责**：存储和查询关卡数据

**数据结构**：
```javascript
class GridMap {
  constructor(stageData) {
    this.width = stageData.width;
    this.height = stageData.height;
    this.tiles = stageData.tiles;  // 二维数组 [z][x]
    this.enter = stageData.enter;  // {x, z}
    this.exit = stageData.exit;    // {x, z}
  }

  getTile(x, z) {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return TileType.Wall;  // 边界视为墙
    }
    return this.tiles[z][x];
  }

  setTile(x, z, type) {
    if (x >= 0 && x < this.width && z >= 0 && z < this.height) {
      this.tiles[z][x] = type;
    }
  }
}
```

**关卡数据格式**（JSON）：
```json
{
  "id": "story_001",
  "width": 13,
  "height": 20,
  "enter": {"x": 6, "z": 0},
  "exit": {"x": 6, "z": 19},
  "tiles": [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1],
    ...
  ]
}
```

**瓦片类型枚举**：
```javascript
const TileType = {
  Empty: 0,
  Wall: 1,
  Enter: 2,
  Exit: 3,
  Dot: 4,
  Coin: 5,
  Star: 6,
  Spikes: 7
};
```

#### 2.3.3 InputManager（输入管理）

**职责**：统一处理触屏和键盘输入，输出标准化的方向命令

**接口**：
```javascript
class InputManager {
  constructor() {
    this.touchInput = new TouchInput();
    this.keyboardInput = new KeyboardInput();
    this.currentDirection = null;  // 'up' | 'down' | 'left' | 'right' | null
  }

  update() {
    // 优先处理触屏输入
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
}
```

**TouchInput（触屏滑动）**：
```javascript
class TouchInput {
  constructor() {
    this.touchStart = null;
    this.swipeThreshold = 0.3;  // 归一化距离阈值（源自逆向）
    
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.touchStart = {
      x: touch.clientX / canvas.width,
      y: touch.clientY / canvas.height,
      time: performance.now()
    };
  }

  onTouchMove(e) {
    e.preventDefault();
    if (!this.touchStart) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX / canvas.width - this.touchStart.x;
    const dy = touch.clientY / canvas.height - this.touchStart.y;
    
    // 判断滑动方向
    if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.detectedDirection = dx > 0 ? 'right' : 'left';
      } else {
        this.detectedDirection = dy > 0 ? 'down' : 'up';
      }
      this.touchStart = null;  // 消费掉这次触摸
    }
  }

  getDirection() {
    const dir = this.detectedDirection;
    this.detectedDirection = null;
    return dir;
  }
}
```

**KeyboardInput（键盘方向键）**：
```javascript
class KeyboardInput {
  constructor() {
    this.keys = {};
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }

  getDirection() {
    if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
      return 'up';
    }
    if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
      return 'down';
    }
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
      return 'left';
    }
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
      return 'right';
    }
    return null;
  }
}
```

#### 2.3.4 PlayerController（玩家控制）

**职责**：管理玩家状态、移动逻辑、输入缓冲

**状态机**：
```
Idle → Moving → Idle
  ↓
Dead
```

**核心字段**：
```javascript
class PlayerController {
  constructor() {
    // 位置
    this.gridX = 0;
    this.gridZ = 0;
    this.visualX = 0;  // 渲染位置（用于 Tween）
    this.visualZ = 0;
    
    // 状态
    this.state = 'idle';  // 'idle' | 'moving' | 'dead'
    this.moveSpeed = 8.0;  // 格/秒（_runSpeed 5.0 × _gameStageScale 1.6）
    
    // 移动
    this.moveDirection = null;
    this.moveProgress = 0;  // 0-1，当前移动进度
    this.moveTargetX = 0;
    this.moveTargetZ = 0;
    this.moveDistance = 0;  // 本次移动的格数
    
    // 输入缓冲
    this.bufferedDirection = null;
    this.bufferTimer = 0;
    this.bufferDuration = 0.02;  // 20ms（源自逆向报告 ProcessSwipe._nextSwipeTimeout）
  }

  fixedUpdate() {
    if (this.state === 'dead') return;
    
    // 更新输入缓冲计时器
    if (this.bufferedDirection) {
      this.bufferTimer -= 0.02;
      if (this.bufferTimer <= 0) {
        this.bufferedDirection = null;
      }
    }
    
    if (this.state === 'idle') {
      this.handleIdleState();
    } else if (this.state === 'moving') {
      this.handleMovingState();
    }
  }

  handleIdleState() {
    // 优先从输入缓冲中取方向
    let dir = this.bufferedDirection;
    if (dir) {
      this.bufferedDirection = null;
      this.bufferTimer = 0;
    } else {
      dir = inputManager.consumeDirection();
    }
    
    if (dir) {
      this.startMove(dir);
    }
  }

  handleMovingState() {
    // 检查是否有新输入（存入缓冲）
    const newDir = inputManager.consumeDirection();
    if (newDir) {
      this.bufferedDirection = newDir;
      this.bufferTimer = this.bufferDuration;
    }
    
    // 更新移动进度（固定步长 0.02s）
    this.moveProgress += (this.moveSpeed / this.moveDistance) * 0.02;
    
    if (this.moveProgress >= 1.0) {
      this.gridX = this.moveTargetX;
      this.gridZ = this.moveTargetZ;
      this.moveProgress = 0;
      this.state = 'idle';
      
      this.checkTileEvent();
    }
  }

  startMove(direction) {
    const result = collisionSystem.checkPath(
      this.gridX, this.gridZ, direction
    );
    
    if (result.canMove) {
      this.moveDirection = direction;
      this.moveTargetX = result.targetX;
      this.moveTargetZ = result.targetZ;
      this.moveDistance = Math.abs(result.targetX - this.gridX)
                       + Math.abs(result.targetZ - this.gridZ);
      this.moveProgress = 0;
      this.state = 'moving';
      
      this.collectItemsOnPath(result.path);
    }
  }

  collectItemsOnPath(path) {
    for (const {x, z} of path) {
      const tile = gridMap.getTile(x, z);
      if (tile === TileType.Dot || tile === TileType.Coin || tile === TileType.Star) {
        gridMap.setTile(x, z, TileType.Empty);
        hud.addCollectible(tile);
      }
    }
  }

  checkTileEvent() {
    const tile = gridMap.getTile(this.gridX, this.gridZ);
    if (tile === TileType.Spikes) {
      this.die();
    } else if (tile === TileType.Exit) {
      gameState.onStageComplete();
    }
  }

  die() {
    this.state = 'dead';
    gameState.onPlayerDead();
  }

  reset(x, z) {
    this.gridX = x;
    this.gridZ = z;
    this.visualX = x;
    this.visualZ = z;
    this.state = 'idle';
    this.moveDirection = null;
    this.bufferedDirection = null;
    this.bufferTimer = 0;
  }
}
```

**关键点**：
- 移动进度按 `moveSpeed / moveDistance * fixedDt` 累加，距离越远移动时间越长，速度恒定；MVP 中 `moveSpeed` 指等效实际速度 `8.0 tiles/s`
- 输入缓冲在 `handleMovingState` 中接收新输入，在 `handleIdleState` 中消费
- 收集物在 `startMove` 时立即处理（路径碰撞），不等到到达目标格子

#### 2.3.5 CollisionSystem（碰撞检测）

**职责**：路径碰撞检测，返回移动终点和路径

**核心方法**：
```javascript
class CollisionSystem {
  checkPath(startX, startZ, direction) {
    const dirMap = {
      'up':    {dx: 0, dz: -1},
      'down':  {dx: 0, dz: 1},
      'left':  {dx: -1, dz: 0},
      'right': {dx: 1, dz: 0}
    };
    
    const {dx, dz} = dirMap[direction];
    const path = [];
    let x = startX;
    let z = startZ;
    
    while (true) {
      const nextX = x + dx;
      const nextZ = z + dz;
      const tile = gridMap.getTile(nextX, nextZ);
      
      // 优先级 1：墙壁/边界 → 停在当前格
      if (tile === TileType.Wall) {
        return {
          canMove: path.length > 0,
          targetX: path.length > 0 ? path[path.length - 1].x : startX,
          targetZ: path.length > 0 ? path[path.length - 1].z : startZ,
          path: path
        };
      }
      
      // 优先级 2：尖刺 → 移动到尖刺格（然后死亡）
      if (tile === TileType.Spikes) {
        path.push({x: nextX, z: nextZ});
        return {
          canMove: true,
          targetX: nextX,
          targetZ: nextZ,
          path: path
        };
      }
      
      // 优先级 3：出口 → 移动到出口格（然后通关）
      if (tile === TileType.Exit) {
        path.push({x: nextX, z: nextZ});
        return {
          canMove: true,
          targetX: nextX,
          targetZ: nextZ,
          path: path
        };
      }
      
      // Empty / Dot / Coin / Star → 继续移动
      path.push({x: nextX, z: nextZ});
      x = nextX;
      z = nextZ;
      
      // 防御性上限
      if (path.length > 100) break;
    }
    
    return { canMove: false, targetX: startX, targetZ: startZ, path: [] };
  }
}
```

**碰撞优先级**（源自逆向报告《全机关行为矩阵》第九章）：
1. Wall / 边界 → Stop（最高优先级，停在前一格）
2. Spikes → Kill（移动到尖刺格子，然后死亡）
3. Exit → 通关（移动到出口格子，然后触发通关）
4. Dot / Coin / Star → Collect（收集，继续移动）

**边界情况**：
- 起始位置前方就是墙 → `canMove: false`，角色不动
- 路径长度超过 100 格 → 强制停止（防御性编程）
- 边界外 → `getTile` 返回 `TileType.Wall`，等同于墙

#### 2.3.6 Renderer（渲染器）

**职责**：Canvas2D 绘制，视觉占位方案

**渲染流程**：
```javascript
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileSize = 60;  // 像素，1080 / 18 ≈ 60
    this.cameraOffsetZ = 0;
  }

  render(dt) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.updateCamera(dt);
    this.renderMap();
    this.renderPlayer(dt);
  }

  updateCamera(dt) {
    const targetOffsetZ = playerController.gridZ * this.tileSize
                        - this.canvas.height / 2;
    const lerpSpeed = 0.6;  // 源自逆向报告 cameraLerpSpeed
    this.cameraOffsetZ += (targetOffsetZ - this.cameraOffsetZ)
                        * lerpSpeed * dt * 60;
  }

  renderMap() {
    const startZ = Math.floor(this.cameraOffsetZ / this.tileSize) - 1;
    const endZ = startZ + Math.ceil(this.canvas.height / this.tileSize) + 2;
    
    for (let z = startZ; z <= endZ; z++) {
      for (let x = 0; x < gridMap.width; x++) {
        this.renderTile(x, z, gridMap.getTile(x, z));
      }
    }
  }

  renderTile(x, z, tile) {
    const screenX = x * this.tileSize;
    const screenZ = z * this.tileSize - this.cameraOffsetZ;
    
    const colors = {
      [TileType.Empty]:  '#1a1a1a',
      [TileType.Wall]:   '#4a4a4a',
      [TileType.Enter]:  '#00cc44',
      [TileType.Exit]:   '#0088ff',
      [TileType.Dot]:    '#ffffff',
      [TileType.Coin]:   '#ffcc00',
      [TileType.Star]:   '#ffff00',
      [TileType.Spikes]: '#cc0000'
    };
    
    this.ctx.fillStyle = colors[tile] || '#000000';
    this.ctx.fillRect(screenX, screenZ, this.tileSize, this.tileSize);
  }

  renderPlayer(dt) {
    if (playerController.state === 'moving') {
      const t = playerController.moveProgress;
      playerController.visualX = lerp(
        playerController.gridX, playerController.moveTargetX, t
      );
      playerController.visualZ = lerp(
        playerController.gridZ, playerController.moveTargetZ, t
      );
    } else {
      playerController.visualX = playerController.gridX;
      playerController.visualZ = playerController.gridZ;
    }
    
    const screenX = playerController.visualX * this.tileSize;
    const screenZ = playerController.visualZ * this.tileSize - this.cameraOffsetZ;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(
      screenX + this.tileSize * 0.1,
      screenZ + this.tileSize * 0.1,
      this.tileSize * 0.8,
      this.tileSize * 0.8
    );
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
```

**视觉规格（占位期）**：

| 元素 | 颜色 | 说明 |
|------|------|------|
| 地面 | #1a1a1a | 深灰 |
| 墙壁 | #4a4a4a | 中灰 |
| 入口 | #00cc44 | 绿色 |
| 出口 | #0088ff | 蓝色 |
| 圆点 | #ffffff | 白色 |
| 金币 | #ffcc00 | 金色 |
| 星星 | #ffff00 | 黄色 |
| 尖刺 | #cc0000 | 红色 |
| 玩家 | #ffffff | 白色方块，占瓦片 80% |

**瓦片尺寸**：60px（1080 / 18 ≈ 60，竖屏下约 18 列可见宽度）

**相机跟随**：平滑插值 lerpSpeed = 0.6（源自逆向报告），玩家保持在屏幕中央偏下

#### 2.3.7 HUD（界面）

**职责**：显示游戏状态、弹窗

**布局**（1080x1920 竖屏）：
```
┌─────────────────────────────────┐
│  ★ 0/3    🪙 0    ⚫ 0/50       │  ← 顶部信息栏（高度 80px）
│                                 │
│         (游戏区域)               │
│                                 │
│                    ⏸            │  ← 右下暂停按钮
└─────────────────────────────────┘
```

**核心字段**：
```javascript
class HUD {
  constructor() {
    this.stars = 0;
    this.coins = 0;
    this.dots = 0;
    this.dotsTotal = 0;
    this.showingPopup = false;
    this.popupType = null;  // 'fail' | 'complete'
  }

  render(ctx) {
    // 顶部信息栏
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 1080, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.fillText(`★ ${this.stars}/3`, 20, 50);
    ctx.fillText(`🪙 ${this.coins}`, 300, 50);
    ctx.fillText(`⚫ ${this.dots}/${this.dotsTotal}`, 580, 50);
    
    if (this.showingPopup) this.renderPopup(ctx);
  }

  renderPopup(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(140, 600, 800, 600);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    
    if (this.popupType === 'fail') {
      ctx.fillText('失败', 480, 750);
      ctx.font = '32px Arial';
      ctx.fillText('[重新开始]', 420, 1000);
    } else if (this.popupType === 'complete') {
      ctx.fillText('通关！', 460, 750);
      ctx.font = '32px Arial';
      ctx.fillText(`★ ${this.stars}/3  🪙 ${this.coins}  ⚫ ${this.dots}/${this.dotsTotal}`, 240, 880);
      ctx.fillText('[下一关]', 440, 1050);
    }
  }

  addCollectible(type) {
    if (type === TileType.Dot) this.dots++;
    else if (type === TileType.Coin) this.coins++;
    else if (type === TileType.Star) this.stars++;
  }

  showFailPopup() { this.showingPopup = true; this.popupType = 'fail'; }
  showCompletePopup() { this.showingPopup = true; this.popupType = 'complete'; }
  reset() { this.stars = 0; this.coins = 0; this.dots = 0; this.showingPopup = false; }
}
```

**弹窗交互**：
- 失败弹窗：点击"重新开始"→ `gameState.restart()`
- 通关弹窗：点击"下一关"→ `gameState.nextStage()`
- 弹窗区域外点击无效

#### 2.3.8 StageLoader（关卡加载）

**职责**：加载 JSON 关卡数据

**关卡文件路径**：`/stages/story_001.json`、`/stages/story_002.json`、`/stages/story_003.json`

```javascript
class StageLoader {
  async loadAndStart(stageId) {
    const response = await fetch(`/stages/${stageId}.json`);
    const stageData = await response.json();
    
    gridMap = new GridMap(stageData);
    playerController.reset(stageData.enter.x, stageData.enter.z);
    hud.reset();
    hud.dotsTotal = this.countTiles(stageData, TileType.Dot);
    gameState.setState('playing');
  }

  countTiles(stageData, type) {
    let count = 0;
    for (let z = 0; z < stageData.height; z++) {
      for (let x = 0; x < stageData.width; x++) {
        if (stageData.tiles[z][x] === type) count++;
      }
    }
    return count;
  }
}
```

### 2.4 状态流

**游戏状态机**：
```
Loading → Menu → Playing ──→ Paused (fail) → Playing (restart)
                    │                          ↑
                    └──→ Paused (complete) → Playing (next stage)
                                           → Menu (最后一关通关后)
```

```javascript
class GameState {
  constructor() {
    this.state = 'loading';  // 'loading' | 'menu' | 'playing' | 'paused'
    this.currentStageId = null;
    this.stageOrder = ['story_001', 'story_002', 'story_003'];
  }

  setState(newState) { this.state = newState; }

  onPlayerDead() {
    this.setState('paused');
    hud.showFailPopup();
  }

  onStageComplete() {
    this.setState('paused');
    hud.showCompletePopup();
  }

  restart() {
    stageLoader.loadAndStart(this.currentStageId);
  }

  nextStage() {
    const idx = this.stageOrder.indexOf(this.currentStageId);
    if (idx >= 0 && idx < this.stageOrder.length - 1) {
      this.currentStageId = this.stageOrder[idx + 1];
      stageLoader.loadAndStart(this.currentStageId);
    } else {
      this.setState('menu');
    }
  }
}
```

**状态转换规则**：
- Loading → Menu：资源加载完成
- Menu → Playing：点击"开始游戏"
- Playing → Paused：玩家死亡 / 通关 / 点击暂停
- Paused → Playing：点击"重新开始" / "下一关"
- Paused → Menu：最后一关通关后

### 2.5 调试方案

**调试面板**（按 F1 开关）：

显示内容：
- FPS
- 玩家坐标 (gridX, gridZ)
- 玩家状态 (idle / moving / dead)
- 输入缓冲状态
- 固定步长执行次数

**调试快捷键**：
| 按键 | 功能 |
|------|------|
| F1 | 开关调试面板 |
| F2 | 开关网格线 |
| F3 | 开关碰撞框 |
| F4 | 开关无敌模式 |

### 2.6 性能约束

**目标**：中端安卓设备 ≥55 FPS

**优化策略**：
1. 视口裁剪：只渲染屏幕可见的瓦片
2. 整数坐标：避免亚像素渲染
3. 减少 fillStyle 切换：按颜色分批绘制
4. 固定步长限制：累加器最多执行 5 次 fixedUpdate，避免"螺旋死亡"

**性能监控**：调试面板显示实时 FPS，低于 55 时打印警告

### 2.7 部署方案

**方案**：GitHub Pages

**目录结构**：
```
/
  index.html              ← 入口 HTML，<script type="module" src="src/main.js">
  src/
    main.js               ← 入口，初始化 Canvas 和各模块
    GameLoop.js            ← 主循环（update / fixedUpdate / render）
    GameState.js           ← 状态机
    InputManager.js        ← 输入合并
    TouchInput.js          ← 触屏滑动
    KeyboardInput.js       ← 键盘输入
    PlayerController.js    ← 玩家移动
    GridMap.js             ← 地图数据结构
    StageLoader.js         ← 关卡加载与缓存
    Renderer.js            ← 瓦片渲染 + 相机
    HUD.js                 ← 顶部信息栏 + 弹窗
    DebugPanel.js          ← 调试面板（DEBUG=true 时加载）
    TileType.js            ← 瓦片类型常量
  stages/
    story_001.json
    story_002.json
    story_003.json
```

**跨设备测试**：
- PC：Chrome / Firefox
- 安卓：Chrome / 系统浏览器
- 分辨率：1080x1920（主）、1080x2400（次）

### 2.8 代码组织与实现顺序

#### 2.8.1 代码组织方案

采用 ES Modules 多文件方案。每个文件对应一个模块类，`export default` 导出，`import` 引入依赖。

**选型理由**：
- 浏览器原生支持 `<script type="module">`，开发阶段零构建依赖，改完刷新即可验证
- 模块边界与设计文档一一对应（一个 class = 一个文件 = 一份技术方案），便于维护和 code review
- 后续可无缝接入构建工具（Vite / esbuild），增量添加 TypeScript、打包、测试框架，不需要重写现有代码

**开发环境**：
- 本地 HTTP 服务器（`npx serve .` 或 VS Code Live Server）
- ES Modules 要求通过 HTTP 加载，不能直接 `file://` 打开

**入口 HTML 示例**：
```html
<script type="module" src="src/main.js"></script>
```

**模块依赖关系**：
```
main.js
  ├─ GameLoop.js
  ├─ GameState.js
  ├─ InputManager.js
  │    ├─ TouchInput.js
  │    └─ KeyboardInput.js
  ├─ PlayerController.js
  │    └─ TileType.js
  ├─ GridMap.js
  │    └─ TileType.js
  ├─ StageLoader.js
  │    └─ GridMap.js
  ├─ Renderer.js
  ├─ HUD.js
  └─ DebugPanel.js (条件加载)
```

#### 2.8.2 实现顺序

按模块依赖关系从底层到上层推进，每一步完成后都能独立运行验证：

| 阶段 | 模块 | 对应文档 | 验证标准 |
|------|------|---------|---------|
| 1 | Canvas 初始化、GameLoop、GameState | PM-02 2.3.1 / 2.4 | 空白 Canvas 以 60fps 运行，状态机可切换 |
| 2 | TileType、GridMap、StageLoader | ENG-02 | 能加载 JSON 关卡并在控制台打印地图数据 |
| 3 | Renderer + Camera | PM-02 2.3.6 | 能看到关卡瓦片渲染和相机跟随 |
| 4 | TouchInput、KeyboardInput、InputManager | ENG-03 | 滑动/按键能在控制台输出方向 |
| 5 | PlayerController（移动 + 碰撞 + 收集） | ENG-04 | 角色能在地图中滑行、碰壁停止、收集物品、触刺死亡 |
| 6 | HUD + 弹窗 + 状态流闭环 | ENG-05 | 完整的 开始→游玩→失败/通关→重开/下一关 循环 |
| 7 | DebugPanel | PM-02 调试面板方案 | F1-F8 快捷键全部可用 |

**设计原则**：每个阶段产出可运行的中间产物，避免"写了一堆代码但什么都看不到"的情况。

#### 2.8.3 后续扩展路径

MVP 完成后，以下升级均为增量操作，不需要重写现有代码：

| 升级项 | 做法 | 影响范围 |
|--------|------|---------|
| 引入 TypeScript | 将 `.js` 改为 `.ts`，逐文件迁移 | 仅文件后缀和类型标注 |
| 引入构建工具 | 添加 `vite.config.js`，零配置即可工作 | 仅新增配置文件 |
| 引入测试框架 | 添加 Vitest，按模块写单元测试 | 新增 `tests/` 目录 |
| 引入资源管线 | Sprite atlas、音效文件通过 Vite 的 asset 处理 | 新增 `assets/` 目录 |

### 2.9 边界情况处理

| 情况 | 处理方式 |
|------|---------|
| 玩家在边界外 | `getTile` 返回 `TileType.Wall` |
| 输入缓冲过期 | `bufferTimer` ≤ 0 时清空 `bufferedDirection` |
| 移动中再次输入同方向 | 覆盖缓冲，重置 `bufferTimer` |
| 关卡数据加载失败 | 显示错误提示，返回主菜单 |
| 帧率过低 | 累加器最多执行 5 次 fixedUpdate |
| 玩家卡在墙里 | 调试模式打印警告，强制传送到 Enter |

### 2.10 测试矩阵

| 测试点 | 验收标准 |
|--------|---------|
| 四向移动 | 上下左右四个方向都能正常移动 |
| 撞墙停止 | 角色停在墙前一格，不穿墙 |
| 输入缓冲 | 移动中滑动，停下后立即执行缓冲方向 |
| 输入缓冲过期 | 停下超过 20ms 后缓冲失效 |
| 收集圆点 | 经过时消失，计数 +1 |
| 收集金币 | 经过时消失，计数 +1 |
| 收集星星 | 经过时消失，计数 +1 |
| 触碰尖刺 | 死亡，显示失败弹窗 |
| 到达出口 | 显示通关弹窗 |
| 重开 | 失败后点击重开，从 Enter 重新开始 |
| 下一关 | 通关后点击下一关，加载下一关 |
| 跨设备一致性 | 不同设备上移动速度和手感一致 |
| 性能 | 中端安卓 ≥55 FPS |

### 2.11 风险与替代方案

| 风险 | 影响 | 替代方案 |
|------|------|---------|
| Canvas 渲染性能不足 | FPS < 55 | 降低瓦片尺寸、离屏 Canvas、按颜色分批绘制 |
| 触屏滑动识别不准 | 误触、方向错误 | 调整 swipeThreshold、增加方向锁定 |
| 输入缓冲窗口太短 | 连续滑动丢失 | 增加到 50ms（需验证手感） |
| 固定步长累加器卡顿 | 帧率过低时卡死 | 限制最大执行次数（已实现） |
| 关卡数据格式变化 | 加载失败 | 增加版本号校验 |

---

## 变更日志

| 日期 | 变更类型 | 变更内容 | 影响范围 | 审批状态 |
|------|---------|---------|---------|---------|
| 2026-04-16 | INIT | 创建初稿 | 全文档 | — |
| 2026-04-21 | ADD | 新增 2.8 代码组织与实现顺序；更新 2.7 目录结构为 ES Modules 多文件方案 | 2.7、2.8（原 2.8-2.10 顺延为 2.9-2.11） | — |

---

## 附录：参考文档

- 逆向报告《深度逆向分析》— 操作手感、关卡生成、数值节奏
- 逆向报告《游戏运行时宏观规则》— 帧率策略、时间系统、状态机、输入时序
- 逆向报告《开发用数值真值表》— 全部已提取数值
- 逆向报告《全机关行为矩阵》— 碰撞规则、碰撞优先级
- MVP 需求清单 `mvp_requirement_list_zh.md`
- MVP 执行计划 `mvp_execution_plan_zh.md`
