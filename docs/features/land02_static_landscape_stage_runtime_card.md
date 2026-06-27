# LAND-02 功能卡：静态横屏 Stage JSON Runtime 加载

**文档类型**：L1 功能卡 / runtime 迁移卡
**任务 ID**：LAND-02
**创建日期**：2026-06-26
**状态**：DONE
**基线**：LAND-01 横屏 MVP 适配、TOOL-01 横版 Stage JSON 工具链
**范围类型**：冻结后横屏正式化增量

## 背景

LAND-01 已证明 Story 1-3 可以通过 `?orientation=landscape` 在横屏模式下游玩。当前实现仍由 `StageLoader` 加载 portrait `stages/story_*.json`，再在 runtime 对 stage data 应用顺时针 90 度旋转。

TOOL-01 已提供可复现的 portrait-to-landscape stage JSON 生产工具链。CLI 支持通过 `--id story_001` 生成正式 runtime id 不变的横版 JSON；GUI 第一版支持人工生成并下载保持正式 id 的 landscape JSON。

LAND-02 的目标是把横屏 runtime 从“加载 portrait JSON 后 runtime rotate”推进为“按 orientation 选择静态 stage JSON 数据集加载”，避免正式横屏数据与 runtime rotation 同时生效导致双重旋转。

## 目标

建立静态横屏 stage JSON runtime 加载路径：

- portrait 默认路径继续加载 `stages/story_001.json`、`stages/story_002.json`、`stages/story_003.json`。
- landscape 模式加载 `stages_landscape/story_001.json`、`stages_landscape/story_002.json`、`stages_landscape/story_003.json`。
- landscape JSON 顶层 `id` 仍保持 `story_001`、`story_002`、`story_003`。
- runtime stage id、URL 参数、HUD、`GameState` 顺序不引入 `story_001_landscape` 这类派生 id。
- `StageLoader` 在加载正式 landscape stage-data set 时不再执行 runtime rotate。
- `Renderer`、`InputManager`、`TouchInput` 的 landscape 行为继续保留。

## 非目标

LAND-02 不包含：

- 覆盖或改写 `stages/story_001.json`、`stages/story_002.json`、`stages/story_003.json`。
- 把 portrait 默认入口切换为 landscape。
- 扩展 TOOL-01 GUI 或新增 File System Access API 写目录能力。
- 新增 Story 4、tile 类型、玩法机制、HUD 重设计或 DebugPanel。
- 改写 REL-01 / MVP freeze candidate 结论。
- 把 `PERF-01 = SKIPPED` 改写为 PASS。

## Runtime 数据集策略

portrait 与 landscape 使用目录区分数据集，而不是使用不同 runtime id：

```text
portrait:
  stages/story_001.json        id: story_001
  stages/story_002.json        id: story_002
  stages/story_003.json        id: story_003

landscape:
  stages_landscape/story_001.json    id: story_001
  stages_landscape/story_002.json    id: story_002
  stages_landscape/story_003.json    id: story_003
```

这样可以保持 stage identity 稳定，让 orientation 选择停留在数据集路径层，而不是泄漏到 `GameState`、HUD、URL 参数、Story 编号和 QA 文档。

## URL 行为

portrait 路径保持默认：

```text
/
index.html
?stage=story_001
?stage=story_002
?stage=story_003
```

以上入口继续从 `stages/story_*.json` 加载。

landscape 路径：

```text
?orientation=landscape
?orientation=landscape&stage=story_001
?orientation=landscape&stage=story_002
?orientation=landscape&stage=story_003
```

以上入口从 `stages_landscape/story_*.json` 加载。

如果请求未接入的 stage id，仍沿用现有 fallback 行为回到 Story 1，不因 orientation 引入新的 id 解析规则。

## StageLoader 迁移要求

`StageLoader` 仍负责：

- 根据 stage id fetch JSON。
- 校验 stage JSON。
- 缓存原始已加载 JSON。
- 返回深拷贝用于 runtime 初始化。
- 统计收集物。

LAND-02 后，正式 landscape runtime 不应再依赖 `StageLoader.prepareStageData()` 对 landscape 数据进行 runtime rotate。

推荐实现方向：

- `main.js` 根据 `orientationMode` 选择 `stageBasePath`：
  - portrait：`stages`
  - landscape：`stages_landscape`
- `StageLoader` 保留 `orientation` 参数给日志或未来兼容使用，但不在 `orientation === "landscape"` 时自动旋转正式 runtime 数据。
- 如保留 `rotateStageDataClockwise()` export 作为测试或 legacy helper，应确保正式 `load()` 路径不会调用它。
- 缓存 key 仍可使用 `stageId`，因为每个 `StageLoader` 实例只绑定一个 `stageBasePath`。

## 静态 JSON 生成要求

新增的 `stages_landscape/story_*.json` 必须由 TOOL-01 CLI 或等价已记录转换逻辑生成，不允许手工复制、手工旋转或覆盖 portrait JSON。

推荐命令：

```powershell
node tools/convert_stage_json_landscape.mjs stages/story_001.json stages_landscape/story_001.json --id story_001
node tools/convert_stage_json_landscape.mjs stages/story_002.json stages_landscape/story_002.json --id story_002
node tools/convert_stage_json_landscape.mjs stages/story_003.json stages_landscape/story_003.json --id story_003
```

生成结果应保留或写入：

```json
{
  "orientation": "landscape",
  "transform": "rotate90_clockwise",
  "sourceStageId": "story_001"
}
```

`meta` 字段仅作为来源和生产链路说明，不作为 `StageLoader` 启用二次旋转的触发条件。

## 预期转换证据

LAND-02 静态 JSON 应与 LAND-01 runtime rotation 证据一致：

| Stage | Portrait Size | Landscape Size | Landscape Enter | Landscape Exit |
| --- | --- | --- | --- | --- |
| `story_001` | `17x30` | `30x17` | `(1, 12)` | `(28, 10)` |
| `story_002` | `21x22` | `22x21` | `(17, 11)` | `(1, 1)` |
| `story_003` | `24x17` | `17x24` | `(11, 4)` | `(15, 19)` |

Enter、Exit、Dot、Coin、Star、Spikes 计数必须与 portrait source 保持一致。

## 保留的 Landscape 行为

LAND-02 只迁移 stage data 加载方式，不撤销 LAND-01 的横屏交互适配：

- `Renderer` 继续使用 landscape-specific tile scale。
- camera 继续使用 focus target 规则，让玩家保持居中。
- 输入保持 screen-relative。
- `TouchInput` 在 landscape 下继续使用横向优先的轴向平局判定。
- HUD、失败弹窗、通关弹窗、下一关流程继续沿用现有行为。

## 验收标准

LAND-02 完成应满足：

- [x] `stages_landscape/story_001.json` 存在，顶层 `id` 为 `story_001`。
- [x] `stages_landscape/story_002.json` 存在，顶层 `id` 为 `story_002`。
- [x] `stages_landscape/story_003.json` 存在，顶层 `id` 为 `story_003`。
- [x] portrait 默认入口继续加载 `stages/story_*.json`。
- [x] landscape 入口加载 `stages_landscape/story_*.json`。
- [x] landscape runtime 不再对静态 landscape JSON 执行二次 rotate。
- [x] `GameState` 顺序保持 `story_001 -> story_002 -> story_003 -> story_001`。
- [x] `Renderer` / `InputManager` / `TouchInput` 的 landscape 行为保留。
- [x] 原 portrait Story JSON 未被覆盖或改写。
- [x] `PERF-01` 仍为 `SKIPPED`。
- [x] MVP freeze candidate 结论不因本任务改写。

## 验证计划

最小验证：

1. 使用 TOOL-01 CLI 生成 Story 1-3 的 `stages_landscape/story_*.json`，并确认输出 id、尺寸、Enter/Exit、关键 tile 计数。
2. 对 runtime modules 执行 `node --check`。
3. 对新增 JSON 和改动代码执行轻量结构检查。
4. 本地浏览器或 headless browser 验证：
   - portrait 默认入口加载 Story 1 portrait size。
   - `?stage=story_002` 加载 Story 2 portrait size。
   - `?orientation=landscape&stage=story_001` 加载 Story 1 landscape size。
   - `?orientation=landscape&stage=story_002` 加载 Story 2 landscape size。
   - `?orientation=landscape&stage=story_003` 加载 Story 3 landscape size。
5. 检查 console 中的 `StageLoader` 日志，确认 landscape 模式下加载尺寸是静态 JSON 尺寸，而不是二次旋转后的尺寸。

可选验证：

- Story 1 landscape 走一条移动路径并截图确认玩家居中。
- Story 2 或 Story 3 验证 Spikes death 与 restart。
- Story 3 通关后确认下一关回到 Story 1。


## 实现摘要

LAND-02 已完成静态 landscape stage-data set 和 runtime 加载迁移。

已实现行为：

- 新增 `stages_landscape/story_001.json`、`stages_landscape/story_002.json`、`stages_landscape/story_003.json`。
- 三个 landscape JSON 顶层 `id` 分别保持 `story_001`、`story_002`、`story_003`。
- `src/main.js` 根据 `orientationMode` 选择 `stageBasePath`：portrait 使用 `stages`，landscape 使用 `stages_landscape`。
- `src/StageLoader.js` 正式加载路径不再在 landscape 模式下 runtime rotate stage data。
- `Renderer`、`InputManager`、`TouchInput` 和 `GameState` 的 landscape 行为与 Story 顺序保持不变。
- 原 `stages/story_001.json`、`stages/story_002.json`、`stages/story_003.json` 未被改写。

已执行验证：

- `node --check src/StageLoader.js` PASS。
- `node --check src/main.js` PASS。
- `node --check tools/convert_stage_json_landscape.mjs` PASS。
- `git diff --check` PASS。
- TOOL-01 CLI 生成 Story 1-3 landscape JSON，尺寸、Enter/Exit、Enter/Exit/Dot/Coin/Star/Spikes 计数均 PASS。
- 数据验证确认三份 `stages_landscape/story_*.json` id、尺寸、Enter/Exit、meta 和关键 tile 计数均符合预期。
- Node fake-fetch runtime 验证确认 portrait 三关请求 `stages/story_*.json` 并保持 portrait 尺寸。
- Node fake-fetch runtime 验证确认 landscape 三关请求 `stages_landscape/story_*.json` 并保持 landscape 尺寸，没有二次旋转。

未执行验证：

- 本轮未执行浏览器级页面验证；当前项目内未安装 Playwright，且本机命令探测未发现可直接调用的 `msedge`、`chrome`、`chromium` 或 `firefox`。
## 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| runtime rotation 与静态 landscape JSON 同时生效 | 出现双重旋转，尺寸和路径异常 | LAND-02 明确让正式 landscape runtime 只选择预旋转数据，不再二次 rotate |
| `_landscape` id 泄漏到 runtime | `GameState`、HUD、URL 和 QA 文档出现双 id 契约 | 目录表达数据集，runtime id 保持 `story_001` 等正式 id |
| 误覆盖 portrait JSON | 破坏 freeze candidate 基线和历史 QA 证据 | 生成输出只写入 `stages_landscape/`，不写入 `stages/` |
| 工具输出被误认为自动接入 runtime | 文档与实际加载路径不一致 | 本任务同时更新 runtime 加载路径并验证 URL 行为 |
| PERF-01 状态被误表述 | 已跳过性能范围被误写为通过 | 全文保持 `PERF-01 = SKIPPED` |

## 变更记录

| 日期 | 变更类型 | 内容 | 影响范围 |
| --- | --- | --- | --- |
| 2026-06-26 | 新增 | 建立 LAND-02 静态横屏 stage JSON runtime 加载设计，明确目录式数据集、正式 id、StageLoader 禁止双重旋转、生成要求和验收计划。 | 后续 `stages_landscape/` 数据与 runtime 加载迁移 |
| 2026-06-26 | 收口 | 新增静态 landscape Story 1-3 JSON，并迁移 runtime 加载路径；portrait 继续加载 `stages/`，landscape 加载 `stages_landscape/`，正式 id 不变且无二次旋转。 | LAND-02 完成 |
