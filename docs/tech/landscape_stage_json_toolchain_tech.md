# Landscape Stage JSON Toolchain 技术说明

**状态**：已合并 CLI 与 GUI 技术说明
**最后更新**：2026-06-28
**文档层级**：L2 工具链技术说明
**覆盖文件**：`tools/convert_stage_json_landscape.mjs`、`tools/landscape_stage_builder.html`
**关联文档**：`docs/features/tool01_landscape_stage_json_translator_card.md`、`docs/tech/stage_tile_editor_tech.md`、`docs/tech/format_stage_json_tech.md`、`docs/tech/land02_static_landscape_stage_runtime_card.md`

## 1. 工具链定位

Landscape Stage JSON toolchain 用于把 portrait authoring stage JSON 可复现地转换成 landscape stage JSON，并支持两类入口：

- CLI 转译器：`tools/convert_stage_json_landscape.mjs`。
- 浏览器 GUI Builder：`tools/landscape_stage_builder.html`。

两者共享同一套核心转换公式、tile 类型口径、Enter/Exit 校验和关键 tile 计数校验，但服务的生产场景不同：

| 项目 | CLI 转译器 | Browser Builder |
| --- | --- | --- |
| 入口 | Node 命令 | 本地浏览器 HTML |
| 输入 | 文件路径 | 文件选择或粘贴文本 |
| 输出 | 写入指定输出路径 | 浏览器下载 |
| 默认 id | `<sourceId>_landscape` | 用户确认的原 id，例如 `story_004` |
| 正式 id 支持 | 通过 `--id story_###` | 默认就是用户确认的正式 id |
| 适合场景 | 批处理、回归验证、review/export derivative、正式数据批量生成 | 单关制作、人工确认、最终 landscape JSON 下载、custom variant 下载 |

TOOL-01 的任务级目标、范围边界、命名决策和验收口径以 `docs/features/tool01_landscape_stage_json_translator_card.md` 为准。本文档只记录 landscape stage JSON 工具链的具体技术行为。

## 2. 职责边界

本工具链必须遵守以下边界：

- 不修改 `StageLoader`。
- 不切换 runtime stage 加载路径。
- 不覆盖 `stages/story_001.json`、`stages/story_002.json`、`stages/story_003.json` 或其他 portrait Story JSON。
- 不改变 LAND-01 的 runtime clockwise 90 度 transform 结论。
- 不改变 REL-01 / MVP freeze candidate 结论。
- 不改写 `PERF-01 = SKIPPED`；性能专项仍不是已验收 PASS。
- 不把 `_landscape` 后缀默认写入正式 runtime stage id。
- Browser Builder 第一版仅提供下载模式，不直接写入仓库目录。

如后续要增加 File System Access API 写入目录能力，必须作为独立增量设计确认，并保留下载模式 fallback。

## 3. 流水线位置

推荐生产链路：

```text
Stage Tile Editor raw stage JSON
  -> format_stage_json.mjs / normalized portrait JSON
  -> convert_stage_json_landscape.mjs 或 landscape_stage_builder.html
  -> stages_landscape/story_###.json
  -> StageLoader load
```

`tools/format_stage_json.mjs` 负责规范化与轻量检查；landscape toolchain 负责 portrait-to-landscape 转换。两者应保持职责分离。

## 4. 共享转换规则

默认正式 landscape 转换使用 LAND-01 已验收的顺时针 90 度旋转规则：

```text
newWidth = oldHeight
newHeight = oldWidth
newX = oldHeight - 1 - oldZ
newZ = oldX
```

转换范围：

- `width`
- `height`
- `enter`
- `exit`
- `tiles` 中每个 tile 的坐标位置

Tile 数值本身保持不变。

示例：

```text
portrait point:  { x: oldX, z: oldZ }
landscape point: { x: oldHeight - 1 - oldZ, z: oldX }
```

输出 JSON 应基于输入 JSON 深拷贝后更新必要字段，避免改变输入文本或输入文件的原始数据。

## 5. 共享字段与 metadata 规则

输出 landscape JSON 应保留输入中与关卡语义相关的顶层字段，并更新：

- `id`
- `width`
- `height`
- `enter`
- `exit`
- `tiles`
- `meta`

默认正式 landscape metadata：

```json
{
  "orientation": "landscape",
  "transform": "rotate90_clockwise",
  "sourceStageId": "story_004"
}
```

`sourceStageId` 使用输入 JSON 顶层 `id`；若输入缺少顶层 `id`，则使用用户确认或命令行指定的 output id。

输入已有 `meta` 字段时，输出应保留原有 `meta` 内容，并追加或覆盖上述转换 metadata。

`meta.name` 可以保留 Stage Tile Editor 的派生展示名，例如 `Story 4`。工具链不负责重新设计展示名规则。

## 6. 共享校验规则

工具链在生成或写出 landscape JSON 前必须校验输入。失败时不得产出可用结果。

输入校验：

- 输入文本或文件是合法 JSON。
- JSON 顶层是 object。
- `width` 是正整数。
- `height` 是正整数。
- `tiles` 是数组。
- `tiles.length === height`。
- 每一行 tile 是数组。
- 每一行 tile 宽度等于 `width`。
- tile 值属于当前已知范围 `0` 到 `7`。
- `enter` 是范围内整数坐标。
- `exit` 是范围内整数坐标。
- `enter` 指向 Enter(2)。
- `exit` 指向 Exit(3)。
- 输出 stage id 非空。

默认正式输出校验：

- `output.width === input.height`。
- `output.height === input.width`。
- 输出 `tiles.length === output.height`。
- 输出每一行宽度等于 `output.width`。
- 输出 `enter` 和 `exit` 均在范围内。
- 输出 `enter` 指向 Enter(2)。
- 输出 `exit` 指向 Exit(3)。
- Enter、Exit、Dot、Coin、Star、Spikes 计数与输入一致。

关键 tile 计数至少覆盖：

| Tile | Value |
| --- | --- |
| Enter | `2` |
| Exit | `3` |
| Dot | `4` |
| Coin | `5` |
| Star | `6` |
| Spikes | `7` |

Empty(0) 与 Wall(1) 可以展示在完整统计中，但不是 preservation check 的最低要求。

## 7. CLI 转译器

### 7.1 基本契约

CLI 文件：

```text
tools/convert_stage_json_landscape.mjs
```

命令格式：

```powershell
node tools/convert_stage_json_landscape.mjs <input.json> <output.json> [--id <stageId>]
```

规则：

- 第一个参数是输入 portrait stage JSON。
- 第二个参数是输出 landscape stage JSON。
- 缺少参数时输出 usage，并以退出码 `1` 结束。
- `--id <stageId>` 可覆盖输出 JSON 顶层 `id`。
- 输出路径不能与输入路径相同；相同时脚本会在写入前失败。
- 成功写出后输出摘要。

### 7.2 CLI 命名策略

CLI 默认模式用于派生文件 review/export。

示例：

```powershell
node tools/convert_stage_json_landscape.mjs stages/story_001.json tmp/tool01_landscape/story_001_landscape.json
```

输出 id 默认由源 id 加 `_landscape` 后缀：

```text
source id: story_001
output id: story_001_landscape
```

如果用于正式 landscape runtime 数据集，应显式传入 `--id story_###`：

```powershell
node tools/convert_stage_json_landscape.mjs stages/story_001.json stages_landscape/story_001.json --id story_001
```

正式模式的语义：

- 输出 id 保持 `story_001`。
- 文件路径表达横屏数据集：`stages_landscape/story_001.json`。
- Runtime 不需要引入 `story_001_landscape` 这类新 stage id。

### 7.3 CLI 控制台摘要

成功写出后，CLI 摘要至少包含：

- 输出路径
- 输入路径
- source id
- output id
- source size
- output size
- expected output size
- source enter / output enter
- source exit / output exit
- Enter、Exit、Dot、Coin、Star、Spikes 输入输出计数

### 7.4 CLI 验收记录

2026-06-25 TOOL-01 本地验证记录：

- [x] `node --check tools/convert_stage_json_landscape.mjs` 通过。
- [x] 缺少参数时输出 usage，并以退出码 `1` 结束。
- [x] 输出路径等于输入路径时，在写入前失败。
- [x] `--id story_001` 可生成 output id 为 `story_001` 的正式命名模式测试文件。
- [x] Story 1-3 转换结果尺寸、Enter/Exit 坐标、关键 tile 计数均符合预期。

Story 1-3 验证摘要：

| Source | Output Path | `--id` | Output ID | Result |
| --- | --- | --- | --- | --- |
| `stages/story_001.json` | `tmp/tool01_landscape/story_001_landscape.json` | none | `story_001_landscape` | PASS |
| `stages/story_002.json` | `tmp/tool01_landscape/story_002_landscape.json` | none | `story_002_landscape` | PASS |
| `stages/story_003.json` | `tmp/tool01_landscape/story_003_landscape.json` | none | `story_003_landscape` | PASS |

## 8. Browser Builder

### 8.1 基本契约

GUI 文件：

```text
tools/landscape_stage_builder.html
```

Browser Builder 是面向关卡制作流程的本地浏览器 GUI 工具，用于把 Stage Tile Editor 导出的 raw stage JSON 转成最终可下载的 landscape stage JSON。

第一版支持两种输入方式：

1. 选择本地 JSON 文件。
2. 粘贴完整 raw stage JSON 文本。

工具应把输入顶层 `id` 作为默认 stage id 来源。用户也必须能在界面中确认或编辑输出 stage id。

### 8.2 GUI 输出

GUI 默认输出 landscape stage JSON：

- 点击“生成 landscape JSON”后，工具在页面内生成 landscape JSON 文本。
- “下载 landscape JSON”默认文件名为 `${stageId}.json`。
- 输出 JSON 顶层 `id` 使用用户确认的 stage id，例如 `story_004`。
- 不默认生成 `story_004_landscape`。
- 下载仍由用户手动保存到目标目录。

GUI 可选输出 normalized portrait JSON：

- 文件名为 `${stageId}_portrait_normalized.json`。
- 不做旋转。
- 不写入仓库。
- 不替代 `tools/format_stage_json.mjs` 的 CLI 批处理职责。

GUI 第一版默认采用“正式 runtime id 保持稳定”的命名策略：

```text
source/raw id:      story_004
output JSON id:    story_004
download filename: story_004.json
```

原因：

- 用户目标是从 Stage Tile Editor raw JSON 一键生成最终 landscape stage JSON，而不是生成 review/export derivative。
- 正式 landscape runtime 数据集通过目录区分，例如 `stages_landscape/story_004.json`，不应让 `_landscape` 后缀进入 `GameState`、HUD、URL 参数或 QA 文档。
- CLI 已通过 `--id story_001` 支持正式 id 模式，GUI 把这个模式作为默认工作流。

### 8.3 GUI UI 流程

推荐主流程：

```text
选择或粘贴 raw JSON
  -> 解析输入并填充 stage id
  -> 用户确认 stage id
  -> 点击“生成 landscape JSON”
  -> 页面执行输入校验、旋转、输出校验
  -> 展示摘要和 JSON
  -> 用户下载 landscape JSON
```

失败流程：

```text
输入非法或校验失败
  -> 不生成输出 JSON
  -> 禁用下载按钮
  -> 显示具体错误列表
```

GUI 摘要至少包括：

- source id
- output id
- transform mode
- source size / output size / expected output size
- output rows / output row widths
- source enter / output enter
- source exit / output exit
- Enter、Exit、Dot、Coin、Star、Spikes 的 source/output 计数
- count check：`PASS` 或 `FAIL`

### 8.4 GUI 下载模式

第一版只做浏览器下载，不直接写入仓库文件。

原因：

- 浏览器页面默认不能可靠写入仓库目录。
- 直接写入 `stages/` 或 `stages_landscape/` 会带来误覆盖风险。
- 当前需求是避免手敲 Node 命令，而不是自动提交或自动替换运行时数据。

下载行为：

- 使用 Blob + object URL 触发浏览器下载。
- landscape JSON 默认下载文件名为 `${stageId}.json`。
- normalized portrait JSON 默认下载为 `${stageId}_portrait_normalized.json`。
- 下载按钮必须只在成功生成且校验通过后可用。

如后续支持 File System Access API：

- 必须先让用户显式选择目录或文件。
- 必须显示即将写入的目标文件名。
- 必须提供覆盖确认。
- 必须仍保留下载模式作为 fallback。

### 8.5 GUI 第一版验收项

- [x] 页面可以直接作为本地 HTML 打开。
- [x] 可以粘贴 Stage Tile Editor 导出的 raw JSON。
- [x] 可以通过文件选择读取 raw JSON。
- [x] 输入顶层 `id` 会填充到 stage id 输入框。
- [x] 用户可把 stage id 确认为 `story_004`。
- [x] 点击“生成 landscape JSON”后，输出 JSON 顶层 `id` 为 `story_004`，不是 `story_004_landscape`。
- [x] 输出尺寸满足 `newWidth = oldHeight`、`newHeight = oldWidth`。
- [x] 输出 enter/exit 坐标满足顺时针 90 度公式。
- [x] 输出 `tiles` 行数和行宽合法。
- [x] Enter、Exit、Dot、Coin、Star、Spikes 计数与输入一致。
- [x] 非法 JSON 会显示 error 且不允许下载。
- [x] 缺少 Enter 或 Exit、坐标不匹配、row width 错误、未知 tile 值时不允许下载。
- [x] “下载 landscape JSON”生成 `${stageId}.json`。
- [x] normalized portrait JSON 下载文件名为 `${stageId}_portrait_normalized.json`。
- [x] 工具不修改 `stages/`、`src/`、`StageLoader` 或现有 portrait Story JSON。

## 9. Custom Pipeline 扩展

在保留默认正式 landscape 输出流程的基础上，Browser Builder 支持额外的 custom/variant transform 下载流程，用于少量需要人工调整变换方案的关卡。

### 9.1 默认正式流程不变

“生成 landscape JSON”仍然是正式生产路径：

- 固定执行顺时针 90 度转换。
- 输出文件名仍为 `${stageId}.json`。
- metadata 仍为 `orientation: "landscape"`、`transform: "rotate90_clockwise"`、`sourceStageId`。
- 默认正式输出不写入 `transforms` 数组，避免污染正式格式。

默认正式流程可视为内部固定 pipeline：

```json
[
  { "type": "rotate", "degrees": 90 }
]
```

### 9.2 custom/variant 输出

custom 输出由用户在界面中添加一个或多个 transform step 后生成。它默认是人工实验下载，不自动写入仓库，也不自动覆盖正式 `stages_landscape/story_###.json`。

custom 输出规则：

- 点击“生成 variant JSON”后，工具按当前 step 队列顺序执行 transform pipeline。
- 输出顶层 `id` 仍使用用户确认的 stage id，例如 `story_004`。
- 下载文件名默认为 `${stageId}_custom_transform.json`，例如 `story_004_custom_transform.json`。
- 输出 metadata 必须记录实际 pipeline：

```json
{
  "orientation": "landscape",
  "transform": "custom_pipeline",
  "sourceStageId": "story_004",
  "transforms": [
    { "type": "rotate", "degrees": 90 },
    { "type": "mirror", "direction": "left_right" },
    { "type": "rotate", "degrees": -90 }
  ]
}
```

若后续人工确认 custom 结果可作为正式 landscape 配置使用，可以把同一份 JSON 另存为 `stages_landscape/story_###.json`。正式使用时可以保留 `transform: "custom_pipeline"` 和 `transforms`，不应伪装成 `rotate90_clockwise`。

### 9.3 支持的 transform step

UI 标签必须优先使用“左右翻转 / 上下翻转”等中文，避免把内部坐标轴暴露为容易误解的 X/Y 轴选项。

| UI 标签 | Metadata | 尺寸变化 | 坐标规则 |
| --- | --- | --- | --- |
| rotate +90° | `{ "type": "rotate", "degrees": 90 }` | `newWidth = oldHeight`, `newHeight = oldWidth` | `newX = oldHeight - 1 - oldZ`, `newZ = oldX` |
| rotate -90° | `{ "type": "rotate", "degrees": -90 }` | `newWidth = oldHeight`, `newHeight = oldWidth` | `newX = oldZ`, `newZ = oldWidth - 1 - oldX` |
| rotate 180° | `{ "type": "rotate", "degrees": 180 }` | `newWidth = oldWidth`, `newHeight = oldHeight` | `newX = oldWidth - 1 - oldX`, `newZ = oldHeight - 1 - oldZ` |
| 左右翻转 | `{ "type": "mirror", "direction": "left_right" }` | 尺寸不变 | `newX = oldWidth - 1 - oldX`, `newZ = oldZ` |
| 上下翻转 | `{ "type": "mirror", "direction": "up_down" }` | 尺寸不变 | `newX = oldX`, `newZ = oldHeight - 1 - oldZ` |
| 中心对称 | `{ "type": "center_symmetry" }` | 尺寸不变 | `newX = oldWidth - 1 - oldX`, `newZ = oldHeight - 1 - oldZ` |

`rotate 180°` 与“中心对称”当前坐标效果相同，但 metadata 保留用户选择的语义，便于回溯关卡作者意图。

### 9.4 custom 校验与验收

custom 输出必须复用输入校验、输出 shape 校验、Enter/Exit 指向校验和关键 tile 计数校验。

custom 输出额外校验：

- 至少包含一个 transform step。
- 每个 step 必须属于本节定义的操作。
- 输出尺寸必须等于 pipeline 逐步计算后的尺寸。
- `meta.transforms` 必须与 UI 队列顺序一致。
- 摘要必须显示 transform mode、pipeline step、source/output size、expected output size、enter/exit 和关键 tile 计数。

已验证项：

- [x] 添加 custom transform step 后，当前 pipeline 列表显示中文步骤。
- [x] “撤销上一步”和“清空步骤”只影响 custom pipeline，不影响默认正式输出。
- [x] 点击“生成 variant JSON”后，输出 metadata 为 `orientation: "landscape"`、`transform: "custom_pipeline"`，并包含 `transforms` 数组。
- [x] custom 输出文件名为 `${stageId}_custom_transform.json`。
- [x] rotate -90°、rotate 180°、左右翻转、上下翻转、中心对称均能保持 Enter、Exit、Dot、Coin、Star、Spikes 计数一致。
- [x] custom pipeline 输出摘要显示 transform mode、pipeline step、实际尺寸和期望尺寸。

## 10. 与现有工具和 runtime 的关系

### 10.1 与 Stage Tile Editor

`tools/stage_tile_editor.html` 仍是关卡编辑和 raw JSON 导出工具。

Landscape toolchain 不负责编辑 tile，不提供画布绘制，不保存 editor localStorage，也不替代 Review HTML 导出。

衔接方式：

```text
Stage Tile Editor 导出 JSON
  -> Landscape toolchain 读取 raw JSON
  -> 生成 landscape JSON
```

### 10.2 与 format_stage_json.mjs

`tools/format_stage_json.mjs` 仍是 Node CLI 格式化与轻量检查工具。

Browser Builder 可以提供 normalized portrait JSON 下载，但这只是 GUI 便利能力，不替代 CLI 在批处理、脚本化和正式提交前检查中的角色。

### 10.3 与 StageLoader

本工具链不修改 `StageLoader`。

LAND-02 已 formalize runtime split：

- portrait 加载 `stages/story_*.json`。
- landscape 加载 `stages_landscape/story_*.json`。
- `StageLoader` 不再对正式静态 landscape JSON 二次旋转。

GUI 下载结果不自动视为已接入 runtime。正式接入仍需要人工保存到 `stages_landscape/story_###.json` 并执行对应验收。

## 11. 实现建议

共享纯数据处理函数应保持 CLI 和 GUI 行为一致：

- 旋转/transform 坐标公式。
- tile 类型表。
- 输入 shape 校验。
- Enter/Exit 指向校验。
- 关键 tile 计数校验。
- JSON 格式化风格。

Browser Builder 保持单文件 HTML 工具：

```text
tools/landscape_stage_builder.html
```

CLI 保持 Node 脚本入口：

```text
tools/convert_stage_json_landscape.mjs
```

GUI 不应直接加载 Node ESM 脚本中的 `fs` / `path` 逻辑；只迁移或复用纯数据处理思路。

## 12. 维护规则

1. 修改默认顺时针 90 度公式前，必须同步 CLI、GUI、TOOL-01 功能卡和正式 landscape stage 数据。
2. 修改默认 id 策略前，必须重新确认目标是 review/export derivative 还是正式 runtime stage JSON。
3. CLI 默认 `<sourceId>_landscape` 与 GUI 默认正式 id 是刻意区分，不得误合并。
4. 新增 tile 类型时，必须同步 CLI、GUI、formatter、StageLoader 校验和关卡格式文档。
5. 增加 File System Access API 写入能力前，必须单独确认写入目录、覆盖提示和 fallback 下载行为。
6. 不得把 GUI 下载结果自动视为已接入 runtime；正式接入仍需要保存到 `stages_landscape/` 并验收。
7. custom pipeline 若晋升为正式数据，应保留 `custom_pipeline` metadata，不应伪装成默认 `rotate90_clockwise`。
8. 不得把 `PERF-01 = SKIPPED` 改写成性能通过。

## 13. 旧文档兼容说明

以下旧路径保留为兼容跳转说明，不再作为主要维护入口：

- `docs/tech/convert_stage_json_landscape_tech.md`
- `docs/tech/landscape_stage_builder_tech.md`

后续 landscape stage JSON toolchain 的技术变更应优先更新本文档。

## 14. 变更记录

| 日期 | 变更类型 | 内容 | 影响范围 |
| --- | --- | --- | --- |
| 2026-06-28 | 合并 | 合并 CLI 转译器和 Browser Builder 技术说明，建立 landscape stage JSON toolchain 单一维护入口，并保留旧文档兼容跳转。 | `docs/tech/landscape_stage_json_toolchain_tech.md`、旧 CLI/GUI 技术说明 |
| 2026-06-28 | 扩展 | 记录 Browser Builder custom transform pipeline，多步变换、metadata、UI 队列、下载命名、正式化规则和验收项。 | `tools/landscape_stage_builder.html` |
| 2026-06-25 | 新增 | 建立 portrait-to-landscape stage JSON 转译工具链，覆盖 CLI 转译器和 Browser Builder 第一版下载流程。 | TOOL-01 支持工具链 |