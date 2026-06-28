# Landscape Stage Builder 技术说明

**状态**：第一版已实现，custom pipeline 扩展设计已确认
**最后更新**：2026-06-28
**文档层级**：L2 轻量技术说明
**计划覆盖文件**：`tools/landscape_stage_builder.html`
**关联文档**：`docs/features/tool01_landscape_stage_json_translator_card.md`、`docs/tech/convert_stage_json_landscape_tech.md`、`docs/tech/stage_tile_editor_tech.md`、`docs/tech/format_stage_json_tech.md`

## 1. 工具定位

`landscape_stage_builder.html` 是面向关卡制作流程的本地浏览器 GUI 工具，用于把 Stage Tile Editor 导出的 raw stage JSON 转成最终可下载的 landscape stage JSON。

它服务于 TOOL-01 之后的人工生产效率改进：

- 避免每次手动执行 `node tools/convert_stage_json_landscape.mjs <input.json> <output.json> [--id <stageId>]`。
- 让关卡作者可以在浏览器中选择或粘贴 raw JSON、确认 stage id、查看校验摘要并下载结果。
- 复用 TOOL-01 已确认的 portrait-to-landscape 顺时针 90 度转换规则。
- 保持 Stage Tile Editor、JSON normalization、landscape translation 和 StageLoader runtime load 的职责分离。

第一版工具是本地辅助工具，不是运行时功能，不参与游戏页面加载链路。

## 2. 明确边界

第一版必须遵守以下边界：

- 不修改 `StageLoader`。
- 不切换 runtime stage 加载路径。
- 不覆盖 `stages/story_001.json`、`stages/story_002.json`、`stages/story_003.json` 或其他 portrait Story JSON。
- 不改变 LAND-01 的 runtime clockwise 90 度 transform 结论。
- 不改变 REL-01 / MVP freeze candidate 结论。
- 不改写 `PERF-01 = SKIPPED`；性能专项仍不是已验收 PASS。
- 不把 `_landscape` 后缀默认写入正式 runtime stage id。
- 不承诺直接写入仓库目录；第一版仅提供下载模式。

如后续要增加 File System Access API 写入目录能力，必须作为独立增量设计确认，不应混入第一版。

## 3. 输入

第一版支持两种输入方式：

1. 选择本地 JSON 文件。
2. 粘贴完整 raw stage JSON 文本。

输入 JSON 主要来自 `tools/stage_tile_editor.html` 的“导出 JSON”结果。预期字段为：

```json
{
  "id": "story_004",
  "version": 1,
  "width": 24,
  "height": 17,
  "enter": { "x": 4, "z": 5 },
  "exit": { "x": 19, "z": 1 },
  "tiles": [],
  "meta": {
    "name": "Story 4",
    "stars_total": 3,
    "dots_total": 77,
    "coins_total": 3
  }
}
```

工具应把顶层 `id` 作为默认 stage id 来源。用户也必须能在界面中确认或编辑输出 stage id。

## 4. 输出

第一版输出两类下载内容：

### 4.1 必须输出：landscape stage JSON

点击“生成 landscape JSON”后，工具在页面内生成 landscape JSON 文本，并提供“下载 landscape JSON”按钮。

默认输出规则：

- 输出 JSON 顶层 `id` 使用用户确认的 stage id，例如 `story_004`。
- 不默认生成 `story_004_landscape`。
- 输出文件名建议为 `${stageId}.json`，例如 `story_004.json`。
- 输出 JSON 追加或覆盖 landscape 转译元数据：

```json
{
  "orientation": "landscape",
  "transform": "rotate90_clockwise",
  "sourceStageId": "story_004"
}
```

这里的 `id = story_004` 是面向未来正式 landscape runtime 数据集的稳定 id 策略；文件下载仍由用户手动保存到目标目录。

### 4.2 可选输出：normalized portrait JSON

第一版可以提供“下载 normalized portrait JSON”按钮，用于把输入 raw JSON 以项目标准可读格式下载。

该输出仅用于人工检查和中间产物留存：

- 顶层 `id` 保持输入或用户确认的 stage id。
- 不做旋转。
- 不写入仓库。
- 不替代 `tools/format_stage_json.mjs` 的 CLI 批处理职责。

如果实现成本需要收敛，该按钮可以后置，但文档和 UI 应保留清晰扩展位置。

## 5. 命名策略

第一版 GUI 默认采用“正式 runtime id 保持稳定”的命名策略：

```text
source/raw id:      story_004
output JSON id:    story_004
download filename: story_004.json
```

原因：

- 用户目标是从 Stage Tile Editor raw JSON 一键生成最终 landscape stage JSON，而不是生成 review/export derivative。
- 未来正式 landscape runtime 数据集应通过目录区分，例如 `stages_landscape/story_004.json`，不应让 `_landscape` 后缀进入 `GameState`、HUD、URL 参数或 QA 文档。
- 现有 CLI 已通过 `--id story_001` 支持正式 id 模式，GUI 应把这个模式作为默认工作流。

`story_004_landscape` 这类派生 id 仍可作为 CLI review/export 模式存在，但不作为本 GUI 第一版默认行为。

## 6. 转换规则

GUI 工具必须使用 TOOL-01 已验证的顺时针 90 度旋转规则：

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

输出 JSON 应基于输入 JSON 深拷贝后更新必要字段，避免改变输入文本在页面中的原始显示。

## 7. 字段处理规则

### 7.1 顶层字段

输出 landscape JSON 应保留输入中与关卡语义相关的顶层字段，并更新：

- `id`
- `width`
- `height`
- `enter`
- `exit`
- `tiles`
- `meta`

`id` 使用界面中确认的 stage id。若输入 id 为 `story_004` 且用户没有修改，则输出 id 仍为 `story_004`。

### 7.2 `meta`

输入已有 `meta` 字段时，输出应保留原有 `meta` 内容，并追加或覆盖：

```json
{
  "orientation": "landscape",
  "transform": "rotate90_clockwise",
  "sourceStageId": "story_004"
}
```

`sourceStageId` 使用输入 JSON 顶层 `id`；若输入缺少顶层 `id`，则使用用户确认的 stage id。

`meta.name` 可以保留 Stage Tile Editor 的派生展示名，例如 `Story 4`。GUI 第一版不负责重新设计展示名规则。

### 7.3 格式化

页面内生成的 JSON 应采用与现有工具一致的可读格式：

- 顶层字段多行缩进。
- `{ "x": 1, "z": 2 }` 坐标对象保持单行。
- `tiles` 保持一行一个 row。
- 文件末尾保留换行。

实现时可以在浏览器内复用 `format_stage_json.mjs` / `convert_stage_json_landscape.mjs` 的 `stringifyStage` 思路，但第一版不要求在浏览器中直接加载 Node 脚本。

## 8. 校验规则

GUI 在生成 landscape JSON 前必须执行输入校验。失败时不生成下载结果，并在页面中显示错误。

### 8.1 输入校验

必须校验：

- 输入文本是合法 JSON。
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
- 界面中的 stage id 非空。

### 8.2 输出校验

生成后必须校验：

- `output.width === input.height`。
- `output.height === input.width`。
- 输出 `tiles.length === output.height`。
- 输出每一行宽度等于 `output.width`。
- 输出 `enter` 和 `exit` 均在范围内。
- 输出 `enter` 指向 Enter(2)。
- 输出 `exit` 指向 Exit(3)。
- Enter、Exit、Dot、Coin、Star、Spikes 计数与输入一致。

任何输出校验失败都必须阻止下载，并显示错误。

### 8.3 计数范围

摘要和 count check 至少覆盖：

| Tile | Value |
| --- | --- |
| Enter | `2` |
| Exit | `3` |
| Dot | `4` |
| Coin | `5` |
| Star | `6` |
| Spikes | `7` |

Empty(0) 与 Wall(1) 可以展示在完整统计中，但不是 preservation check 的最低要求。

## 9. 校验摘要展示

生成成功后，页面必须展示便于人工核对的摘要。

至少包括：

- source id
- output id
- source size：`width x height`
- output size：`width x height`
- expected output size：`source.height x source.width`
- output rows
- output row widths
- source enter
- output enter
- source exit
- output exit
- Enter、Exit、Dot、Coin、Star、Spikes 的 source/output 计数
- count check：`PASS` 或 `FAIL`

推荐显示示例：

```text
source id: story_004
output id: story_004
source size: 24x17
output size: 17x24
expected output size: 17x24
output rows: 24
output row widths: 17
source enter: { "x": 4, "z": 5 }
output enter: { "x": 11, "z": 4 }
source exit: { "x": 19, "z": 1 }
output exit: { "x": 15, "z": 19 }
Enter(2): source=1 output=1
Exit(3): source=1 output=1
Dot(4): source=77 output=77
Coin(5): source=3 output=3
Star(6): source=3 output=3
Spikes(7): source=5 output=5
count check: PASS
```

如果存在 warning 或错误，必须清楚区分：

- error：阻止生成和下载。
- warning：允许生成，但需要用户注意。

第一版建议尽量把 shape、tile 值、enter/exit 指向错误都视为 error，而不是 warning。

## 10. UI 流程

第一版页面建议沿用 `tools/stage_tile_editor.html` 的本地工具风格：顶部操作栏、深色背景、右侧或下方信息区、textarea 显示 JSON 结果。

建议页面区域：

1. 输入区
   - 文件选择：选择 Stage Tile Editor 导出的 JSON 文件。
   - 粘贴区：粘贴 raw stage JSON。
   - “读取输入”或自动解析按钮。
2. Stage id 区
   - 显示从输入顶层 `id` 解析出的 id。
   - 允许用户编辑，例如 `story_004`。
   - 显示基础 id 校验结果：非空、建议 `story_###` 三位编号。
3. 操作区
   - “生成 landscape JSON”。
   - “下载 landscape JSON”。
   - 可选：“下载 normalized portrait JSON”。
   - 可选：“复制 landscape JSON”。
4. 摘要区
   - 展示第 9 节定义的校验摘要。
   - error 和 warning 分开展示。
5. 输出区
   - readonly textarea 显示 landscape JSON。
   - 可选 readonly textarea 或折叠区显示 normalized portrait JSON。

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

## 11. 下载模式

第一版只做浏览器下载，不直接写入仓库文件。

原因：

- 浏览器页面默认不能可靠写入仓库目录。
- 直接写入 `stages/` 或未来 `stages_landscape/` 会带来误覆盖风险。
- 当前需求是避免手敲 Node 命令，而不是自动提交或自动替换运行时数据。

下载行为：

- 使用 Blob + object URL 触发浏览器下载。
- landscape JSON 默认下载文件名为 `${stageId}.json`。
- normalized portrait JSON 可默认下载为 `${stageId}_portrait_normalized.json`。
- 下载按钮必须只在成功生成且校验通过后可用。

后续如要支持 File System Access API：

- 必须先让用户显式选择目录或文件。
- 必须显示即将写入的目标文件名。
- 必须提供覆盖确认。
- 必须仍保留下载模式作为 fallback。
- 该能力不属于第一版承诺。

## 12. 与现有工具的关系

### 12.1 与 Stage Tile Editor

`tools/stage_tile_editor.html` 仍是关卡编辑和 raw JSON 导出工具。

Landscape Stage Builder 不负责编辑 tile，不提供画布绘制，不保存 editor localStorage，也不替代 Review HTML 导出。

衔接方式：

```text
Stage Tile Editor 导出 JSON
  -> Landscape Stage Builder 读取 raw JSON
  -> 生成并下载 landscape JSON
```

### 12.2 与 format_stage_json.mjs

`tools/format_stage_json.mjs` 仍是 Node CLI 格式化与轻量检查工具。

Landscape Stage Builder 可以在浏览器内提供 normalized portrait JSON 下载，但这只是 GUI 便利能力，不替代 CLI 在批处理、脚本化和正式提交前检查中的角色。

### 12.3 与 convert_stage_json_landscape.mjs

`tools/convert_stage_json_landscape.mjs` 仍是权威 CLI 转译器和自动化验证入口。

Landscape Stage Builder 的转换公式、tile 类型表、校验口径和 JSON 格式化风格应与 CLI 保持一致。

差异：

| 项目 | CLI 转译器 | GUI Builder 第一版 |
| --- | --- | --- |
| 入口 | Node 命令 | 浏览器页面 |
| 输入 | 文件路径 | 文件选择或粘贴文本 |
| 输出 | 写入指定路径 | 浏览器下载 |
| 默认 id | `<sourceId>_landscape` | 用户确认的原 id，例如 `story_004` |
| 适合场景 | 批处理、回归验证、review/export derivative | 单关制作、人工确认、最终 landscape JSON 下载 |

GUI 的默认 id 与 CLI 默认 id 不同，是因为 GUI 本轮目标是生成最终 landscape stage JSON；CLI 的默认 derivative id 仍保留 review/export 语义。

### 12.4 与 StageLoader

第一版不修改 `StageLoader`。

当前 LAND-01 runtime 仍通过 StageLoader runtime clockwise 90 度 transform 支持横屏模式。静态 landscape JSON 是否进入正式 runtime 加载路径，必须作为后续独立 StageLoader migration 决策处理。

## 13. 实现建议

第一版建议保持单文件 HTML 工具：

```text
tools/landscape_stage_builder.html
```

建议复用的浏览器内函数职责：

- `parseStageJson(text)`：解析输入文本。
- `validateStageData(stageData, label)`：返回错误列表。
- `rotatePointClockwise(point, oldHeight)`：旋转坐标。
- `rotateStageDataClockwise(stageData, outputStageId)`：生成 landscape JSON object。
- `countTiles(stageData)`：统计 tile。
- `compareRequiredCounts(sourceCounts, outputCounts)`：检查关键 tile 计数。
- `stringifyStage(stageData)`：生成项目可读 JSON 文本。
- `downloadTextFile(filename, text, mimeType)`：触发下载。

实现时应避免从 Node ESM 脚本直接复制不可运行的 `fs` / `path` 逻辑到浏览器；只迁移纯数据处理逻辑。

## 14. 第一版验收清单

文档批准并实现 HTML 后，至少检查：

- [ ] 页面可以直接作为本地 HTML 打开。
- [ ] 可以粘贴 Stage Tile Editor 导出的 raw JSON。
- [ ] 可以通过文件选择读取 raw JSON。
- [ ] 输入顶层 `id` 会填充到 stage id 输入框。
- [ ] 用户可把 stage id 确认为 `story_004`。
- [ ] 点击“生成 landscape JSON”后，输出 JSON 顶层 `id` 为 `story_004`，不是 `story_004_landscape`。
- [ ] 输出尺寸满足 `newWidth = oldHeight`、`newHeight = oldWidth`。
- [ ] 输出 enter/exit 坐标满足顺时针 90 度公式。
- [ ] 输出 `tiles` 行数和行宽合法。
- [ ] Enter、Exit、Dot、Coin、Star、Spikes 计数与输入一致。
- [ ] 摘要显示 width/height、enter/exit、rows、row widths 和关键 tile 计数。
- [ ] 非法 JSON 会显示 error 且不允许下载。
- [ ] 缺少 Enter 或 Exit、坐标不匹配、row width 错误、未知 tile 值时不允许下载。
- [ ] “下载 landscape JSON”生成 `${stageId}.json`。
- [ ] 如实现 normalized portrait JSON 下载，则文件名为 `${stageId}_portrait_normalized.json` 或等价清晰命名。
- [ ] 工具不修改 `stages/`、`src/`、`StageLoader` 或现有 portrait Story JSON。

建议基础语法检查：

```powershell
node -e "const fs=require('fs'); const html=fs.readFileSync('tools/landscape_stage_builder.html','utf8'); const m=html.match(/<script>([\s\S]*)<\/script>/); if(!m) throw new Error('script block not found'); new Function(m[1]); console.log('script syntax ok');"
```

如后续使用浏览器自动化验收，应记录入口类型，例如本地浏览器或静态文件打开，避免 handoff 丢失验证环境。

## 15. 维护规则

后续修改 `tools/landscape_stage_builder.html` 时，应遵守：

1. 修改旋转公式前，必须同步 TOOL-01 功能卡和 CLI 转译器技术说明。
2. 修改默认 id 策略前，必须重新确认 GUI 是最终 landscape JSON 生成工具，还是 review/export derivative 工具。
3. 新增 tile 类型时，必须同步 GUI、CLI 转译器、formatter、StageLoader 校验和关卡格式文档。
4. 增加 File System Access API 写入能力前，必须单独确认写入目录、覆盖提示和 fallback 下载行为。
5. 不得把 GUI 下载结果自动视为已接入 runtime；runtime 接入仍需要 StageLoader migration 设计和验收。
6. 不得把 `PERF-01 = SKIPPED` 改写成性能通过。

## 16. Custom Pipeline 扩展设计

在保留默认正式 landscape 输出流程的基础上，工具支持额外的 custom/variant transform 下载流程，用于少量需要人工调整变换方案的关卡。

### 16.1 默认正式流程不变

“生成 landscape JSON”仍然是正式生产路径：

- 固定执行顺时针 90 度转换。
- 输出文件名仍为 `${stageId}.json`。
- metadata 仍为 `orientation: "landscape"`、`transform: "rotate90_clockwise"`、`sourceStageId`。
- 默认正式输出不写入 `transforms` 数组，避免污染第一版正式格式。

默认正式流程可视为内部固定 pipeline：

```json
[
  { "type": "rotate", "degrees": 90 }
]
```

### 16.2 custom/variant 输出

custom 输出由用户在界面中添加一个或多个 transform step 后生成。它默认是人工实验下载，不自动写入仓库，也不自动覆盖正式 `stages_landscape/story_###.json`。

custom 输出规则：

- 点击“生成 variant JSON”后，工具按当前 step 队列顺序执行 transform pipeline。
- 输出顶层 `id` 仍使用用户确认的 stage id，例如 `story_004`。
- 下载文件名默认为 `${stageId}_custom_transform.json`，例如 `story_004_custom_transform.json`，避免误覆盖正式 JSON。
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

### 16.3 支持的 transform step

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

### 16.4 UI 行为

custom UI 采用“添加步骤队列”方式：

- 每个 transform 按钮向当前 pipeline 追加一个 step。
- 页面显示当前 pipeline 的中文 step 列表。
- “撤销上一步”只删除最后一个 custom step。
- “清空步骤”只清空 custom pipeline。
- “生成 variant JSON”必须要求至少存在一个 step。
- custom pipeline 的编辑不影响默认“生成 landscape JSON”正式流程。

### 16.5 custom 校验与摘要

custom 输出必须复用输入校验、输出 shape 校验、Enter/Exit 指向校验和关键 tile 计数校验。

custom 输出额外校验：

- 每个 step 必须属于本节定义的操作。
- 输出尺寸必须等于 pipeline 逐步计算后的尺寸。
- `meta.transforms` 必须与 UI 队列顺序一致。
- 摘要必须显示 transform mode、pipeline step、source/output size、expected output size、enter/exit 和关键 tile 计数。

### 16.6 实现建议

为避免重复逻辑，默认正式流程和 custom 流程应复用同一套 pipeline 函数：

- `applyTransformStepToPoint(point, width, height, step)`：按单个 step 转换坐标。
- `getTransformStepDimensions(width, height, step)`：计算单个 step 后的尺寸。
- `transformStageData(stageData, outputStageId, steps, options)`：执行默认或 custom pipeline。

`rotateStageDataClockwise()` 可以作为默认正式流程的薄封装继续存在，内部调用统一 pipeline。

### 16.7 扩展验收项

除第一版验收清单外，custom pipeline 扩展还应检查：

- [ ] 添加 custom transform step 后，当前 pipeline 列表显示中文步骤。
- [ ] “撤销上一步”和“清空步骤”只影响 custom pipeline，不影响默认正式输出。
- [ ] 点击“生成 variant JSON”后，输出 metadata 为 `orientation: "landscape"`、`transform: "custom_pipeline"`，并包含 `transforms` 数组。
- [ ] custom 输出文件名为 `${stageId}_custom_transform.json`。
- [ ] rotate -90°、rotate 180°、左右翻转、上下翻转、中心对称均能保持 Enter、Exit、Dot、Coin、Star、Spikes 计数一致。
- [ ] custom pipeline 输出摘要显示 transform mode、pipeline step、实际尺寸和期望尺寸。

## 17. 变更记录

| 日期 | 变更类型 | 内容 | 影响范围 |
| --- | --- | --- | --- |
| 2026-06-28 | 扩展 | 确认 Landscape Stage Builder custom transform pipeline 设计，补充多步变换、metadata、UI 队列、下载命名、正式化规则和验收项。 | `docs/tech/landscape_stage_builder_tech.md`、后续 `tools/landscape_stage_builder.html` |
| 2026-06-25 | 新增 | 建立 Landscape Stage Builder GUI 工具实现前技术说明，明确下载模式、正式 id 默认策略、转换校验规则、UI 流程和与现有工具边界。 | 后续 `tools/landscape_stage_builder.html` 实现基线 |
