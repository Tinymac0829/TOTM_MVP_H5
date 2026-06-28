# TOOL-01 功能卡：横版 Stage JSON 转译器

**文档类型**：L1 功能卡 / 支持工具规划卡
**任务 ID**：TOOL-01
**创建日期**：2026-06-25
**状态**：DONE
**基线**：LAND-01 横屏 MVP 适配收口
**范围类型**：冻结后支持工具

## 背景

LAND-01 已证明现有 Story 1-3 MVP 可以通过 runtime 顺时针 90 度关卡变换在横屏模式下运行。该实现刻意保留原有 portrait stage JSON，不把已验证的竖屏关卡数据改写为横版数据。

TOOL-01 提供一条可复现的工具链路径，用于在需要静态 landscape stage JSON 时生成可检查、可导出的横版 JSON，或为未来正式横屏 runtime 数据集预留生产链路。

本任务不能通过手工复制、旋转或改写关卡数据完成；转译器必须基于 portrait authoring JSON、使用明确记录的变换规则生成 landscape JSON，并输出可核对的校验摘要。

## 目标

建立一个可复现的 portrait-to-landscape stage JSON 转译器脚本。

工具应支持：

- 读取已有 portrait stage JSON 文件。
- 应用与 LAND-01 runtime 旋转一致的顺时针 90 度变换。
- 写出单独的 landscape 派生 JSON 文件。
- 保持 Enter、Exit、Dot、Coin、Star、Spikes 计数一致。
- 输出清晰的校验摘要，覆盖尺寸、row width、Enter、Exit 和关键 tile 计数。
- 同时支持短期 review/export derivative 和未来正式 landscape stage-data pipeline。

## 非目标

TOOL-01 不包含：

- 替换当前 runtime `StageLoader` 路径。
- 把产品默认模式从 portrait 切换为 landscape。
- 覆盖 `stages/story_001.json`、`stages/story_002.json` 或 `stages/story_003.json`。
- 改变 LAND-01 验证结论。
- 改变 REL-01 或 portrait MVP freeze candidate 结论。
- 改写 `PERF-01 = SKIPPED`。
- 重新设计 Stage Tile Editor UI。
- 新增 tile 类型、关卡或玩法机制。

## 职责边界

本功能卡是 TOOL-01 的任务级决策与验收文档，负责记录“为什么做、做什么、不做什么、命名策略、验收口径和风险边界”。

具体 CLI 脚本行为以 `docs/tech/landscape_stage_json_toolchain_tech.md` 和 `tools/convert_stage_json_landscape.mjs` 为准，包括 CLI 参数、控制台输出、错误处理、字段写出细节和本地验收记录。

GUI 工具设计同样以 `docs/tech/landscape_stage_json_toolchain_tech.md` 为准。GUI 第一版默认使用用户确认的正式 stage id，例如 `story_004`，并通过浏览器下载输出；这不改变 CLI review/export 默认 `_landscape` 派生 id 的语义。旧 CLI / GUI 技术说明路径仅保留兼容跳转。

维护规则：

- 如果变更 TOOL-01 的任务范围、默认命名决策、StageLoader 边界或验收标准，应先更新本功能卡。
- 如果变更 CLI 实现细节、参数、输出格式或本地验证记录，应更新 `landscape_stage_json_toolchain_tech.md` 的 CLI 章节。
- 如果变更浏览器 GUI 的输入输出、UI 流程、下载行为或 custom pipeline，应更新 `landscape_stage_json_toolchain_tech.md` 的 Browser Builder / Custom Pipeline 章节。

## 生产流水线位置

TOOL-01 是未来 landscape stage 数据生产链路中的一个环节：

```text
Stage Tile Editor export
  -> stage JSON normalization
  -> portrait-to-landscape translation
  -> official runtime stage JSON
  -> StageLoader load
```

Stage Tile Editor 仍然是 authoring 工具，应继续保留源关卡身份，例如 `story_001`、`story_002` 和 `story_003`。

当前规范化工具是 `tools/format_stage_json.mjs`。它当前名称偏 format，但实际职责已经接近 normalization + lightweight inspection。未来可以按项目需要重命名为 `normalize_stage_json.mjs`，但 TOOL-01 不要求在本任务内做这个重命名。

转译器负责决定 landscape 输出的 stage id 和输出路径。

## 命名策略

TOOL-01 至少需要清晰保留两种命名模式。

### Review/export derivative 模式

这是 TOOL-01 CLI 首版默认模式。

推荐输出：

```text
input:  stages/story_001.json
output: tmp or review/export path
id:     story_001_landscape
```

生成 JSON 应包含来源元数据：

```json
{
  "orientation": "landscape",
  "transform": "rotate90_clockwise",
  "sourceStageId": "story_001"
}
```

该模式让派生文件身份保持显式，避免与当前已验证的 portrait runtime JSON 混淆。

### 未来正式 landscape runtime 模式

如果 MVP 后续正式升级为 landscape-first 或 landscape-only，最干净的 runtime 命名策略应使用目录表达数据集，而不是把 `_landscape` 后缀写入正式 stage id。

推荐未来输出：

```text
input:  stages_source/story_001.json
output: stages_landscape/story_001.json
id:     story_001
```

该模式下，`story_001` 仍是正式 runtime stage id，目录负责表达这个文件属于 landscape stage-data set。

这样可以避免 `_landscape` 泄漏到 `GameState`、HUD 显示、URL 参数、Story 编号、QA 文档和后续内容生产链路。

## 转换规则

TOOL-01 必须使用 LAND-01 已接受的顺时针 90 度旋转：

```text
newWidth = oldHeight
newHeight = oldWidth
newX = oldHeight - 1 - oldZ
newZ = oldX
```

转换范围：

- `width` 和 `height`。
- `enter`。
- `exit`。
- `tiles` 中的每一个 tile 坐标。
- 所有 tile 值保持不变，只移动到转换后的网格位置。

## CLI 契约

首版实现目标：

```powershell
node tools/convert_stage_json_landscape.mjs <input.json> <output.json> [--id <stageId>]
```

默认行为：

- 读取 `<input.json>`。
- 默认输出 id 为 `<sourceId>_landscape`。
- 写入 `<output.json>`。
- 必要时创建输出目录。
- 打印校验摘要。
- 输入结构非法或转译输出未通过必要检查时，以非零退出码结束。

可选 `--id <stageId>`：

- 覆盖输出 JSON 顶层 `id`。
- 支持未来正式 landscape 输出，例如 `stages_landscape/story_001.json` 搭配 id `story_001`。
- 不得静默覆盖源 portrait 文件。

## 校验要求

脚本应校验或报告：

- 输入 `width` 和 `height` 为正整数。
- 输入 `tiles` 行数等于 `height`。
- 输入每一行 tile 宽度等于 `width`。
- 输入 `enter` 和 `exit` 在范围内。
- 输入 `enter` 指向 Enter tile。
- 输入 `exit` 指向 Exit tile。
- 输出 `width = input.height`。
- 输出 `height = input.width`。
- 输出 `tiles` 行数和行宽匹配输出尺寸。
- 输出 `enter` 和 `exit` 在范围内。
- 输出 `enter` 指向 Enter tile。
- 输出 `exit` 指向 Exit tile。
- Enter、Exit、Dot、Coin、Star、Spikes 计数在 source 和 output 之间保持一致。

摘要应便于与 LAND-01 的 Story 1-3 证据对照。

## Story 1-3 预期转换证据

现有源数据转换后应匹配 LAND-01 runtime 证据：

| Stage | Portrait Size | Landscape Size | Landscape Enter | Landscape Exit |
| --- | --- | --- | --- | --- |
| `story_001` | `17x30` | `30x17` | `(1, 12)` | `(28, 10)` |
| `story_002` | `21x22` | `22x21` | `(17, 11)` | `(1, 1)` |
| `story_003` | `24x17` | `17x24` | `(11, 4)` | `(15, 19)` |

Dot、Coin、Star、Spikes、Enter 和 Exit 计数必须保持不变。

## StageLoader 后续迁移说明

TOOL-01 首版不修改 StageLoader。

如果项目后续把静态 landscape JSON 提升为正式 runtime 路径，推荐的 StageLoader 迁移方向是：

- runtime stage id 继续保持 `story_001`、`story_002` 和 `story_003`。
- 从 `stages_landscape` 这类 landscape stage 目录加载。
- 对正式 landscape stage-data set 禁用 LAND-01 runtime rotation 路径。
- 如有需要，保留单独 legacy 或 source 路径存放 portrait authoring 文件。

这样可以保持 stage identity 稳定，把 orientation 选择放在数据集选择层，而不是靠 id 后缀解析。

## 验收标准

TOOL-01 进入代码实现前需满足：

- [x] 本功能卡已批准。
- [x] 转译器 CLI 契约已确认。
- [x] 默认 derivative id 策略已确认。
- [x] 未来正式 landscape 目录策略已确认。
- [x] 相关规划和技术文档已更新。

TOOL-01 功能完成条件：

- [x] 转译器脚本存在于 `tools/`。
- [x] 脚本通过 `node --check`。
- [x] Story 1-3 可从源 JSON 转成 landscape derivative JSON，不需要手工改数据。
- [x] 转换后尺寸与 Enter/Exit 匹配 LAND-01 证据。
- [x] Enter、Exit、Dot、Coin、Star、Spikes 计数与源数据一致。
- [x] 源 portrait stage JSON 文件保持不变。
- [x] 轻量技术说明已记录 CLI 用法、命名策略、warning/error 边界和校验输出。

## 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 派生 id 被误当成正式 id | `_landscape` 后缀泄漏到 runtime、文档和 URL 契约 | suffix id 仅用于 review/export；未来正式 runtime 使用目录表达数据集 |
| 转译输出覆盖源 portrait 文件 | 历史 MVP 基线变得模糊 | 要求显式输出路径，并记录源 `stages/story_*.json` 不应作为输出目标 |
| normalization 与 translation 职责混淆 | 后续生产链路难维护 | 保持 editor export、normalization、translation 和 runtime loading 分层 |
| runtime rotation 与静态 rotated JSON 同时生效 | 可能出现双重旋转或验证不匹配 | 后续 StageLoader migration 必须为给定模式明确选择 runtime rotation 或预旋转数据 |
| PERF-01 被 landscape 工作误解 | 已跳过的性能范围可能被误写成 PASS | 保持 `PERF-01 = SKIPPED`；需要时另开性能任务 |

## 文档说明

- TOOL-01 是支持可复现 stage-data transformation 的工具任务。
- LAND-01 已关闭，当前仍使用 runtime rotation。
- 原 Story 1-3 portrait JSON 当前仍是保留的源基线。
- 后续如果要正式推广 landscape 数据，应先作为独立范围决策处理，再修改 StageLoader 默认加载策略。
