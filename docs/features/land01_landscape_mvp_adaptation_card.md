# LAND-01 功能卡：横屏 MVP 适配

**文档类型**：L1 功能卡 / 适配实验卡
**任务 ID**：LAND-01
**创建日期**：2026-06-25
**状态**：DONE
**基线**：REL-01 后的 Story 1-3 MVP freeze candidate
**范围类型**：冻结后实验性适配

## 背景

当前 H5 MVP 已进入 freeze candidate 状态。Story 1-3 已形成完整可玩闭环，QA-01、QA-02、QA-03 和 REL-01 已关闭，PERF-01 已明确标记为 `SKIPPED`。

LAND-01 是新的冻结后实验任务，目标是在不改变已验证 portrait MVP 基线的前提下，评估现有 MVP 玩法是否可以适配为横屏版本。

本任务不得改写 REL-01 收口结论。除非后续任务明确改变发布范围，否则现有 Story 1-3 portrait 实现仍是当前 MVP freeze candidate。

## 目标

为现有 Story 1-3 MVP 玩法建立并验证一条横屏适配路径。

目标体验：

- 玩家可以进入 MVP 闭环的 landscape 版本。
- Story 1、Story 2 和 Story 3 可以在 landscape 模式下加载。
- 四向滑行玩法在横屏下仍然清晰、可玩。
- 收集、死亡、重开、通关弹窗和下一关流程保持可用。
- 适配验证不覆盖现有 portrait stage 数据，也不改写历史 QA 证据。

## 非目标

LAND-01 不包含：

- 新增 Story 4 或任何新关卡内容。
- 新增 tile 类型、敌人、移动规则或谜题机制。
- 替换现有 portrait MVP 路径。
- 宣称 PERF-01 已通过。
- 实现完整 DebugPanel。
- 最终商业化 UI polish。
- 音频、账号、存档、排行榜、商业化或设置功能。

## 范围

包含：

- Story 1-3 的 landscape stage orientation 策略。
- landscape viewport、scale 和 camera-follow 策略。
- landscape 可玩性所需的最小 HUD 与输入检查。
- 确认现有 portrait MVP 行为未被误破坏的回归标准。
- 在把该适配视为可发布前，应记录风险与验证要求。

不包含：

- 对现有 `stages/story_001.json`、`stages/story_002.json`、`stages/story_003.json` 的破坏性编辑。
- 大范围 UI 重设计。
- 大范围性能优化。
- 改变 QA-01、QA-02、QA-03、REL-01 或 PERF-01 的含义。

## Stage Orientation 策略

Landscape 适配不应直接覆盖已验证的 portrait stage JSON 文件。

优先考虑的方案：

1. Runtime transform
   - 加载原始 `story_*.json` 文件。
   - 在 stage loading 或 adaptation layer 应用 90 度变换。
   - 保持原始 source data 不变。

2. Generated landscape derivatives
   - 生成单独的 landscape stage 文件，例如 `story_001_landscape`。
   - 保持生成流程可复现。
   - 把生成文件视为 derived data，而不是原 MVP 基线的替代品。

首版实现应优先采用 runtime transform，除非有明确理由需要持久化单独的 landscape JSON 文件。

### 旋转映射

如果使用顺时针旋转：

```text
newWidth = oldHeight
newHeight = oldWidth
newX = oldHeight - 1 - oldZ
newZ = oldX
```

如果使用逆时针旋转：

```text
newWidth = oldHeight
newHeight = oldWidth
newX = oldZ
newZ = oldWidth - 1 - oldX
```

实现必须把同一变换应用到：

- `width` 和 `height`。
- `enter`。
- `exit`。
- `tiles` 的每一行和每一列。
- 所有 collectible、hazard、wall 和 empty tile 在变换后网格中的位置。

初始设计建议采用顺时针旋转，但最终方向应先通过快速可玩性 review 确认，再视为已接受。

## Camera 与 Viewport 策略

Landscape 模式不应为了完整显示整个旋转后关卡而简单 fit-to-screen；如果这样导致 tile 太小、难以阅读或难以触控，就不应采用。

推荐 camera 目标：

- tile 可读性保持在实用最小尺寸以上。
- landscape viewport 比 portrait 模式提供更多横向上下文。
- 保持玩家周围局部导航清晰。
- 避免只为了显示整张大地图而过度缩小关卡。
- camera 运动足够稳定，让重复滑行动作可预期。

接受行为：

- 从 viewport height 优先计算 landscape-specific tile scale。
- 限制 scale，避免 HUD 与 safe-area margin 遮挡 playfield。
- 使用与现有 portrait camera 相同的 focus rule，让玩家保持居中。
- 避免 camera edge clamping 导致玩家偏离屏幕中心。

Camera 应被视为适配层。核心移动、碰撞、收集、死亡和通关规则应保持不变。

## 输入与 HUD 策略

输入应保持 screen-relative：

- 向右滑动表示在可见 landscape 地图上向右移动。
- 向左滑动表示在可见 landscape 地图上向左移动。
- 向上、向下滑动与当前显示地图方向保持视觉一致。

实现应避免把玩家意图再映射回原 portrait 坐标系。stage 本身应被转换，输入应直接作用于可见 transformed world。

轴向平局判定应跟随 stage orientation：

- portrait 模式保持现有规则：当 `absDx === absDy` 时垂直优先。
- landscape 模式在 `absDx === absDy` 时采用水平优先，以匹配顺时针 90 度 stage transform 后许多原本纵向路径变为横向路径的情况。

LAND-01 的 HUD 要求刻意保持最小：

- 计数器保持可见，且不遮挡关键 playfield 内容。
- 失败和通关弹窗在 landscape 下仍可用。
- start/menu 状态仍可用。
- 不破坏 `?debugInput=1` 行为。
- 不要求完整 DebugPanel。

## 建议入口

首版实现应通过显式开关启用 landscape 模式，例如：

```text
?orientation=landscape
```

Direct stage entry 仍应可用：

```text
?orientation=landscape&stage=story_001
?orientation=landscape&stage=story_002
?orientation=landscape&stage=story_003
```

如果实现时选择不同参数名，应先更新本功能卡，再开始代码工作。

除非项目明确决定推广 landscape 模式，否则 portrait 模式应保持默认。

## 建议实现顺序

1. 增加或记录 landscape mode 决策和 URL 入口行为。
2. 在不编辑原始 stage JSON 的前提下实现 stage transform 路径。
3. 验证 Story 1-3 转换后的元数据：
   - 转换后尺寸。
   - 转换后 Enter 和 Exit。
   - Dot、Coin、Star、Spikes、Enter、Exit 计数不变。
4. 实现 landscape scale 和 camera follow 规则。
5. 验证 HUD 和 popup 在 landscape 下可用。
6. 运行小范围 portrait smoke，确认原 MVP 路径未被破坏。
7. 上述检查通过后，再决定 landscape 数据应保持 runtime-only，还是生成 derivative files。

## 验收标准

只有下列必要检查全部通过时，LAND-01 才可视为功能验收完成。

Landscape stage loading：

- [x] `?orientation=landscape&stage=story_001` 可在 landscape 模式加载 Story 1。
- [x] `?orientation=landscape&stage=story_002` 可在 landscape 模式加载 Story 2。
- [x] `?orientation=landscape&stage=story_003` 可在 landscape 模式加载 Story 3。
- [x] 转换后的 Enter 和 Exit 坐标合法且可达。
- [x] 转换后 tile 计数与原 source stage 计数一致。

Landscape gameplay：

- [x] 玩家移动仍是四向且 screen-relative。
- [x] 碰撞停止行为与转换后的 grid 保持一致。
- [x] Dot、Coin、Star 收集会更新 HUD 计数器。
- [x] 有 Spikes 的关卡中，Spikes death 会触发失败弹窗。
- [x] 失败重开会重置当前 landscape stage。
- [x] 到达 Exit 会触发通关弹窗。
- [x] Story flow 保持 `story_001 -> story_002 -> story_003 -> story_001`。

Landscape view and UI：

- [x] tile size 在目标 landscape viewport 下仍可读。
- [x] camera follow 使用现有 portrait focus rule 并保持玩家居中。
- [x] HUD 计数器不遮挡已测试桌面与移动端 landscape play path。
- [x] 失败和通关 popup 按钮仍可点击或触控。
- [x] `?debugInput=1` 仍能启用 input logging。

Portrait regression：

- [x] 默认入口不带 `?orientation=landscape` 时，仍启动现有 portrait MVP 路径。
- [x] Story 1-3 的 portrait direct stage entries 仍可加载。
- [x] 原始 `stages/story_*.json` 文件没有被破坏性改写。

## 验证计划

最小验证应包括：

- 默认 portrait entry 的本地浏览器 smoke test。
- 每个 landscape direct stage entry 的本地浏览器 smoke test。
- 转换后 stage metadata 检查，覆盖 dimensions、Enter、Exit 和 tile counts。
- 可行时，每个 landscape Story 至少走一条通关路径。
- Story 2 或 Story 3 至少走一次 Spikes death 和 restart 路径。
- 检查浏览器 console 是否存在页面级脚本错误。

可选验证：

- Android landscape manual smoke test。
- 部署后 GitHub Pages landscape smoke test。
- portrait 与 transformed landscape 路线的并排截图 review。
- 横屏桌面和移动端 viewport size 下的 camera tuning review。

## 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 滑行迷宫旋转后拓扑不变但玩家感知变化 | 路线技术上有效，但可能变得不易读 | transform 后必须做人工 playability review |
| Fit-to-screen scaling 让 tile 太小 | 移动端横屏可能难以阅读或控制 | 使用最小 tile size 和 camera follow，不采用 full-map fit |
| HUD 覆盖关键 playfield 区域 | 玩家可能漏看 hazard、exit 或 collectible | 预留安全 playfield bounds，并在 landscape 下测试 popup |
| Landscape 工作误覆盖 MVP 基线 | 历史 QA 证据难以解释 | 保持原始 stage JSON 不变，并通过显式 switch 启用 landscape |
| PERF-01 被误表述 | 已跳过的性能范围可能被误解为新 PASS | 保持 PERF-01 为 `SKIPPED`；需要时另开性能任务 |

## 文档说明

- LAND-01 是新的冻结后适配实验。
- 它不改变 QA-01、QA-02、QA-03、REL-01 或 PERF-01 状态。
- 如果进入实现，应在代码改动前按当前项目流程更新执行计划或台账。
- 如果后续把该适配从实验提升为正式范围，应创建 closeout 文档并记录精确验证证据。

## 实现摘要

LAND-01 已在分支 `codex/landscape` 实现。

已实现行为：

- `?orientation=landscape` 启用 landscape adaptation mode。
- `StageLoader` 在 landscape mode 下对加载的 stage data 应用顺时针 90 度 runtime transform。
- 原始 `stages/story_001.json`、`stages/story_002.json` 和 `stages/story_003.json` 保持不变。
- `Renderer` 使用基于 viewport height 的 landscape-specific scale。
- Landscape camera 使用与 portrait 相同的 focus rule，让玩家保持居中。
- 输入保持 screen-relative，不做输入方向重映射。
- Landscape touch input 在斜向 delta 完全相等时采用水平优先；portrait 保持原有垂直优先。

实现期间已验证的转换后 stage 数据：

| Stage | Portrait Size | Landscape Size | Landscape Enter | Landscape Exit |
| --- | --- | --- | --- | --- |
| `story_001` | `17x30` | `30x17` | `(1, 12)` | `(28, 10)` |
| `story_002` | `21x22` | `22x21` | `(17, 11)` | `(1, 1)` |
| `story_003` | `24x17` | `17x24` | `(11, 4)` | `(15, 19)` |

已执行验证：

- 变更 runtime modules 通过 `node --check`。
- `git diff --check` 通过。
- Runtime stage rotation 已通过本地模块检查：转换后 metadata 合法，tile counts 与原 source data 一致。
- Headless Chrome 截图检查在 `1280x720` 下确认三个 landscape direct entries 的玩家中心约为 `(639.5, 359.5)`。
- 额外 movement screenshot check 确认 Story 1 移动后仍保持居中。
- 用户已完成桌面浏览器手动验收。
- 发布分支并使用 GitHub Pages 部署后，用户已完成移动端浏览器手动验收。

LAND-01 后的已知限制：

- LAND-01 不声明新的性能 PASS。
- LAND-01 不改变原 portrait route 的 MVP freeze candidate 状态。
- Landscape HUD 在本轮验证中可接受，但未来 polish 仍可优化 landscape safe-area spacing。
- 本轮接受 runtime rotation；但 TOOL-01 应提供可复现的 stage JSON translator script，以便需要静态 landscape JSON review/export 时从 portrait source data 生成派生文件。
- TOOL-01 的文档命名方向是：review/export derivative 使用 `story_001_landscape` 这类 suffix id；如果后续 landscape JSON 成为正式 runtime 数据集，则优先使用 `stages_landscape/story_001.json` 搭配 runtime id `story_001` 的目录式命名。
