# ENG-02 关卡格式与加载器技术方案

**文档类型**：L2 技术方案文档  
**创建日期**：2026-04-17  
**最后更新**：2026-04-20  
**状态**：已更新（基于 LVL-01/02/03 实际数据修正）  
**依赖**：PM-02 核心运行时设计文档（GridMap 2.3.2、StageLoader 2.3.8）  
**覆盖需求**：R-010（JSON 网格格式）、R-011（瓦片与碰撞子集）

---

## 1. 背景

PM-02 中已定义了 GridMap 的基础数据结构和 StageLoader 的加载接口。本文档在此基础上，完整定义关卡 JSON 格式规范、字段校验规则、瓦片类型体系、加载器实现细节、错误处理与多关卡管理策略。

本文档的目标是：任何开发 thread 只看本文档 + PM-02，就能正确创建关卡 JSON 文件并实现加载流程，不需要额外沟通。

**设计约束**：
- 关卡数据必须是纯 JSON，不依赖二进制格式
- 单个关卡文件必须自包含（不引用外部资源）
- 格式必须向前兼容（新增字段不破坏旧版加载器）
- 关卡可以是不规则形状，外围使用 Empty(0) 表示关卡边界外

## 2. 模块边界

**本文档覆盖**：
- 关卡 JSON 格式完整定义（schema）
- 瓦片类型枚举与语义
- 关卡元数据规范
- StageLoader 加载、校验、错误处理
- 多关卡管理与关卡顺序
- GridMap 初始化与查询接口

**本文档不覆盖**（已在其他文档定义）：
- 碰撞检测逻辑（ENG-04）
- 渲染瓦片的视觉规格（PM-02 Renderer）
- HUD 收集物计数（PM-02 HUD）
- 具体关卡内容设计（LVL-01/02/03 功能卡）

## 3. 关卡 JSON 格式定义

### 3.1 完整 Schema

```json
{
  "id": "story_001",
  "version": 1,
  "width": 17,
  "height": 30,
  "enter": { "x": 12, "z": 28 },
  "exit": { "x": 10, "z": 1 },
  "tiles": [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 0, 0, 0, 0, 0],
    ...
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  "meta": {
    "name": "Story 1",
    "difficulty": 1,
    "stars_total": 3,
    "dots_total": 71,
    "coins_total": 4
  }
}
```

**说明**：
- 示例为不规则形状关卡，外围 0 表示关卡边界外（不可进入区域）
- 实际游玩区域由 Wall(1) 包围，形成迷宫通道
- tiles 数组中 0 的位置在渲染时不绘制或绘制为背景色

### 3.2 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 关卡唯一标识符，格式 `story_NNN`（如 `story_001`），用于文件名和内部引用 |
| `version` | number | 是 | 格式版本号，当前固定为 `1`，用于向前兼容校验 |
| `width` | number | 是 | 关卡宽度（列数），MVP 实际关卡宽度为 17/21/24 不等 |
| `height` | number | 是 | 关卡高度（行数），MVP 实际关卡高度为 17/22/30 不等 |
| `enter` | object | 是 | 玩家出生点坐标 `{x, z}`，必须指向 `tiles` 中值为 `2`（Enter）的格子 |
| `exit` | object | 是 | 出口坐标 `{x, z}`，必须指向 `tiles` 中值为 `3`（Exit）的格子 |
| `tiles` | number[][] | 是 | 二维瓦片数组，`tiles[z][x]`，行优先，每行长度必须等于 `width` |
| `meta` | object | 否 | 关卡元数据，用于 HUD 显示和统计，加载器不依赖此字段运行 |

### 3.3 meta 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `meta.name` | string | 否 | 关卡显示名称 |
| `meta.difficulty` | number | 否 | 难度等级（1-5），仅供参考 |
| `meta.par_moves` | number | 否 | 参考步数（设计者预期的最优解步数） |
| `meta.stars_total` | number | 否 | 星星总数，冗余字段，可由 tiles 计算得出，用于快速读取 |
| `meta.dots_total` | number | 否 | 圆点总数，同上 |
| `meta.coins_total` | number | 否 | 金币总数，同上 |

### 3.4 坐标系约定

```
        x →
    0   1   2   3  ... (width-1)
z  ┌───┬───┬───┬───     ───┐
↓ 0│   │   │   │   ...    │
   ├───┼───┼───┼───     ───┤
  1│   │   │   │   ...    │
   ├───┼───┼───┼───     ───┤
  2│   │   │   │   ...    │
   ...
```

- `x`：水平方向，从左到右，范围 `[0, width-1]`
- `z`：垂直方向，从上到下，范围 `[0, height-1]`
- `tiles[z][x]`：行优先索引，第一个下标是行（z），第二个是列（x）
- 屏幕上 z=0 在顶部，z 增大向下（与 Canvas 坐标系一致）
- 玩家"向上"移动 = z 减小，"向下"移动 = z 增大
- **不规则关卡**：外围 Empty(0) 表示关卡边界外，实际游玩区域由 Wall(1) 包围

**为什么用 z 而不用 y**：
- 与 PM-02 和 ENG-04 中的命名保持一致
- 源自逆向报告中原版使用 3D 坐标系（x, y, z），y 轴为高度轴
- MVP 虽然是 2D 渲染，但保留 z 命名以避免与未来 2.5D 扩展冲突

## 4. 瓦片类型体系

### 4.1 瓦片枚举（MVP 冻结子集）

| 值 | 常量名 | 语义 | 碰撞行为 | 可通过 | 可收集 |
|----|--------|------|----------|--------|--------|
| 0 | `Empty` | 空地 | 无 | 是 | 否 |
| 1 | `Wall` | 墙壁 | 阻挡，角色停在前一格 | 否 | 否 |
| 2 | `Enter` | 入口 | 无（等同 Empty） | 是 | 否 |
| 3 | `Exit` | 出口 | 触发通关 | 是 | 否 |
| 4 | `Dot` | 圆点 | 收集后变为 Empty | 是 | 是 |
| 5 | `Coin` | 金币 | 收集后变为 Empty | 是 | 是 |
| 6 | `Star` | 星星 | 收集后变为 Empty | 是 | 是 |
| 7 | `Spikes` | 尖刺 | 触发死亡 | 是（进入后死亡） | 否 |

**来源**：R-011 冻结子集 + 逆向报告《全机关行为矩阵》

### 4.2 代码定义

```javascript
const TileType = Object.freeze({
  Empty:  0,
  Wall:   1,
  Enter:  2,
  Exit:   3,
  Dot:    4,
  Coin:   5,
  Star:   6,
  Spikes: 7
});

// 反向映射（调试用）
const TileNames = Object.freeze({
  0: 'Empty',
  1: 'Wall',
  2: 'Enter',
  3: 'Exit',
  4: 'Dot',
  5: 'Coin',
  6: 'Star',
  7: 'Spikes'
});
```

### 4.3 瓦片分类

**按碰撞行为分类**：
- 可通过瓦片：`Empty`(0)、`Enter`(2)、`Exit`(3)、`Dot`(4)、`Coin`(5)、`Star`(6)、`Spikes`(7)
- 阻挡瓦片：`Wall`(1)

**按路径检测终止条件分类**：
- 继续移动：`Empty`(0)、`Enter`(2)、`Dot`(4)、`Coin`(5)、`Star`(6)
- 终止移动（停在前一格）：`Wall`(1)、边界外
- 终止移动（停在当前格）：`Exit`(3)、`Spikes`(7)

**按收集行为分类**：
- 可收集：`Dot`(4)、`Coin`(5)、`Star`(6)
- 不可收集：其余所有

### 4.4 扩展规则

MVP 阶段瓦片值 0-7 已冻结，不可修改语义。如果后续需要新增瓦片类型：
- 新瓦片从值 `8` 开始分配
- 必须先更新 R-011 需求，再更新本文档的瓦片枚举表
- 新瓦片必须明确定义碰撞行为、是否可通过、是否可收集
- 加载器遇到未知瓦片值时，按 `Wall` 处理（安全降级）

## 5. 关卡校验规则

### 5.1 加载时校验（必须通过，否则拒绝加载）

| 校验项 | 规则 | 失败处理 |
|--------|------|---------|
| `version` 存在且为 `1` | `typeof version === 'number' && version === 1` | 拒绝加载，提示版本不兼容 |
| `width` 为正整数 | `Number.isInteger(width) && width > 0` | 拒绝加载 |
| `height` 为正整数 | `Number.isInteger(height) && height > 0` | 拒绝加载 |
| `tiles` 行数等于 `height` | `tiles.length === height` | 拒绝加载 |
| 每行长度等于 `width` | `tiles[z].length === width` for all z | 拒绝加载 |
| 所有瓦片值在合法范围 | `0 <= tiles[z][x] <= 7` | 拒绝加载 |
| `enter` 坐标在范围内 | `0 <= enter.x < width && 0 <= enter.z < height` | 拒绝加载 |
| `exit` 坐标在范围内 | 同上 | 拒绝加载 |
| `enter` 指向 Enter 瓦片 | `tiles[enter.z][enter.x] === 2` | 拒绝加载 |
| `exit` 指向 Exit 瓦片 | `tiles[exit.z][exit.x] === 3` | 拒绝加载 |

### 5.2 加载时警告（不阻止加载，但打印警告日志）

| 校验项 | 规则 | 警告内容 |
|--------|------|---------|
| 边界行/列应为 Wall | 已移除：MVP 关卡为不规则形状，外围使用 Empty(0)，此检查不再适用 | — |
| Enter 数量恰好为 1 | 统计 tiles 中值为 `2` 的格子数 | "Enter 数量不为 1" |
| Exit 数量恰好为 1 | 统计 tiles 中值为 `3` 的格子数 | "Exit 数量不为 1" |
| Star 数量不超过 3 | 统计 tiles 中值为 `6` 的格子数 | "Star 数量超过 3" |
| meta 中的计数与实际一致 | `meta.dots_total` 等于实际 Dot 数量 | "meta.dots_total 与实际不一致" |

### 5.3 校验实现

```javascript
function validateStageData(data) {
  const errors = [];
  const warnings = [];

  // 必填字段检查
  if (data.version !== 1) {
    errors.push(`version must be 1, got ${data.version}`);
  }
  if (!Number.isInteger(data.width) || data.width <= 0) {
    errors.push(`width must be positive integer, got ${data.width}`);
  }
  if (!Number.isInteger(data.height) || data.height <= 0) {
    errors.push(`height must be positive integer, got ${data.height}`);
  }

  // tiles 结构检查
  if (!Array.isArray(data.tiles)) {
    errors.push('tiles must be an array');
  } else {
    if (data.tiles.length !== data.height) {
      errors.push(`tiles has ${data.tiles.length} rows, expected ${data.height}`);
    }
    for (let z = 0; z < data.tiles.length; z++) {
      if (!Array.isArray(data.tiles[z]) || data.tiles[z].length !== data.width) {
        errors.push(`tiles[${z}] length is ${data.tiles[z]?.length}, expected ${data.width}`);
      }
      for (let x = 0; x < (data.tiles[z]?.length || 0); x++) {
        const v = data.tiles[z][x];
        if (!Number.isInteger(v) || v < 0 || v > 7) {
          errors.push(`tiles[${z}][${x}] = ${v} is not a valid tile type`);
        }
      }
    }
  }

  // enter / exit 检查
  if (data.enter) {
    if (data.enter.x < 0 || data.enter.x >= data.width ||
        data.enter.z < 0 || data.enter.z >= data.height) {
      errors.push(`enter (${data.enter.x}, ${data.enter.z}) is out of bounds`);
    } else if (data.tiles[data.enter.z]?.[data.enter.x] !== TileType.Enter) {
      errors.push(`enter points to tile type ${data.tiles[data.enter.z][data.enter.x]}, expected Enter(2)`);
    }
  } else {
    errors.push('enter is required');
  }

  if (data.exit) {
    if (data.exit.x < 0 || data.exit.x >= data.width ||
        data.exit.z < 0 || data.exit.z >= data.height) {
      errors.push(`exit (${data.exit.x}, ${data.exit.z}) is out of bounds`);
    } else if (data.tiles[data.exit.z]?.[data.exit.x] !== TileType.Exit) {
      errors.push(`exit points to tile type ${data.tiles[data.exit.z][data.exit.x]}, expected Exit(3)`);
    }
  } else {
    errors.push('exit is required');
  }

  // 警告级别检查
  if (errors.length === 0 && data.tiles) {
    // 注意：不再检查边界行/列是否全为 Wall
    // MVP 关卡为不规则形状，外围使用 Empty(0)，游玩区域由 Wall 自行包围

    // 计数检查
    const counts = { enter: 0, exit: 0, star: 0, dot: 0, coin: 0 };
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const t = data.tiles[z][x];
        if (t === 2) counts.enter++;
        if (t === 3) counts.exit++;
        if (t === 4) counts.dot++;
        if (t === 5) counts.coin++;
        if (t === 6) counts.star++;
      }
    }
    if (counts.enter !== 1) warnings.push(`Enter count is ${counts.enter}, expected 1`);
    if (counts.exit !== 1) warnings.push(`Exit count is ${counts.exit}, expected 1`);
    if (counts.star > 3) warnings.push(`Star count is ${counts.star}, max is 3`);

    // meta 一致性检查
    if (data.meta) {
      if (data.meta.dots_total !== undefined && data.meta.dots_total !== counts.dot) {
        warnings.push(`meta.dots_total (${data.meta.dots_total}) != actual (${counts.dot})`);
      }
      if (data.meta.coins_total !== undefined && data.meta.coins_total !== counts.coin) {
        warnings.push(`meta.coins_total (${data.meta.coins_total}) != actual (${counts.coin})`);
      }
      if (data.meta.stars_total !== undefined && data.meta.stars_total !== counts.star) {
        warnings.push(`meta.stars_total (${data.meta.stars_total}) != actual (${counts.star})`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, counts };
}
```

## 6. StageLoader 实现

### 6.1 职责

- 根据关卡 ID 加载对应的 JSON 文件
- 校验关卡数据合法性
- 初始化 GridMap 实例
- 统计收集物数量并同步给 HUD
- 重置 PlayerController 到出生点
- 处理加载失败

### 6.2 关卡文件路径约定

```
/stages/
  story_001.json
  story_002.json
  story_003.json
```

- 文件名 = 关卡 ID + `.json`
- 路径相对于部署根目录
- GitHub Pages 部署时，路径为 `https://<user>.github.io/<repo>/stages/story_001.json`

### 6.3 关卡顺序管理

```javascript
const STAGE_ORDER = Object.freeze([
  'story_001',
  'story_002',
  'story_003'
]);
```

- MVP 阶段关卡顺序硬编码，不从服务端获取
- 如果后续需要动态关卡列表，可改为从 `stages/index.json` 加载
- `STAGE_ORDER` 是唯一的关卡顺序真值源，GameState 中的 `stageOrder` 引用此常量

### 6.4 完整实现

```javascript
class StageLoader {
  constructor() {
    this.cache = new Map();  // 关卡数据缓存，key = stageId
  }

  /**
   * 加载并启动关卡
   * @param {string} stageId - 关卡 ID，如 'story_001'
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async loadAndStart(stageId) {
    try {
      const stageData = await this.load(stageId);
      this.initStage(stageData);
      return { success: true };
    } catch (err) {
      console.error(`[StageLoader] Failed to load stage ${stageId}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * 加载关卡数据（带缓存）
   */
  async load(stageId) {
    // 检查缓存
    if (this.cache.has(stageId)) {
      // 返回深拷贝，避免运行时修改污染缓存
      return JSON.parse(JSON.stringify(this.cache.get(stageId)));
    }

    const url = `stages/${stageId}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    const data = await response.json();

    // 校验
    const result = validateStageData(data);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.join('; ')}`);
    }

    // 打印警告
    for (const w of result.warnings) {
      console.warn(`[StageLoader] ${stageId}: ${w}`);
    }

    // 缓存原始数据
    this.cache.set(stageId, data);

    // 返回深拷贝
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * 用已加载的数据初始化关卡
   */
  initStage(stageData) {
    // 初始化 GridMap
    gridMap = new GridMap(stageData);

    // 重置玩家到出生点
    playerController.reset(stageData.enter.x, stageData.enter.z);

    // 统计收集物并同步 HUD
    const counts = this.countCollectibles(stageData);
    hud.reset();
    hud.dotsTotal = counts.dot;

    // 更新游戏状态
    gameState.currentStageId = stageData.id;
    gameState.setState('playing');

    console.log(`[StageLoader] Stage ${stageData.id} loaded: ${stageData.width}x${stageData.height}, ` +
                `dots=${counts.dot}, coins=${counts.coin}, stars=${counts.star}`);
  }

  /**
   * 统计关卡中的收集物数量
   */
  countCollectibles(stageData) {
    const counts = { dot: 0, coin: 0, star: 0 };
    for (let z = 0; z < stageData.height; z++) {
      for (let x = 0; x < stageData.width; x++) {
        const t = stageData.tiles[z][x];
        if (t === TileType.Dot) counts.dot++;
        else if (t === TileType.Coin) counts.coin++;
        else if (t === TileType.Star) counts.star++;
      }
    }
    return counts;
  }

  /**
   * 清空缓存（调试用）
   */
  clearCache() {
    this.cache.clear();
  }
}
```

### 6.5 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 缓存策略 | 加载后缓存原始 JSON，使用时深拷贝 | 重开关卡时不需要重新 fetch，但运行时修改（收集物消失）不污染缓存 |
| 深拷贝方式 | `JSON.parse(JSON.stringify())` | 关卡数据是纯 JSON，无函数/循环引用，此方式最简单且足够 |
| 错误处理 | 返回 `{success, error}` 而非抛异常 | 调用方（GameState）可以优雅处理，显示错误提示而非崩溃 |
| 路径格式 | 相对路径 `stages/xxx.json` | 兼容 GitHub Pages 和本地 file:// 开发 |

## 7. GridMap 接口

### 7.1 完整实现

```javascript
class GridMap {
  constructor(stageData) {
    this.id = stageData.id;
    this.width = stageData.width;
    this.height = stageData.height;
    this.tiles = stageData.tiles;    // 二维数组 [z][x]，运行时会被修改（收集物消失）
    this.enter = stageData.enter;    // {x, z}
    this.exit = stageData.exit;      // {x, z}
    this.meta = stageData.meta || {};
  }

  /**
   * 获取指定坐标的瓦片类型
   * 边界外返回 Wall（安全降级）
   */
  getTile(x, z) {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return TileType.Wall;
    }
    return this.tiles[z][x];
  }

  /**
   * 设置指定坐标的瓦片类型
   * 用于收集物消失（Dot/Coin/Star → Empty）
   * 边界外静默忽略
   */
  setTile(x, z, type) {
    if (x >= 0 && x < this.width && z >= 0 && z < this.height) {
      this.tiles[z][x] = type;
    }
  }

  /**
   * 检查坐标是否在地图范围内
   */
  inBounds(x, z) {
    return x >= 0 && x < this.width && z >= 0 && z < this.height;
  }

  /**
   * 检查指定坐标是否可通过（非 Wall 且在范围内）
   */
  isPassable(x, z) {
    return this.getTile(x, z) !== TileType.Wall;
  }
}
```

### 7.2 运行时修改规则

GridMap 的 `tiles` 数组在运行时会被修改，仅限以下场景：

| 场景 | 操作 | 触发时机 |
|------|------|---------|
| 收集 Dot | `setTile(x, z, TileType.Empty)` | PlayerController.collectItemsOnPath() |
| 收集 Coin | `setTile(x, z, TileType.Empty)` | 同上 |
| 收集 Star | `setTile(x, z, TileType.Empty)` | 同上 |

- 重开关卡时，StageLoader 从缓存深拷贝一份新数据重新初始化 GridMap，收集物恢复
- 不允许在运行时修改 Wall、Enter、Exit、Spikes 的瓦片类型

## 8. 重开与关卡切换流程

### 8.1 重开当前关卡

```
玩家死亡 / 点击重开
  → GameState.restart()
    → StageLoader.loadAndStart(currentStageId)
      → load() 命中缓存，返回深拷贝
      → initStage() 重新初始化 GridMap、PlayerController、HUD
```

- 不需要重新 fetch JSON
- 收集物状态通过深拷贝自动恢复
- 延迟：接近 0ms（纯内存操作）

### 8.2 切换到下一关

```
玩家通关 / 点击下一关
  → GameState.nextStage()
    → 从 STAGE_ORDER 取下一个 stageId
    → StageLoader.loadAndStart(nextStageId)
      → load() 首次加载需要 fetch，后续命中缓存
      → initStage()
```

### 8.3 预加载策略

MVP 阶段不实现预加载。原因：
- 只有 3 个关卡，JSON 文件极小（预计 <5KB 每个）
- fetch 延迟在本地和 GitHub Pages 上都可忽略
- 缓存机制保证同一关卡只 fetch 一次

如果后续关卡数量增加或文件变大，可考虑在通关弹窗显示期间预加载下一关。

## 9. 边界条件

| 情况 | 处理方式 | 验证方法 |
|------|---------|---------|
| JSON 文件不存在（404） | `load()` 抛出 HTTP 错误，`loadAndStart` 返回 `{success: false}` | 单元测试 mock fetch |
| JSON 格式错误（非法 JSON） | `response.json()` 抛出 SyntaxError | 单元测试 |
| 校验失败（width != 13） | `validateStageData` 返回 errors，`load()` 抛出 | 单元测试 |
| 网络超时 | fetch 超时由浏览器处理，Promise reject | 集成测试 |
| tiles 中包含未知瓦片值（如 8） | 校验阶段拒绝加载 | 单元测试 |
| enter/exit 坐标指向错误瓦片 | 校验阶段拒绝加载 | 单元测试 |
| meta 字段缺失 | 加载器不依赖 meta，正常运行 | 单元测试 |
| meta 计数与实际不一致 | 打印警告，以实际 tiles 统计为准 | 单元测试 |
| 重开时缓存数据被意外修改 | 深拷贝机制保证缓存不被污染 | 单元测试 |
| 最后一关通关后点击下一关 | `nextStage()` 检测到无下一关，返回主菜单 | 集成测试 |

## 10. 调试支持

### 10.1 控制台日志

```javascript
// 加载成功
console.log('[StageLoader] Stage story_001 loaded: 17x30, dots=71, coins=4, stars=3');

// 校验警告
console.warn('[StageLoader] story_001: Border tiles are not all Wall');
console.warn('[StageLoader] story_001: meta.dots_total (10) != actual (12)');

// 加载失败
console.error('[StageLoader] Failed to load stage story_001: HTTP 404: stages/story_001.json');
console.error('[StageLoader] Failed to load stage story_001: Validation failed: width must be 13, got 15');
```

### 10.2 调试面板扩展

在 PM-02 定义的调试面板（F1）中增加关卡信息：

```
Stage: story_001
Size: 17x30
Dots: 8/71
Coins: 2/4
Stars: 1/3
Cache: 2 stages
```

### 10.3 调试快捷键扩展

| 按键 | 功能 | 说明 |
|------|------|------|
| F7 | 重新加载当前关卡（清除缓存） | 调用 `stageLoader.clearCache()` 后重新 `loadAndStart` |
| F8 | 跳到下一关 | 调用 `gameState.nextStage()` |

## 11. 测试矩阵

### 11.1 单元测试

| 测试用例 | 输入 | 预期输出 | 验证点 |
|---------|------|---------|--------|
| 合法关卡数据 | 完整合法 JSON | `valid: true, errors: []` | 校验通过 |
| version 不为 1 | `version: 2` | `valid: false` | 版本校验 |
| width 不为 13 | `width: 15` | `valid: false` | 宽度校验 |
| tiles 行数不匹配 | `height: 5` 但 tiles 只有 3 行 | `valid: false` | 行数校验 |
| 行长度不匹配 | 某行只有 10 个元素 | `valid: false` | 列数校验 |
| 非法瓦片值 | `tiles[0][0] = 99` | `valid: false` | 瓦片值范围 |
| enter 越界 | `enter: {x: 20, z: 0}` | `valid: false` | 坐标范围 |
| enter 指向非 Enter 瓦片 | enter 坐标处为 Wall | `valid: false` | 瓦片类型匹配 |
| 边界非全墙 | 第一行有 Empty | `valid: true, warnings 非空` | 警告级别 |
| Star 超过 3 个 | 4 个 Star 瓦片 | `valid: true, warnings 非空` | 警告级别 |
| meta 计数不一致 | `meta.dots_total: 5` 实际 8 | `valid: true, warnings 非空` | 警告级别 |
| meta 缺失 | 无 meta 字段 | `valid: true` | 可选字段 |
| getTile 边界外 | `getTile(-1, 0)` | `TileType.Wall` | 安全降级 |
| setTile 边界外 | `setTile(-1, 0, 0)` | 静默忽略 | 安全降级 |
| 缓存深拷贝 | 修改运行时 tiles 后检查缓存 | 缓存未被修改 | 缓存隔离 |

### 11.2 集成测试

| 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|
| 首次加载 | 调用 `loadAndStart('story_001')` | 关卡正常显示，玩家在出生点 |
| 重开关卡 | 收集几个 Dot 后重开 | 所有 Dot 恢复，玩家回到出生点 |
| 切换关卡 | 通关后点击下一关 | 新关卡加载，HUD 重置 |
| 最后一关通关 | 通关 story_003 后点击下一关 | 返回主菜单 |
| 加载失败 | 请求不存在的关卡 ID | 显示错误提示，不崩溃 |
| 缓存命中 | 重开同一关卡 | 不触发 fetch，从缓存加载 |

## 12. 性能约束

| 指标 | 目标 | 说明 |
|------|------|------|
| JSON 解析时间 | <10ms | 关卡文件 <5KB，解析极快 |
| 校验时间 | <5ms | 遍历 tiles 数组一次 |
| GridMap 初始化 | <1ms | 纯赋值操作 |
| 深拷贝时间 | <2ms | JSON.parse(JSON.stringify()) 对小数据足够快 |
| 内存占用 | <50KB / 关卡 | 17x30 的 tiles 数组 + 元数据 |

## 13. 风险与替代方案

| 风险 | 影响 | 替代方案 |
|------|------|---------|
| JSON 文件被篡改 | 加载异常关卡 | 校验机制已覆盖，非法数据会被拒绝 |
| 关卡文件过大 | 加载延迟 | MVP 阶段不会发生（<5KB），后续可加 gzip |
| 深拷贝性能不足 | 重开延迟 | 可改为手动拷贝 tiles 数组（只拷贝会变的部分） |
| 瓦片类型扩展冲突 | 新旧版本不兼容 | version 字段 + 未知瓦片降级为 Wall |
| fetch 在 file:// 协议下失败 | 本地开发无法加载 | 需要本地 HTTP 服务器（如 `python -m http.server`） |

---

## 变更日志

| 日期 | 变更类型 | 变更内容 | 影响范围 |
|------|---------|---------|---------|
| 2026-04-17 | INIT | 创建初稿 | 全文档 |
| 2026-04-20 | FIX | 基于 LVL-01/02/03 实际数据修正：移除 width===13 硬编码，移除边界墙校验，更新示例 JSON，关卡支持不规则形状 | 设计约束、字段定义、校验规则、校验实现、示例 |

---

## 附录：参考文档

- PM-02 核心运行时设计文档（GridMap 2.3.2、StageLoader 2.3.8）
- ENG-04 核心移动手感设计文档（碰撞检测使用 GridMap 接口）
- MVP 需求清单 R-010（JSON 网格格式）、R-011（瓦片与碰撞子集）
- LVL-01 功能卡（Story 1: 17x30）、LVL-02 功能卡（Story 2: 21x22）、LVL-03 功能卡（Story 3: 24x17）
